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

    const uploadInput = document.getElementById('upload-performance-file');
    const gigHistoryContainer = document.getElementById('gig-history-container');
    const linkBitsModal = document.getElementById('linkBitsModal');
    const availableBitsContainer = document.getElementById('modal-available-bits');
    const setlistBitsContainer = document.getElementById('modal-setlist-bits');
    const savePerformanceBtn = document.getElementById('save-performance-btn');

    let currentUser = null;
    let allUserBits = [];
    let parsedPerformanceData = {};

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadInitialData(user.uid);
        } else {
            window.location.href = 'signin.html';
        }
    });

    function loadInitialData(userId) {
        db.collection('users').doc(userId).collection('sets').orderBy('title').onSnapshot(snapshot => {
            allUserBits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
        db.collection('users').doc(userId).collection('gigs').orderBy('recordedDate', 'desc').onSnapshot(snapshot => {
            renderGigHistory(snapshot.docs);
        });
    }
    
    uploadInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => openLinkingModal(event.target.result);
        reader.readAsText(file);
    });

    function openLinkingModal(transcript) {
        try {
            parsedPerformanceData = {};
            const lines = transcript.split('\n');
            parsedPerformanceData.recordedDate = new Date(lines.find(l => l.startsWith('Recorded:')).split(': ')[1].trim());
            parsedPerformanceData.venue = lines[0].trim();
            parsedPerformanceData.stats = {
                lpm: lines.find(l => l.startsWith('Laughs per Minute:')).split(': ')[1].trim(),
                lspm: lines.find(l => l.startsWith('Laugh Seconds per Minute:')).split(': ')[1].trim(),
                totalDuration: lines.find(l => l.startsWith('Total Duration:')).split(': ')[1].trim(),
            };
            parsedPerformanceData.fullTranscript = transcript;

            availableBitsContainer.innerHTML = allUserBits.map(bit => `
                <div class="available-bit-item">
                    <input type="checkbox" data-bit-id="${bit.id}" id="check-${bit.id}">
                    <label for="check-${bit.id}">${bit.title}</label>
                </div>
            `).join('');
            setlistBitsContainer.innerHTML = '';
            linkBitsModal.setAttribute('open', true);
        } catch (error) {
            alert("Could not parse file. Ensure it is a valid performance report.");
            console.error("File parsing error:", error);
        }
    }
    
    availableBitsContainer.addEventListener('change', e => {
        if (e.target.type === 'checkbox') {
            const bitId = e.target.dataset.bitId;
            if (e.target.checked) {
                const bit = allUserBits.find(b => b.id === bitId);
                const bitElement = createDraggableBitElement(bit);
                setlistBitsContainer.appendChild(bitElement);
            } else {
                const bitElement = setlistBitsContainer.querySelector(`[data-bit-id="${bitId}"]`);
                if (bitElement) bitElement.remove();
            }
        }
    });
    
    function createDraggableBitElement(bit) {
        const el = document.createElement('div');
        el.className = 'studio-bit';
        el.setAttribute('draggable', true);
        el.dataset.bitId = bit.id;
        el.innerHTML = `<div><span class="drag-handle">☰</span><strong>${bit.title}</strong></div>`;
        return el;
    }

    savePerformanceBtn.addEventListener('click', () => {
        if (!currentUser || !parsedPerformanceData) return;
        const orderedBitElements = setlistBitsContainer.querySelectorAll('.studio-bit');
        const orderedBits = Array.from(orderedBitElements).map(el => {
            return allUserBits.find(b => b.id === el.dataset.bitId);
        });
        const performanceToSave = { ...parsedPerformanceData, linkedBits: orderedBits, createdAt: new Date() };

        db.collection('users').doc(currentUser.uid).collection('gigs').add(performanceToSave)
            .then(() => {
                linkBitsModal.removeAttribute('open');
                uploadInput.value = '';
                alert('Performance saved successfully!');
            });
    });

    function renderGigHistory(gigDocs) {
        if (gigDocs.length === 0) {
            gigHistoryContainer.innerHTML = '<article><p>No gigs logged yet.</p></article>';
            return;
        }
        gigHistoryContainer.innerHTML = gigDocs.map(doc => {
            const gig = doc.data();
            const gigDate = gig.recordedDate ? gig.recordedDate.toDate().toLocaleDateString() : 'Date not available';
            const setlist = (gig.linkedBits || []).map(bit => `<li>${bit.title}</li>`).join('');
            
            let statsHTML = '';
            if (gig.stats) {
                statsHTML = `
                    <div class="grid">
                        <span><strong>Laughs/Min:</strong> ${gig.stats.lpm}</span>
                        <span><strong>Laugh Secs/Min:</strong> ${gig.stats.lspm}</span>
                        <span><strong>Duration:</strong> ${gig.stats.totalDuration}</span>
                    </div>
                `;
            }

            let transcriptHTML = '';
            if (gig.fullTranscript) {
                transcriptHTML = `
                    <button class="toggle-transcript-btn secondary outline">Show Transcript</button>
                    <div class="full-transcript-container d-none">
                        <p style="white-space: pre-wrap;">${gig.fullTranscript}</p>
                    </div>
                `;
            }

            return `
                <article>
                    <div class="grid">
                        <h6>${gig.venue} on ${gigDate}</h6>
                        <button class="delete-gig-btn" data-id="${doc.id}" style="text-align: right;">Delete</button>
                    </div>
                    ${statsHTML}
                    <h6>Setlist Performed:</h6>
                    <ul>${setlist || '<li>No setlist linked.</li>'}</ul>
                    ${transcriptHTML}
                </article>
            `;
        }).join('');
    }
    
    gigHistoryContainer.addEventListener('click', e => {
        if (e.target.classList.contains('delete-gig-btn')) {
            if (confirm('Are you sure you want to delete this gig history?')) {
                db.collection('users').doc(currentUser.uid).collection('gigs').doc(e.target.dataset.id).delete();
            }
        }
        if (e.target.classList.contains('toggle-transcript-btn')) {
            const article = e.target.closest('article');
            const transcriptContainer = article.querySelector('.full-transcript-container');
            const isHidden = transcriptContainer.classList.toggle('d-none');
            e.target.textContent = isHidden ? 'Show Transcript' : 'Hide Transcript';
        }
    });

    linkBitsModal.addEventListener('click', e => {
        if (e.target.classList.contains('close')) {
            linkBitsModal.removeAttribute('open');
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
    setlistBitsContainer.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(setlistBitsContainer, e.clientY);
        setlistBitsContainer.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (afterElement) afterElement.classList.add('drag-over');
    });
    setlistBitsContainer.addEventListener('drop', e => {
        e.preventDefault();
        if (draggedElement) {
            const afterElement = getDragAfterElement(setlistBitsContainer, e.clientY);
            setlistBitsContainer.insertBefore(draggedElement, afterElement);
        }
    });
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.studio-bit:not([style*="opacity: 0.5"])')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset: offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
});
