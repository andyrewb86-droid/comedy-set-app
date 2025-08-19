document.addEventListener('DOMContentLoaded', () => {
    // --- START FIREBASE SETUP ---
    const firebaseConfig = { /* PASTE YOUR CONFIG HERE */ };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    // --- END FIREBASE SETUP ---

    const uploadInput = document.getElementById('upload-performance-file');
    const gigHistoryContainer = document.getElementById('gig-history-container');
    const linkBitsModal = new bootstrap.Modal(document.getElementById('linkBitsModal'));
    const modalTranscript = document.getElementById('modal-transcript');
    const modalBitsChecklist = document.getElementById('modal-bits-checklist');
    const savePerformanceBtn = document.getElementById('save-performance-btn');

    let currentUser = null;
    let allUserBits = [];
    let parsedPerformanceData = {};

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadInitialData(user.uid);
        } else {
            window.location.href = 'signin.html';
        }
    });

    function loadInitialData(userId) {
        // Load user's bits to use in the linking modal
        db.collection('users').doc(userId).collection('sets').orderBy('title').onSnapshot(snapshot => {
            allUserBits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });

        // Load past gigs to display on the page
        db.collection('users').doc(userId).collection('gigs').orderBy('recordedDate', 'desc').onSnapshot(snapshot => {
            renderGigHistory(snapshot.docs);
        });
    }
    
    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            parsePerformanceFile(content);
        };
        reader.readAsText(file);
    });

    function parsePerformanceFile(text) {
        parsedPerformanceData = {}; // Reset previous data
        const lines = text.split('\n');
        
        // Extract basic details and stats
        parsedPerformanceData.recordedDate = lines.find(l => l.startsWith('Recorded:')).split(': ')[1].trim();
        parsedPerformanceData.stats = {
            lpm: lines.find(l => l.startsWith('Laughs per Minute:')).split(': ')[1].trim(),
            lspm: lines.find(l => l.startsWith('Laugh Seconds per Minute:')).split(': ')[1].trim(),
            totalDuration: lines.find(l => l.startsWith('Total Duration:')).split(': ')[1].trim(),
        };
        parsedPerformanceData.fullTranscript = text;

        // Populate and show the modal
        modalTranscript.textContent = text;
        modalBitsChecklist.innerHTML = allUserBits.map(bit => `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${bit.id}" id="bit-${bit.id}">
                <label class="form-check-label" for="bit-${bit.id}">
                    ${bit.title} (${bit.length} min)
                </label>
            </div>
        `).join('');
        linkBitsModal.show();
    }

    savePerformanceBtn.addEventListener('click', () => {
        if (!currentUser || !parsedPerformanceData) return;

        const selectedBitIds = Array.from(modalBitsChecklist.querySelectorAll('input:checked')).map(input => input.value);
        const selectedBits = allUserBits.filter(bit => selectedBitIds.includes(bit.id));
        
        const performanceToSave = {
            ...parsedPerformanceData,
            linkedBits: selectedBits, // Store the full bit objects for easy display
            createdAt: new Date()
        };

        db.collection('users').doc(currentUser.uid).collection('gigs').add(performanceToSave)
            .then(() => {
                linkBitsModal.hide();
                uploadInput.value = ''; // Clear the file input
                alert('Performance saved successfully!');
            });
    });

    function renderGigHistory(gigDocs) {
        if (gigDocs.length === 0) {
            gigHistoryContainer.innerHTML = '<p>No gigs logged yet. Upload a performance report to get started.</p>';
            return;
        }

        gigHistoryContainer.innerHTML = gigDocs.map(doc => {
            const gig = doc.data();
            const gigDate = new Date(gig.recordedDate).toLocaleDateString();
            const setlist = gig.linkedBits.map(bit => `<li>${bit.title} (${bit.length} min)</li>`).join('');

            return `
                <div class="card shadow-sm mb-3">
                    <div class="card-header">
                        <h3 class="h5 mb-0">Performance on ${gigDate}</h3>
                    </div>
                    <div class="card-body">
                        <div class="gig-stats mb-3">
                            <span><strong>Laughs/Min:</strong> ${gig.stats.lpm}</span>
                            <span><strong>Laugh Secs/Min:</strong> ${gig.stats.lspm}</span>
                            <span><strong>Duration:</strong> ${gig.stats.totalDuration}</span>
                        </div>
                        <h5>Setlist Performed:</h5>
                        <ul>${setlist || '<li>No bits were linked.</li>'}</ul>
                    </div>
                </div>
            `;
        }).join('');
    }
});