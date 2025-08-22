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
            // Use Bootstrap card classes for a consistent look
            setElement.className = 'card card-body mb-3'; 
            setElement.setAttribute('data-id', set.id);
            
            const transcriptionText = set.transcription || '';
            const hasTranscription = transcriptionText.trim() !== '';
            const tags = set.tags && set.tags.length > 0 ? set.tags : [];
            const tagsText = tags.join(', ');

            setElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h3 class="h5">${set.title}</h3>
                        <p class="mb-2 text-muted"><strong>Length:</strong> ${set.length} min</p>
                        
                        <div class="tags-container">
                            <div class="tags-display-view">
                                <p class="mb-0"><strong>Tags:</strong> ${tags.length > 0 ? tags.map(tag => `<span class="tag">${tag}</span>`).join(' ') : 'No tags'}</p>
                                <button class="btn btn-sm btn-outline-secondary edit-tags-btn ms-2">Edit</button>
                            </div>
                            <div class="tags-edit-view d-none mt-2">
                                <input type="text" class="form-control form-control-sm" value="${tagsText}">
                                <button class="btn btn-sm btn-success save-tags-btn ms-2">Save</button>
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
