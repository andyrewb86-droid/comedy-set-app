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

    const addSetlistForm = document.getElementById('add-setlist-form');
    const setlistsContainer = document.getElementById('setlists-container');
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
            db.collection('users').doc(currentUser.uid).collection('setlists').add({
                title: title,
                bits: []
            });
            addSetlistForm.reset();
        }
    });

    function renderSetlists() {
        setlistsContainer.innerHTML = '';
        allSetlists.forEach(setlist => {
            const setlistEl = document.createElement('div');
            setlistEl.classList.add('card', 'shadow-sm', 'mb-3');
            
            const totalLength = setlist.bits.reduce((sum, bit) => sum + (bit.length || 0), 0);

            const bitsHTML = setlist.bits.map(bit => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${bit.title}
                    <button class="btn btn-sm btn-outline-danger remove-bit-btn" data-setlist-id="${setlist.id}" data-bit-id="${bit.id}">Remove</button>
                </li>
            `).join('');

            const optionsHTML = allBits
                .filter(bit => !setlist.bits.some(sBit => sBit.id === bit.id))
                .map(bit => `<option value="${bit.id}">${bit.title} (${bit.length} min)</option>`)
                .join('');
            
            setlistEl.innerHTML = `
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="h5 mb-0">${setlist.title} (Total: ${totalLength} min)</h3>
                    <button class="btn btn-sm btn-danger delete-setlist-btn" data-setlist-id="${setlist.id}">Delete Set</button>
                </div>
                <div class="card-body">
                    <ul class="list-group mb-3">${bitsHTML || '<li class="list-group-item">No bits added yet.</li>'}</ul>
                    <form class="add-bit-to-setlist-form row g-2" data-setlist-id="${setlist.id}">
                        <div class="col-8">
                            <select class="form-select">
                                <option>-- Select a bit to add --</option>
                                ${optionsHTML}
                            </select>
                        </div>
                        <div class="col-4">
                            <button type="submit" class="btn btn-secondary w-100">Add Bit</button>
                        </div>
                    </form>
                </div>
            `;
            setlistsContainer.appendChild(setlistEl);
        });
    }

    setlistsContainer.addEventListener('click', (e) => {
        if (!currentUser) return;
        const target = e.target;
        
        if (target.classList.contains('delete-setlist-btn')) {
            const setlistId = target.dataset.setlistId;
            if (confirm('Are you sure you want to delete this entire setlist?')) {
                db.collection('users').doc(currentUser.uid).collection('setlists').doc(setlistId).delete();
            }
        }
        
        if (target.classList.contains('remove-bit-btn')) {
            const setlistId = target.dataset.setlistId;
            const bitId = target.dataset.bitId;
            const setlist = allSetlists.find(s => s.id === setlistId);
            const bitToRemove = setlist.bits.find(b => b.id === bitId);
            db.collection('users').doc(currentUser.uid).collection('setlists').doc(setlistId).update({
                bits: firebase.firestore.FieldValue.arrayRemove(bitToRemove)
            });
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
                    bits: firebase.firestore.FieldValue.arrayUnion({
                        id: bitToAdd.id,
                        title: bitToAdd.title,
                        length: bitToAdd.length,
                        tags: bitToAdd.tags,
                        transcription: bitToAdd.transcription
                    })
                });
            }
        }
    });
});