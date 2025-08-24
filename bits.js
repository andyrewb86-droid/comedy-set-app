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
            setListContainer.innerHTML = '<article><p>No bits found. Try adding some on the Dashboard!</p></article>';
            return;
        }

        setsToRender.forEach((set) => {
            const setElement = document.createElement('article');
            setElement.className = 'set-item';
            setElement.setAttribute('data-id', set.id);
            
            const transcriptionText = set.transcription || '';
            const hasTranscription = transcriptionText.trim() !== '';
            const tags = set.tags || [];
            const tagsText = tags.join(', ');

            // Tag truncation logic
            let tagsHTML = '';
            const maxTagsToShow = 5;
            if (tags.length > maxTagsToShow) {
                const truncatedTags = tags.slice(0, maxTagsToShow).map(tag => `<span class="tag">${tag}</span>`).join(' ');
                const fullTags = tags.map(tag => `<span class="tag">${tag}</span>`).join(' ');
                const remainingCount = tags.length - maxTagsToShow;
                tagsHTML = `
                    <span class="tags-truncated">${truncatedTags}<button class="toggle-tags-btn">+ ${remainingCount} more</button></span>
                    <span class="tags-full d-none">${fullTags}<button class="toggle-tags-btn">Show Less</button></span>
                `;
            } else {
                tagsHTML = tags.length > 0 ? tags.map(tag => `<span class="tag">${tag}</span>`).join(' ') : 'No tags';
            }
            
            // New transcript logic
            let transcriptionHTML = '';
            if(hasTranscription) {
                transcriptionHTML = `
                    <div class="transcription-display">
                        <div class="transcript-preview-container">
                            <p class="transcript-preview-text">${transcriptionText}</p>
                        </div>
                        <div class="grid" style="--grid-cols: auto auto; margin-top: 0.5rem; justify-content: start; gap: 1rem;">
                            <button class="toggle-transcript-btn secondary outline">Show More</button>
                            <button class="edit-btn secondary outline">Edit</button>
                        </div>
                    </div>
                `;
            } else {
                transcriptionHTML = `
                    <div class="transcription-display">
                        <p class="transcript-preview-text">No transcription added yet.</p>
                        <button class="edit-btn secondary outline" style="margin-top: 0.5rem;">Add Transcription</button>
                    </div>
                `;
            }

            setElement.innerHTML = `
                <div class="set-item-main">
                    <div>
                        <h5>${set.title}</h5>
                        <p><strong>Length:</strong> ${set.length} min</p>
                        <div class="tags-container">
                            <div class="tags-display-view">
                                <p><strong>Tags:</strong> ${tagsHTML}</p>
                                <button class="edit-tags-btn secondary outline">Edit</button>
                            </div>
                            <div class="tags-edit-view d-none">
                                <input type="text" value="${tagsText}">
                                <button class="save-tags-btn">Save</button>
                            </div>
                        </div>
                    </div>
                    <button class="delete-btn secondary outline">Delete</button>
                </div>
                
                <div class="transcription-section mt-2">
                    ${transcriptionHTML}
                    <div class="transcription-edit d-none">
                        <textarea>${transcriptionText}</textarea>
                        <button class="save-btn">Save</button>
                    </div>
                </div>
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
    
    searchLengthInput.addEventListener('input', filterAndRender);
    searchTagsInput.addEventListener('input', filterAndRender);
    
    setListContainer.addEventListener('click', (e) => {
        if (!currentUser) return;
        const target = e.target;
        const setItem = target.closest('.set-item');
        if (!setItem) return;
        const docId = setItem.getAttribute('data-id');
        const userSetsCollection = db.collection('users').doc(currentUser.uid).collection('sets');

        if (target.classList.contains('toggle-transcript-btn')) {
            const container = setItem.querySelector('.transcript-preview-container');
            const isExpanded = container.classList.toggle('expanded');
            target.textContent = isExpanded ? 'Show Less' : 'Show More';
        }

        if (target.classList.contains('edit-btn')) {
            setItem.querySelector('.transcription-display').classList.add('d-none');
            setItem.querySelector('.transcription-edit').classList.remove('d-none');
        }

        if (target.classList.contains('save-btn') && !target.classList.contains('save-tags-btn')) {
            const newTranscription = setItem.querySelector('.transcription-edit textarea').value;
            userSetsCollection.doc(docId).update({ transcription: newTranscription });
        }

        if (target.classList.contains('toggle-tags-btn')) {
            setItem.querySelector('.tags-truncated').classList.toggle('d-none');
            setItem.querySelector('.tags-full').classList.toggle('d-none');
        }
        if (target.classList.contains('edit-tags-btn')) {
            setItem.querySelector('.tags-display-view').classList.add('d-none');
            setItem.querySelector('.tags-edit-view').classList.remove('d-none');
        }
        if (target.classList.contains('save-tags-btn')) {
            const newTagsValue = setItem.querySelector('.tags-edit-view input').value;
            userSetsCollection.doc(docId).update({ tags: newTagsValue.split(',').map(tag => tag.trim()).filter(Boolean) });
        }
        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure?')) userSetsCollection.doc(docId).delete();
        }
    });
});
