document.addEventListener('DOMContentLoaded', () => {
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

    const addSetlistForm = document.getElementById('add-setlist-form');
    const setlistsContainer = document.getElementById('setlists-container');
    const arrangeModalTitle = document.getElementById('arrangeModalTitle');
    const arrangeContainer = document.getElementById('arrange-container');
    const saveOrderBtn = document.getElementById('save-order-btn');
    
    let currentUser = null;
    let allBits = [];
    let allSetlists = [];

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadData(user.uid);
        } else {
            window.location.href = 'signin.html';
        }
    });

    function loadData(userId) {
        db.collection('users').doc(userId).collection('sets').orderBy('title').onSnapshot(snapshot => {
            allBits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSetlists();
        });
        db.collection('users').doc(userId).collection('setlists').orderBy('title').onSnapshot(snapshot => {
            allSetlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSetlists();
        });
    }

    addSetlistForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('setlist-title').value;
        if (title && currentUser) {
            db.collection('users').doc(currentUser.uid).collection('setlists').add({ title: title, bits: [] });
            addSetlistForm.reset();
        }
    });

    function renderSetlists() {
        setlistsContainer.innerHTML = '';
        allSetlists.forEach(setlist => {
            const setlistEl = document.createElement('article');
            const totalLength = setlist.bits.reduce((sum, bit) => sum + (bit.length || 0), 0);
            const bitsHTML = setlist.bits.map(bit => `<li>${bit.title}</li>`).join('');
            const optionsHTML = allBits
                .filter(bit => !setlist.bits.some(sBit => sBit.id === bit.id))
                .map(bit => `<option value="${bit.id}">${bit.title} (${bit.length} min)</option>`).join('');
            setlistEl.innerHTML = `
                <header class="grid">
                    <h5 class="mb-0">${setlist.title} (Total: ${totalLength} min)</h5>
                    <div>
                        <button class="secondary outline view-arrange-btn" data-setlist-id="${setlist.id}">View & Arrange</button>
                        <button class="secondary outline delete-setlist-btn" data-setlist-id="${setlist.id}">Delete</button>
                    </div>
                </header>
                <ul>${bitsHTML || '<li>No bits added yet.</li>'}</ul>
                <footer>
                    <form class="add-bit-to-setlist-form grid" data-setlist-id="${setlist.id}">
                        <select><option value="" selected>-- Select a bit --</option>${optionsHTML}</select>
                        <button type="submit">Add Bit</button>
                    </form>
                </footer>`;
            setlistsContainer.appendChild(setlistEl);
        });
    }

    setlistsContainer.addEventListener('click', (e) => {
        if (!currentUser) return;
        const target = e.target;
        if (target.classList.contains('delete-setlist-btn')) {
            const setlistId = target.dataset.setlistId;
            if (confirm('Are you sure?')) {
                db.collection('users').doc(currentUser.uid).collection('setlists').doc(setlistId).delete();
            }
        }
        if (target.classList.contains('view-arrange-btn')) {
            const setlistId = target.dataset.setlistId;
            const setlist = allSetlists.find(s => s.id === setlistId);
            arrangeModalTitle.textContent = `Arrange: ${setlist.title}`;
            saveOrderBtn.dataset.setlistId = setlistId;
            arrangeContainer.innerHTML = '';
            setlist.bits.forEach(bit => {
                const bitEl = document.createElement('div');
                bitEl.className = 'draggable-bit';
                bitEl.setAttribute('draggable', true);
                bitEl.dataset.bitId = bit.id;
                bitEl.innerHTML = `<h5>${bit.title} (${bit.length} min)</h5><p>${bit.transcription || 'No transcription.'}</p>`;
                arrangeContainer.appendChild(bitEl);
            });
            document.getElementById('arrangeSetModal').setAttribute('open', true);
        }
    });
    
    setlistsContainer.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        if (form.classList.contains('add-bit-to-setlist-form')) {
            const setlistId = form.dataset.setlistId;
            const select = form.querySelector('select');
            const bitId = select.value;
            if (bitId) {
                const bitToAdd = allBits.find(b => b.id === bitId);
                db.collection('users').doc(currentUser.uid).collection('setlists').doc(setlistId).update({
                    bits: firebase.firestore.FieldValue.arrayUnion(bitToAdd)
                });
            }
        }
    });

    let draggedElement = null;
    arrangeContainer.addEventListener('dragstart', e => {
        draggedElement = e.target;
        setTimeout(() => e.target.style.opacity = '0.5', 0);
    });
    arrangeContainer.addEventListener('dragend', e => { e.target.style.opacity = ''; });
    arrangeContainer.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = [...arrangeContainer.querySelectorAll('.draggable-bit:not(.dragging)')].reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = e.clientY - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset: offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
        if (afterElement == null) {
            arrangeContainer.appendChild(draggedElement);
        } else {
            arrangeContainer.insertBefore(draggedElement, afterElement);
        }
    });

    saveOrderBtn.addEventListener('click', () => {
        const setlistId = saveOrderBtn.dataset.setlistId;
        const originalSetlist = allSetlists.find(s => s.id === setlistId);
        const newOrderedIds = [...arrangeContainer.querySelectorAll('.draggable-bit')].map(el => el.dataset.bitId);
        const newOrderedBits = newOrderedIds.map(id => originalSetlist.bits.find(bit => bit.id === id));
        db.collection('users').doc(currentUser.uid).collection('setlists').doc(setlistId).update({ bits: newOrderedBits })
            .then(() => document.getElementById('arrangeSetModal').removeAttribute('open'));
    });
});