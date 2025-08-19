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

    const setListContainer = document.getElementById('set-list-container');
    const searchLengthInput = document.getElementById('search-length');
    const searchTagsInput = document.getElementById('search-tags');
    
    let comedySets = [];
    let currentUser = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserSets(user.uid);
        } else {
            // If we are not on the signin page, redirect there.
            if (window.location.pathname.indexOf('signin.html') === -1) {
                window.location.href = 'signin.html';
            }
        }
    });

    function loadUserSets(userId) {
        const setsCollection = db.collection('users').doc(userId).collection('sets');
        setsCollection.orderBy('title').onSnapshot(snapshot => {
            comedySets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterAndRender();
        });
    }

    const renderSets = (setsToRender) => {
        if (!setListContainer) return; // Prevent errors if element doesn't exist
        
        setListContainer.innerHTML = '';
        if (!setsToRender || setsToRender.length === 0) {
            setListContainer.innerHTML = '<p>No bits found. Try adding some on the Dashboard!</p>';
            return;
        }

        setsToRender.forEach((set) => {
            const setElement = document.createElement('div');
            setElement.classList.add('set-item');
            setElement.setAttribute('data-id', set.id);
            const transcriptionText = set.transcription || '';
            const hasTranscription = transcriptionText.trim() !== '';

            setElement.innerHTML = `
                <div class="set-item-main">
                    <div>
                        <h3>${set.title}</h3>
                        <p>Length: ${set.length} min</p>
                        <p>Tags: ${set.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>
                    </div>
                    <button class="btn btn-sm btn-danger delete-btn">Delete</button>
                </div>
                ${hasTranscription ? `
                    <div class="transcription-area mt-3 pt-3 border-top">
                        <button class="btn btn-sm btn-secondary toggle-transcription-btn">Show Transcription</button>
                        <div class="transcription-content hidden mt-2">
                            <p style="white-space: pre-wrap;">${transcriptionText}</p>
                            <button class="btn btn-sm btn-outline-secondary edit-btn mt-2">Edit</button>
                        </div>
                        <div class="transcription-edit hidden mt-2">
                            <textarea class="form-control">${transcriptionText}</textarea>
                            <button class="btn btn-sm btn-success save-btn mt-2">Save</button>
                        </div>
                    </div>` : ''}
            `;
            setListContainer.appendChild(setElement);
        });
    };

    const filterAndRender = () => {
        if (!searchLengthInput || !searchTagsInput) return; // Prevent errors if elements don't exist

        const lengthQuery = parseFloat(searchLengthInput.value);
        const tagsQuery = searchTagsInput.value.toLowerCase().trim();

        const filteredSets = comedySets.filter(set => {
            const lengthMatch = isNaN(lengthQuery) || (set.length >= lengthQuery - 2 && set.length <= lengthQuery + 2);
            const tagsMatch = !tagsQuery || set.tags.some(tag => tag.toLowerCase().includes(tagsQuery));
            return lengthMatch && tagsMatch;
        });
        renderSets(filteredSets);
    };
    
    if (searchLengthInput) {
        searchLengthInput.addEventListener('input', filterAndRender);
    }
    if (searchTagsInput) {
        searchTagsInput.addEventListener('input', filterAndRender);
    }
    
    if (setListContainer) {
        setListContainer.addEventListener('click', (e) => {
            if (!currentUser) return;
            const target = e.target;
            const setItem = target.closest('.set-item');
            if (!setItem) return;
            const docId = setItem.getAttribute('data-id');
            const userSetsCollection = db.collection('users').doc(currentUser.uid).collection('sets');

            if (target.classList.contains('delete-btn')) {
                if (confirm('Are you sure you want to delete this bit?')) {
                    userSetsCollection.doc(docId).delete();
                }
            }
            if (target.classList.contains('toggle-transcription-btn')) {
                const content = setItem.querySelector('.transcription-content');
                content.classList.toggle('hidden');
                target.textContent = content.classList.contains('hidden') ? 'Show Transcription' : 'Hide Transcription';
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
    }
});