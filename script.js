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

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    // --- END FIREBASE SETUP ---

    // DOM Elements
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userDetails = document.getElementById('user-details');
    const userName = document.getElementById('user-name');
    const addSetForm = document.getElementById('add-set-form');
    const setListContainer = document.getElementById('set-list-container');
    const addShowForm = document.getElementById('add-show-form');
    const upcomingShowsContainer = document.getElementById('upcoming-shows-container');
    const searchLengthInput = document.getElementById('search-length');
    const searchTagsInput = document.getElementById('search-tags');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file');

    let comedySets = [];
    let upcomingShows = [];
    let currentUser = null;
    let unsubscribeSets;
    let unsubscribeShows;

    // --- Authentication Logic ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loginBtn.style.display = 'none';
            userDetails.style.display = 'block';
            userName.textContent = user.displayName;
            loadUserData(user.uid);
        } else {
            currentUser = null;
            loginBtn.style.display = 'block';
            userDetails.style.display = 'none';
            userName.textContent = '';
            if (unsubscribeSets) unsubscribeSets();
            if (unsubscribeShows) unsubscribeShows();
            comedySets = [];
            upcomingShows = [];
            renderSets([]);
            renderShows([]);
        }
    });

    loginBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider);
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // --- Data Loading ---
    function loadUserData(userId) {
        // Load Sets
        const setsCollection = db.collection('users').doc(userId).collection('sets');
        unsubscribeSets = setsCollection.orderBy('title').onSnapshot(snapshot => {
            comedySets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterAndRender();
            renderShows(upcomingShows); 
        });

        // Load Shows
        const showsCollection = db.collection('users').doc(userId).collection('shows');
        unsubscribeShows = showsCollection.orderBy('date').onSnapshot(snapshot => {
            upcomingShows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderShows(upcomingShows);
        });
    }

    // --- Render Functions ---
    const renderShows = (showsToRender) => {
        upcomingShowsContainer.innerHTML = '';
        if (!showsToRender || showsToRender.length === 0) {
            upcomingShowsContainer.innerHTML = '<p>No upcoming shows planned.</p>';
            return;
        }

        showsToRender.forEach(show => {
            const showElement = document.createElement('div');
            showElement.classList.add('show-item');
            showElement.setAttribute('data-id', show.id);

            let setlistHTML = '';
            if (show.setlist && show.setlist.length > 0) {
                show.setlist.forEach(bit => {
                    setlistHTML += `<div class="setlist-bit">${bit.title} (${bit.length} min) <button class="remove-bit-btn" data-bit-title="${bit.title}">Remove</button></div>`;
                });
            } else {
                setlistHTML = '<p>No bits added to this setlist yet.</p>';
            }
            
            let bitOptionsHTML = comedySets
                .filter(bit => !show.setlist || !show.setlist.some(sBit => sBit.title === bit.title))
                .map(bit => `<option value="${bit.id}">${bit.title}</option>`)
                .join('');

            showElement.innerHTML = `
                <div class="show-item-main">
                    <h3>${show.venue} - ${new Date(show.date).toLocaleDateString()}</h3>
                    <button class="add-to-calendar-btn">Add to Calendar</button>
                </div>
                <div>${setlistHTML}</div>
                <form class="add-bit-to-show-form">
                    <select class="bit-select">
                        <option value="">-- Add a bit to the setlist --</option>
                        ${bitOptionsHTML}
                    </select>
                    <button type="submit">Add Bit</button>
                </form>
            `;
            upcomingShowsContainer.appendChild(showElement);
        });
    };
    
    const renderSets = (setsToRender) => {
        setListContainer.innerHTML = '';
        if (!setsToRender || setsToRender.length === 0) {
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

    // --- Event Listeners ---

    addSetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const title = document.getElementById('set-title').value.trim();
        const length = parseFloat(document.getElementById('set-length').value);
        const tags = document.getElementById('set-tags').value.split(',').map(tag => tag.trim()).filter(Boolean);
        const transcription = document.getElementById('set-transcription').value.trim();

        if (title && !isNaN(length)) {
            db.collection('users').doc(currentUser.uid).collection('sets').add({
                title, length, tags, transcription, performances: []
            });
            addSetForm.reset();
        }
    });

    addShowForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const venue = document.getElementById('show-venue').value;
        const date = document.getElementById('show-date').value;
        if (venue && date) {
            db.collection('users').doc(currentUser.uid).collection('shows').add({
                venue, date, setlist: []
            });
            addShowForm.reset();
        }
    });
    
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
            userSetsCollection.doc(docId).update({ transcription: newTranscription })
                .then(() => {
                    transcriptionArea.querySelector('.transcription-text').classList.remove('hidden');
                    transcriptionArea.querySelector('.edit-btn').classList.remove('hidden');
                    transcriptionArea.querySelector('.transcription-edit-area').classList.add('hidden');
                    transcriptionArea.querySelector('.save-btn').classList.add('hidden');
                });
        }
    });
    
    upcomingShowsContainer.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const target = e.target;
        const showItem = target.closest('.show-item');
        if (!showItem) return;
        const showId = showItem.getAttribute('data-id');
        const showDocRef = db.collection('users').doc(currentUser.uid).collection('shows').doc(showId);

        if (target.closest('.add-bit-to-show-form')) {
            const select = showItem.querySelector('.bit-select');
            const bitId = select.value;
            if (bitId) {
                const bitToAdd = comedySets.find(b => b.id === bitId);
                showDocRef.update({
                    setlist: firebase.firestore.FieldValue.arrayUnion({
                        id: bitToAdd.id,
                        title: bitToAdd.title,
                        length: bitToAdd.length
                    })
                });
            }
        }
        if (target.classList.contains('remove-bit-btn')) {
            const bitTitleToRemove = target.getAttribute('data-bit-title');
            const currentShow = upcomingShows.find(s => s.id === showId);
            const bitToRemove = currentShow.setlist.find(b => b.title === bitTitleToRemove);
            if (bitToRemove) {
                showDocRef.update({
                    setlist: firebase.firestore.FieldValue.arrayRemove(bitToRemove)
                });
            }
        }
        if (target.classList.contains('add-to-calendar-btn')) {
            const currentShow = upcomingShows.find(s => s.id === showId);
            if (currentShow) {
                generateICSFile(currentShow);
            }
        }
    });

    searchLengthInput.addEventListener('input', filterAndRender);
    searchTagsInput.addEventListener('input', filterAndRender);

    // --- Helper Functions ---
    function generateICSFile(show) {
        const eventName = `Comedy Show: ${show.venue}`;
        const eventDate = new Date(show.date);
        const startDate = new Date(eventDate.getTime() + 20 * 60 * 60 * 1000); // 8 PM UTC
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 

        const toICSDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const setlistSummary = show.setlist.map(bit => `- ${bit.title} (${bit.length} min)`).join('\\n');
        const description = `Setlist for the show:\\n${setlistSummary}`;

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//ComedySetManager//App v1.0//EN',
            'BEGIN:VEVENT',
            `UID:${show.id}@comedysetmanager.app`,
            `DTSTAMP:${toICSDate(new Date())}`,
            `DTSTART:${toICSDate(startDate)}`,
            `DTEND:${toICSDate(endDate)}`,
            `SUMMARY:${eventName}`,
            `DESCRIPTION:${description}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${show.venue}_show.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    exportBtn.addEventListener('click', () => { /* Unchanged */ });
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => { /* Unchanged */ });
});