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

    const modal = document.getElementById('setlist-studio-modal');
    // ... (rest of const declarations)
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
                        <button class="edit-setlist-btn" data-id="${setlist.id}">Edit</button>
                        <button class="delete-setlist-btn" data-id="${setlist.id}">Delete</button>
                    </div>
                </div>
            `;
            setlistsContainer.appendChild(el);
        });
    }

    setlistsContainer.addEventListener('click', e => {
        const target = e.target;
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
    
    // ... (The rest of the file is unchanged)
});
