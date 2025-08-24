document.addEventListener('DOMContentLoaded', () => {
    // --- START FIREBASE SETUP ---
    const firebaseConfig = {
      apiKey: "AIzaSyAl55bFL__bGedFYLXFDHGt47tDi90WRpY",
      authDomain: "comedy-set-manager.firebaseapp.com",
      projectId: "comedy-set-manager",
      storageBucket: "comedy-set-manager.firebasestorage.app",
      messagingSenderId: "404723429589",
      appId: "1:404723429589:web:b33169169b1401f47d325c"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    // --- END FIREBASE SETUP ---

    // --- YOUR GOOGLE APPS SCRIPT URL ---
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxA6rI40DkfWndq1ESNLXJA6dlVSlW_2nJtgOC1BX0LLGXFZf_PWf1DSPM2UtBlLMMb/exec';

    const modal = document.getElementById('setlist-studio-modal');
    const modalTitle = document.getElementById('studio-modal-title');
    const setlistTitleInput = document.getElementById('studio-setlist-title');
    const availableBitsContainer = document.getElementById('available-bits-container');
    const currentSetlistContainer = document.getElementById('current-setlist-container');
    const saveSetlistBtn = document.getElementById('save-setlist-btn');
    const createNewSetBtn = document.getElementById('create-new-set-btn');
    const setlistsContainer = document.getElementById('setlists-container');
    
    let currentUser = null;
    let allBits = [];
    let allSetlists = [];
    let currentlyEditingSetId = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadData(user.uid);
        } else {
            window.location.href = 'signin.html';
        }
    });

    function loadData(userId) {
        db.collection('users').doc(userId).collection('sets').onSnapshot(snapshot => {
            allBits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
        db.collection('users').doc(userId).collection('setlists').orderBy('title').onSnapshot(snapshot => {
            allSetlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSetlists();
        });
    }
    
    function renderSetlists() {
        setlistsContainer.innerHTML = '';
        allSetlists.forEach(setlist => {
            const totalLength = (setlist.bits || []).reduce((sum, bit) => sum + (bit.length || 0), 0);
            const el = document.createElement('article');
            el.innerHTML = `
                <div class="grid">
                    <div>
                        <h5>${setlist.title}</h5>
                        <p>Total Length: ${totalLength} min | Bits: ${(setlist.bits || []).length}</p>
                    </div>
                    <div style="text-align: right;">
                        <button class="export-docs-btn secondary" data-id="${setlist.id}">Export</button>
                        <button class="edit-setlist-btn" data-id="${setlist.id}">Edit</button>
                        <button class="delete-setlist-btn secondary outline" data-id="${setlist.id}">Delete</button>
                    </div>
                </div>
            `;
            setlistsContainer.appendChild(el);
        });
    }

    function openStudio(setlist = null) {
        currentlyEditingSetId = setlist ? setlist.id : null;
        modalTitle.textContent = setlist ? 'Edit Setlist' : 'Create Setlist';
        setlistTitleInput.value = setlist ? setlist.title : '';
        currentSetlistContainer.innerHTML = '';
        if (setlist && setlist.bits) {
            setlist.bits.forEach(bit => {
                currentSetlistContainer.appendChild(createStudioBitElement(bit));
            });
        }
        availableBitsContainer.innerHTML = '';
        const currentBitIds = (setlist && setlist.bits) ? setlist.bits.map(b => b.id) : [];
        allBits.filter(bit => !currentBitIds.includes(bit.id)).forEach(bit => {
            availableBitsContainer.appendChild(createStudioBitElement(bit));
        });
        modal.setAttribute('open', true);
    }
    
    function createStudioBitElement(bit) {
        const el = document.createElement('div');
        el.className = 'studio-bit';
        el.setAttribute('draggable', true);
        el.dataset.bitId = bit.id;
        const transcriptHTML = bit.transcription ? `<button class="toggle-transcript-btn">(show transcript)</button><div class="studio-bit-transcript d-none">${bit.transcription}</div>` : '';
        el.innerHTML = `<div><span class="drag-handle">☰</span><strong>${bit.title}</strong> (${bit.length} min) ${transcriptHTML}</div>`;
        return el;
    }

    createNewSetBtn.addEventListener('click', () => openStudio());

    setlistsContainer.addEventListener('click', e => {
        const target = e.target;
        if (target.classList.contains('export-docs-btn')) {
            const setlist = allSetlists.find(s => s.id === target.dataset.id);
            exportToGoogleDocs(setlist, target);
        }
        if (target.classList.contains('edit-setlist-btn')) {
            const setlist = allSetlists.find(s => s.id === target.dataset.id);
            openStudio(setlist);
        }
        if (target.classList.contains('delete-setlist-btn')) {
            if (confirm('Are you sure you want to delete this setlist?')) {
                db.collection('users').doc(currentUser.uid).collection('setlists').doc(target.dataset.id).delete();
            }
        }
    });

    let draggedElement = null;
    document.addEventListener('dragstart', e => {
        if (e.target.classList.contains('studio-bit')) {
            draggedElement = e.target;
            setTimeout(() => e.target.style.opacity = '0.5', 0);
        }
    });
    document.addEventListener('dragend', () => {
        if (draggedElement) {
            draggedElement.style.opacity = '1';
            draggedElement = null;
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        }
    });
    [availableBitsContainer, currentSetlistContainer].forEach(container => {
        container.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientY);
            container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            if (afterElement) afterElement.classList.add('drag-over');
        });
        container.addEventListener('drop', e => {
            e.preventDefault();
            if (draggedElement) {
                const afterElement = getDragAfterElement(container, e.clientY);
                container.insertBefore(draggedElement, afterElement);
            }
        });
    });
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.studio-bit:not([style*="opacity: 0.5"])')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset: offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    modal.addEventListener('click', e => {
        if (e.target.classList.contains('close')) modal.removeAttribute('open');
        if (e.target.classList.contains('toggle-transcript-btn')) {
            const transcriptDiv = e.target.parentElement.querySelector('.studio-bit-transcript');
            if (transcriptDiv) {
                const isHidden = transcriptDiv.classList.toggle('d-none');
                e.target.textContent = isHidden ? '(show transcript)' : '(hide transcript)';
            }
        }
    });

    saveSetlistBtn.addEventListener('click', () => {
        const title = setlistTitleInput.value.trim();
        if (!title) {
            alert('Please give your setlist a title.');
            return;
        }
        const bitElements = currentSetlistContainer.querySelectorAll('.studio-bit');
        const bitsInSet = Array.from(bitElements).map(el => {
            return allBits.find(b => b.id === el.dataset.bitId);
        }).filter(Boolean);
        const setlistData = { title: title, bits: bitsInSet };
        const userSetlists = db.collection('users').doc(currentUser.uid).collection('setlists');
        if (currentlyEditingSetId) {
            userSetlists.doc(currentlyEditingSetId).update(setlistData);
        } else {
            userSetlists.add(setlistData);
        }
        modal.removeAttribute('open');
    });

    function exportToGoogleDocs(setlist, buttonElement) {
        if (GOOGLE_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
            alert('Please paste your Google Apps Script URL into the sets.js file.');
            return;
        }
        let content = `${setlist.title}\n`;
        content += `Total Length: ${(setlist.bits || []).reduce((sum, bit) => sum + (bit.length || 0), 0)} minutes\n`;
        content += '--------------------\n\n';
        (setlist.bits || []).forEach(bit => {
            content += `BIT: ${bit.title} (${bit.length} min)\n`;
            content += `TAGS: ${(bit.tags || []).join(', ')}\n\n`;
            content += `${bit.transcription || 'N/A'}\n\n`;
            content += '--------------------\n\n';
        });

        const originalButtonText = buttonElement.textContent;
        buttonElement.textContent = 'Exporting...';
        buttonElement.setAttribute('aria-busy', 'true');

        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ title: setlist.title, content: content }),
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                alert(`Successfully created Google Doc! You can find it in your Google Drive.`);
                window.open(data.url, '_blank');
            } else {
                alert('An error occurred. Check the console for details.');
                console.error(data.message);
            }
        })
        .catch(error => {
            alert('A network error occurred. Check the console for details.');
            console.error(error);
        })
        .finally(() => {
            buttonElement.textContent = originalButtonText;
            buttonElement.removeAttribute('aria-busy');
        });
    }
});
