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
            window.location.href = 'signin.html';
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
        if (!setListContainer) return;
        
        setListContainer.innerHTML = '';
        if (!setsToRender || setsToRender.length === 0) {
            setListContainer.innerHTML = '<p>No bits found. Try adding some on the Dashboard!</p>';
            return;
        }

        setsToRender.forEach((set) => {
            const setElement = document.createElement('div');
            setElement.classList.add('set-item', 'card', 'card-body', 'mb-3'); // Using card styles for consistency
            setElement.setAttribute('data-id', set.id);
            const transcriptionText = set.transcription || '';
            const hasTranscription = transcriptionText.trim() !== '';
            const tagsText = set.tags ? set.tags.join(', ') : '';

            setElement.innerHTML = `
                <div class="set-item-main">
                    <div>
                        <h3>${set.title}</h3>
                        <p class="mb-2"><strong>Length:</strong> ${set.length} min</p>
                        
                        <div class="tags-container">
                            <div class="tags-display-view">
                                <p class="mb-0"><strong>Tags:</strong> ${set.tags ? set.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ') : 'No tags'}</p>
                                <button class="btn btn-sm btn-outline-secondary edit-tags-btn">Edit</button>
                            </div>
                            <div class="tags-edit-view d-none">
                                <input type="text" class="form-control form-control-sm" value="${tagsText}">
                                <button class="btn btn-sm btn-success save-tags-btn">Save</button>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-danger delete-btn">Delete</button>
                </div>
                ${hasTranscription ? `
                    <div class="transcription-area mt-3 pt-3 border-top">
                        <button class="btn btn-sm btn-secondary toggle-transcription-btn">Show Transcription</button>
                        <div class="transcription-content d-none mt-2">
                            <p style="white-space: pre-wrap;">${transcriptionText}</p>
                            <button class="btn btn-sm btn-outline-secondary edit-btn mt-2">Edit</button>
                        </div>
                        <div class="transcription-edit d-none mt-2">
                            <textarea class="form-control">${transcriptionText}</textarea>
                            <button class="btn btn-sm btn-success save-btn mt-2">Save</button>
                        </div>
                    </div>` : ''}
            `;
            setListContainer.appendChild(setElement);
        });
    };

    const filterAndRender = () => {
        if (!searchLengthInput || !searchTagsInput) return;

        const lengthQuery = parseFloat(searchLengthInput.value);
        const tagsQuery = searchTagsInput.value.toLowerCase().trim();

        const filteredSets = comedySets.filter(set => {
            const lengthMatch = isNaN(lengthQuery) || (set.length >= lengthQuery - 2 && set.length <= lengthQuery + 2);
            const tagsMatch = !tagsQuery || (set.tags && set.tags.some(tag => tag.toLowerCase().includes(tagsQuery)));
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

            // --- NEW LOGIC FOR EDITING TAGS ---
            if (target.classList.contains('edit-tags-btn')) {
                setItem.querySelector('.tags-display-view').classList.add('d-none');
                setItem.querySelector('.tags-edit-view').classList.remove('d-none');
            }

            if (target.classList.contains('save-tags-btn')) {
                const newTagsValue = setItem.querySelector('.tags-edit-view input').value;
                const newTagsArray = newTagsValue.split(',').map(tag => tag.trim()).filter(Boolean);
                
                userSetsCollection.doc(docId).update({ tags: newTagsArray })
                    .then(() => {
                        setItem.querySelector('.tags-display-view').classList.remove('d-none');
                        setItem.querySelector('.tags-edit-view').classList.add('d-none');
                    });
            }
            // --- END OF NEW LOGIC ---

            if (target.classList.contains('delete-btn')) {
                if (confirm('Are you sure you want to delete this bit?')) {
                    userSetsCollection.doc(docId).delete();
                }
            }
            if (target.classList.contains('toggle-transcription-btn')) {
                const content = setItem.querySelector('.transcription-content');
                content.classList.toggle('d-none'); // Use d-none for Bootstrap
                target.textContent = content.classList.contains('d-none') ? 'Show Transcription' : 'Hide Transcription';
            }
            if (target.classList.contains('edit-btn')) {
                setItem.querySelector('.transcription-content').classList.add('d-none');
                setItem.querySelector('.transcription-edit').classList.remove('d-none');
            }
            if (target.classList.contains('save-btn')) {
                const newTranscription = setItem.querySelector('.transcription-edit textarea').value;
                userSetsCollection.doc(docId).update({ transcription: newTranscription });
            }
        });
    }
});
