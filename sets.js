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

    // Modal elements
    const modal = document.getElementById('setlist-studio-modal');
    const modalTitle = document.getElementById('studio-modal-title');
    const setlistTitleInput = document.getElementById('studio-setlist-title');
    const availableBitsContainer = document.getElementById('available-bits-container');
    const currentSetlistContainer = document.getElementById('current-setlist-container');
    const saveSetlistBtn = document.getElementById('save-setlist-btn');
    const createNewSetBtn = document.getElementById('create-new-set-btn'); // Corrected variable name
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
        db.collection('users').doc(userId).collection('setlists').onSnapshot(snapshot => {
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
            availableBitsContainer.appendChild(createStudioBitElement(bit, true));
        });

        modal.setAttribute('open', true);
    }
    
    function createStudioBitElement(bit) {
        const el = document.createElement('div');
        el.className = 'studio-bit';
        el.setAttribute('draggable', true);
        el.dataset.bitId = bit.id;
        
        const transcriptHTML = bit.transcription ? `
            <button class="toggle-transcript-btn">(show transcript)</button>
            <div class="studio-bit-transcript d-none">${bit.transcription}</div>
        ` : '';

        el.innerHTML = `<p><strong>${bit.title}</strong> (${bit.length} min) ${transcriptHTML}</p>`;
        return el;
    }

    // --- THIS IS THE MISSING EVENT LISTENER ---
    createNewSetBtn.addEventListener('click', () => openStudio());
    // --- END OF FIX ---

    setlistsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('edit-setlist-btn')) {
            const setlist = allSetlists.find(s => s.id === e.target.dataset.id);
            openStudio(setlist);
        }
        if (e.target.classList.contains('delete-setlist-btn')) {
            if (confirm('Are you sure you want to delete this setlist?')) {
                db.collection('users').doc(currentUser.uid).collection('setlists').doc(e.target.dataset.id).delete();
            }
        }
    });

    // Drag and Drop Logic
    let draggedBitId = null;
    document.addEventListener('dragstart', e => {
        if (e.target.classList.contains('studio-bit')) {
            draggedBitId = e.target.dataset.bitId;
        }
    });

    currentSetlistContainer.addEventListener('dragover', e => e.preventDefault());
    currentSetlistContainer.addEventListener('drop', e => {
        e.preventDefault();
        const draggedEl = document.querySelector(`[data-bit-id="${draggedBitId}"]`);
        if (draggedBitId && draggedEl && !e.target.closest('#current-setlist-container').querySelector(`[data-bit-id="${draggedBitId}"]`)) {
            currentSetlistContainer.appendChild(draggedEl);
        }
        draggedBitId = null;
    });
    
    modal.addEventListener('click', e => {
        if (e.target.classList.contains('close')) modal.removeAttribute('open');
        if (e.target.classList.contains('toggle-transcript-btn')) {
            const transcriptDiv = e.target.nextElementSibling;
            const isHidden = transcriptDiv.classList.toggle('d-none');
            e.target.textContent = isHidden ? '(show transcript)' : '(hide transcript)';
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
        });

        const setlistData = { title: title, bits: bitsInSet };
        const userSetlists = db.collection('users').doc(currentUser.uid).collection('setlists');

        if (currentlyEditingSetId) {
            userSetlists.doc(currentlyEditingSetId).update(setlistData);
        } else {
            userSetlists.add(setlistData);
        }
        modal.removeAttribute('open');
    });
});
