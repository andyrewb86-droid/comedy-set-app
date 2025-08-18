document.addEventListener('DOMContentLoaded', () => {
    // --- START FIREBASE SETUP ---
    // This is your personal config in the correct format for our app
    const firebaseConfig = {
      apiKey: "AIzaSyAl55bFL__bGedFYLXFDHGt47tDi90WRpY",
      authDomain: "comedy-set-manager.firebaseapp.com",
      projectId: "comedy-set-manager",
      storageBucket: "comedy-set-manager.firebasestorage.app",
      messagingSenderId: "404723429589",
      appId: "1:404723429589:web:b33169169b1401f47d325c"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const setsCollection = db.collection('sets');
    // --- END FIREBASE SETUP ---

    // DOM Elements
    const addSetForm = document.getElementById('add-set-form');
    const setTitleInput = document.getElementById('set-title');
    const setLengthInput = document.getElementById('set-length');
    const setTagsInput = document.getElementById('set-tags');
    const setTranscriptionInput = document.getElementById('set-transcription');
    const setListContainer = document.getElementById('set-list-container');
    // ... other elements
    const searchLengthInput = document.getElementById('search-length');
    const searchTagsInput = document.getElementById('search-tags');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file');
    const getSuggestionBtn = document.getElementById('get-suggestion-btn');
    const gigDetailsInput = document.getElementById('gig-details');
    const geminiApiKeyInput = document.getElementById('gemini-api-key');
    const geminiSuggestionBox = document.getElementById('gemini-suggestion');


    let comedySets = [];

    const renderSets = (setsToRender) => {
        setListContainer.innerHTML = '';
        if (setsToRender.length === 0) {
            setListContainer.innerHTML = '<p>No bits found. Try adding some!</p>';
            return;
        }

        setsToRender.forEach((set) => {
            const setElement = document.createElement('div');
            setElement.classList.add('set-item');
            setElement.setAttribute('data-id', set.id); // Add data-id to the main container

            const transcriptionText = set.transcription || '';
            const hasTranscription = transcriptionText.trim() !== '';

            setElement.innerHTML = `
                <div class="set-item-main">
                    <div class="set-item-details">
                        <h3>${set.title}</h3>
                        <p>Length: ${set.length} min</p>
                        <p>Tags: ${set.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>
                    </div>
                    <button class="delete-btn">Delete</button>
                </div>
                ${hasTranscription ? `
                    <button class="toggle-transcription-btn">Show Transcription</button>
                    <div class="transcription-area hidden">
                        <p class="transcription-text">${transcriptionText}</p>
                        <textarea class="transcription-edit-area hidden">${transcriptionText}</textarea>
                        <div class="edit-controls">
                            <button class="edit-btn">Edit</button>
                            <button class="save-btn hidden">Save</button>
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
            const lengthMatch = isNaN(lengthQuery) || set.length === lengthQuery;
            const tagsMatch = !tagsQuery || set.tags.some(tag => tag.toLowerCase().includes(tagsQuery));
            return lengthMatch && tagsMatch;
        });

        renderSets(filteredSets);
    };

    setsCollection.orderBy('title').onSnapshot(snapshot => {
        comedySets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndRender();
    });

    addSetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = setTitleInput.value.trim();
        const length = parseFloat(setLengthInput.value);
        const tags = setTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        const transcription = setTranscriptionInput.value.trim();

        if (title && !isNaN(length)) {
            setsCollection.add({ title, length, tags, transcription });
            addSetForm.reset();
        }
    });

    setListContainer.addEventListener('click', (e) => {
        const target = e.target;
        const setItem = target.closest('.set-item');
        if (!setItem) return;
        const docId = setItem.getAttribute('data-id');

        // Delete logic
        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this bit?')) {
                setsCollection.doc(docId).delete();
            }
        }
        // Show/Hide logic
        if (target.classList.contains('toggle-transcription-btn')) {
            const transcriptionArea = setItem.querySelector('.transcription-area');
            const isHidden = transcriptionArea.classList.toggle('hidden');
            target.textContent = isHidden ? 'Show Transcription' : 'Hide Transcription';
        }
        // Edit logic
        if (target.classList.contains('edit-btn')) {
            const transcriptionArea = setItem.querySelector('.transcription-area');
            transcriptionArea.querySelector('.transcription-text').classList.add('hidden');
            transcriptionArea.querySelector('.edit-btn').classList.add('hidden');
            transcriptionArea.querySelector('.transcription-edit-area').classList.remove('hidden');
            transcriptionArea.querySelector('.save-btn').classList.remove('hidden');
        }
        // Save logic
        if (target.classList.contains('save-btn')) {
            const transcriptionArea = setItem.querySelector('.transcription-area');
            const newTranscription = transcriptionArea.querySelector('.transcription-edit-area').value;
            setsCollection.doc(docId).update({ transcription: newTranscription })
                .then(() => {
                    // Switch back to view mode after saving
                    transcriptionArea.querySelector('.transcription-text').classList.remove('hidden');
                    transcriptionArea.querySelector('.edit-btn').classList.remove('hidden');
                    transcriptionArea.querySelector('.transcription-edit-area').classList.add('hidden');
                    transcriptionArea.querySelector('.save-btn').classList.add('hidden');
                });
        }
    });
    
    // Search functionality, Import/Export, and Gemini (no changes needed)
    searchLengthInput.addEventListener('input', filterAndRender);
    searchTagsInput.addEventListener('input', filterAndRender);
    exportBtn.addEventListener('click', () => {
        if (comedySets.length === 0) {
            alert('No data