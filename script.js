document.addEventListener('DOMContentLoaded', () => {
    // --- START FIREBASE SETUP ---
    // PASTE YOUR PERSONAL FIREBASE CONFIG OBJECT HERE
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
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
            setElement.setAttribute('data-id', set.id);

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
                        <p class="transcription-text">${transcriptionText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
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
        const tags = setTagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean);
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

        if (target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this bit?')) {
                setsCollection.doc(docId).delete();
            }
        }

        if (target.classList.contains('toggle-transcription-btn')) {
            const transcriptionArea = setItem.querySelector('.transcription-area');
            const isHidden = transcriptionArea.classList.toggle('hidden');
            target.textContent = isHidden ? 'Show Transcription' : 'Hide Transcription';
        }

        if (target.classList.contains('edit-btn')) {
            const transcriptionArea = setItem.querySelector('.transcription-area');
            transcriptionArea.querySelector('.transcription-text').classList.add('hidden');
            transcriptionArea.querySelector('.edit-btn').classList.add('hidden');
            transcriptionArea.querySelector('.transcription-edit-area').classList.remove('hidden');
            transcriptionArea.querySelector('.save-btn').classList.remove('hidden');
        }

        if (target.classList.contains('save-btn')) {
            const transcriptionArea = setItem.querySelector('.transcription-area');
            const newTranscription = transcriptionArea.querySelector('.transcription-edit-area').value;
            setsCollection.doc(docId).update({ transcription: newTranscription })
                .then(() => {
                    transcriptionArea.querySelector('.transcription-text').classList.remove('hidden');
                    transcriptionArea.querySelector('.edit-btn').classList.remove('hidden');
                    transcriptionArea.querySelector('.transcription-edit-area').classList.add('hidden');
                    transcriptionArea.querySelector('.save-btn').classList.add('hidden');
                });
        }
    });

    searchLengthInput.addEventListener('input', filterAndRender);
    searchTagsInput.addEventListener('input', filterAndRender);

    exportBtn.addEventListener('click', () => {
        if (comedySets.length === 0) {
            alert('No data to export!');
            return;
        }
        const dataToExport = comedySets.map(({ id, ...rest }) => rest);
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'comedy_sets_backup.json';
        link.click();
        URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedSets = JSON.parse(event.target.result);
                if (Array.isArray(importedSets)) {
                    if (confirm('This will ADD the imported bits to your database. Continue?')) {
                        importedSets.forEach(set => setsCollection.add(set));
                        alert('Data imported successfully!');
                    }
                } else {
                    alert('Invalid file format.');
                }
            } catch (error) {
                alert('Error reading the file.');
            }
        };
        reader.readAsText(file);
    });

    getSuggestionBtn.addEventListener('click', async () => {
        const apiKey = geminiApiKeyInput.value.trim();
        const gigDetails = gigDetailsInput.value.trim();

        if (!apiKey) {
            alert('Please enter your Gemini API key.');
            return;
        }
        if (!gigDetails) {
            alert('Please describe the gig.');
            return;
        }
        if (comedySets.length === 0) {
            alert('You need to add some bits first!');
            return;
        }

        geminiSuggestionBox.textContent = '🧠 Thinking of a killer set...';
        
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        
        const prompt = `
            You are a helpful assistant for a stand-up comedian. The comedian needs you to build a cohesive setlist for an upcoming gig.
            Here is the comedian's library of available bits in JSON format. IMPORTANT: The "transcription" field is for context only; do not include it in your final output.
            ${JSON.stringify(comedySets.map(({id, ...rest}) => rest), null, 2)}
            Here are the details for the upcoming gig:
            "${gigDetails}"
            Your task is to select a combination of bits from the provided library to create a setlist. The total length of the setlist should be as close as possible to the target length without going over. Present the final setlist as an ordered list with the title of each bit and its length. After the list, provide a brief (1-2 sentences) explanation for your choices. Only use the bits from the provided library.
        `;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });

            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

            const data = await response.json();
            const suggestion = data.candidates[0].content.parts[0].text;
            geminiSuggestionBox.textContent = suggestion;

        } catch (error) {
            geminiSuggestionBox.textContent = `An error occurred: ${error.message}. Make sure your API key is correct and has access.`;
            console.error('Gemini API Error:', error);
        }
    });
});