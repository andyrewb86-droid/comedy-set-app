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

    const logoutBtn = document.getElementById('logout-btn');
    const userName = document.getElementById('user-name');
    const addSetForm = document.getElementById('add-set-form');
    const setListContainer = document.getElementById('set-list-container');
    const searchLengthInput = document.getElementById('search-length');
    const searchTagsInput = document.getElementById('search-tags');
    
    let comedySets = [];
    let currentUser = null;
    let unsubscribe;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            userName.textContent = user.displayName;
            loadUserSets(user.uid);
        } else {
            window.location.href = 'signin.html';
        }
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    function loadUserSets(userId) {
        const setsCollection = db.collection('users').doc(userId).collection('sets');
        unsubscribe = setsCollection.orderBy('title').onSnapshot(snapshot => {
            comedySets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterAndRender();
        });
    }

    const renderSets = (setsToRender) => {
        setListContainer.innerHTML = '';
        setsToRender.forEach(set => {
            const setElement = document.createElement('div');
            setElement.classList.add('set-item');
            setElement.setAttribute('data-id', set.id);
            const transcriptionText = set.transcription || '';
            setElement.innerHTML = `
                <div class="set-item-main">
                    <div>
                        <h3>${set.title}</h3>
                        <p>Length: ${set.length} min</p>
                        <p>Tags: ${set.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>
                    </div>
                    <button class="delete-btn">Delete</button>
                </div>
                ${transcriptionText ? `
                    <div class="transcription-area">
                        <button class="toggle-transcription-btn">Show Transcription</button>
                        <div class="transcription-content hidden">
                            <p>${transcriptionText}</p>
                            <button class="edit-btn">Edit</button>
                        </div>
                        <div class="transcription-edit hidden">
                            <textarea>${transcriptionText}</textarea>
                            <button class="save-btn">Save</button>
                        </div>
                    </div>` : ''}
            `;
            setListContainer.appendChild(setElement);
        });
    };

    const filterAndRender = () => {
        const lengthQuery = parseFloat(searchLengthInput.value);
        const tagsQuery = searchTagsInput.value.toLowerCase().trim();
        
        const filteredSets = comedySets.filter(set => {
            const lengthMatch = isNaN(lengthQuery) || (set.length >= lengthQuery - 2 && set.length <= lengthQuery + 2);
            const tagsMatch = !tagsQuery || set.tags.some(tag => tag.toLowerCase().includes(tagsQuery));
            return lengthMatch && tagsMatch;
        });
        renderSets(filteredSets);
    };
    
    searchLengthInput.addEventListener('input', filterAndRender);
    searchTagsInput.addEventListener('input', filterAndRender);

    addSetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const newSet = {
            title: document.getElementById('set-title').value,
            length: parseFloat(document.getElementById('set-length').value),
            tags: document.getElementById('set-tags').value.split(',').map(t => t.trim()).filter(Boolean),
            transcription: document.getElementById('set-transcription').value
        };
        db.collection('users').doc(currentUser.uid).collection('sets').add(newSet);
        addSetForm.reset();
    });

    setListContainer.addEventListener('click', (e) => {
        if (!currentUser) return;
        const target = e.target;
        const setItem = target.closest('.set-item');
        if (!setItem) return;
        const docId = setItem.getAttribute('data-id');
        const userSetsCollection = db.collection('users').doc(currentUser.uid).collection('sets');

        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure?')) userSetsCollection.doc(docId).delete();
        }
        if (target.classList.contains('toggle-transcription-btn')) {
            const content = setItem.querySelector('.transcription-content');
            content.classList.toggle('hidden');
        }
        if (target.classList.contains('edit-btn')) {
            setItem.querySelector('.transcription-content').classList.add('hidden');
            setItem.querySelector('.transcription-edit').classList.remove('hidden');
        }
        if (target.classList.contains('save-btn')) {
            const newTranscription = setItem.querySelector('textarea').value;
            userSetsCollection.doc(docId).update({ transcription: newTranscription });
        }
    });
});
