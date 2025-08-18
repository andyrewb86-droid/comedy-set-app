document.addEventListener('DOMContentLoaded', () => {
    // --- START FIREBASE SETUP ---
    // PASTE YOUR FIREBASE CONFIG OBJECT FROM THE FIREBASE WEBSITE HERE
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
    const db = firebase.firestore(); // Get a reference to the Firestore database
    const setsCollection = db.collection('sets'); // Reference to our 'sets' collection
    // --- END FIREBASE SETUP ---

    // DOM Elements (same as before)
    const addSetForm = document.getElementById('add-set-form');
    const setTitleInput = document.getElementById('set-title');
    const setLengthInput = document.getElementById('set-length');
    const setTagsInput = document.getElementById('set-tags');
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

    // This array will hold our sets, populated from Firebase
    let comedySets = [];

    /**
     * Renders the list of comedy sets to the UI.
     * @param {Array} setsToRender - The array of sets to display.
     */
    const renderSets = (setsToRender) => {
        setListContainer.innerHTML = ''; // Clear the current list
        if (setsToRender.length === 0) {
            setListContainer.innerHTML = '<p>No bits found. Try adding some!</p>';
            return;
        }

        setsToRender.forEach((set) => {
            const setElement = document.createElement('div');
            setElement.classList.add('set-item');
            // We store the unique database ID on the delete button now
            setElement.innerHTML = `
                <div class="set-item-details">
                    <h3>${set.title}</h3>
                    <p>Length: ${set.length} min</p>
                    <p>Tags: ${set.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}</p>
                </div>
                <button class="delete-btn" data-id="${set.id}">Delete</button>
            `;
            setListContainer.appendChild(setElement);
        });
    };
    
    /**
     * Filters and re-renders the sets based on search criteria.
     */
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

    // --- NEW: Real-time data listener from Firebase ---
    setsCollection.orderBy('title').onSnapshot(snapshot => {
        comedySets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndRender(); // Re-render whenever data changes
    });

    // --- UPDATED Event Listeners ---

    // Add a new set to Firebase
    addSetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = setTitleInput.value.trim();
        const length = parseFloat(setLengthInput.value);
        const tags = setTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);

        if (title && !isNaN(length)) {
            // Add a new document to our Firebase collection
            setsCollection.add({ title, length, tags });
            addSetForm.reset();
        }
    });

    // Delete a set from Firebase
    setListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const docId = e.target.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this bit?')) {
                setsCollection.doc(docId).delete();
            }
        }
    });

    // Search functionality (no changes needed here)
    searchLengthInput.addEventListener('input', filterAndRender);
    searchTagsInput.addEventListener('input', filterAndRender);
    
    // Export and Import functionality still works for local backups
    exportBtn.addEventListener('click', () => {
        if (comedySets.length === 0) {
            alert('No data to export!');
            return;
        }
        const dataToExport = comedySets.map(({ id, ...rest }) => rest); // Remove IDs for clean export
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
                        // Loop and add each imported set to Firebase
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
    
    // Gemini API integration (no changes needed here)
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
            Here is the comedian's library of available bits in JSON format:
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