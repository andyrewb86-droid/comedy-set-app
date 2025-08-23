document.addEventListener('DOMContentLoaded', () => {
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

    const uploadInput = document.getElementById('upload-performance-file');
    const gigHistoryContainer = document.getElementById('gig-history-container');
    const modalTranscript = document.getElementById('modal-transcript');
    const modalBitsChecklist = document.getElementById('modal-bits-checklist');
    const savePerformanceBtn = document.getElementById('save-performance-btn');
    const linkBitsModal = document.getElementById('linkBitsModal');
    
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
        db.collection('users').doc(userId).collection('sets').orderBy('title').onSnapshot(snapshot => {
            allUserBits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
        db.collection('users').doc(userId).collection('gigs').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            renderGigHistory(snapshot.docs);
        });
    }
    
    uploadInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => parsePerformanceFile(event.target.result);
        reader.readAsText(file);
    });

    function parsePerformanceFile(content) {
        try {
            parsedPerformanceData = {};
            const lines = content.split('\n');
            parsedPerformanceData.recordedDate = new Date(lines.find(l => l.startsWith('Recorded:')).split(': ')[1].trim());
            parsedPerformanceData.venue = lines[0].trim();
            parsedPerformanceData.stats = {
                lpm: lines.find(l => l.startsWith('Laughs per Minute:')).split(': ')[1].trim(),
                lspm: lines.find(l => l.startsWith('Laugh Seconds per Minute:')).split(': ')[1].trim(),
                totalDuration: lines.find(l => l.startsWith('Total Duration:')).split(': ')[1].trim(),
            };
            parsedPerformanceData.fullTranscript = content;

            modalTranscript.textContent = content;
            modalBitsChecklist.innerHTML = allUserBits.map(bit => `
                <label>
                    <input type="checkbox" value="${bit.id}"/>
                    ${bit.title} (${bit.length} min)
                </label>
            `).join('');
            linkBitsModal.setAttribute('open', true);
        } catch (error) {
            alert("Could not read the file. Please ensure it's in the correct format.");
            console.error("File parsing error:", error);
        }
    }

    savePerformanceBtn.addEventListener('click', () => {
        if (!currentUser || !parsedPerformanceData) return;
        const selectedBitIds = Array.from(modalBitsChecklist.querySelectorAll('input:checked')).map(input => input.value);
        const selectedBits = allUserBits.filter(bit => selectedBitIds.includes(bit.id));
        const performanceToSave = { ...parsedPerformanceData, linkedBits: selectedBits, createdAt: new Date() };

        db.collection('users').doc(currentUser.uid).collection('gigs').add(performanceToSave)
            .then(() => {
                linkBitsModal.removeAttribute('open');
                uploadInput.value = '';
                alert('Performance saved successfully!');
            });
    });

    function renderGigHistory(gigDocs) {
        if (gigDocs.length === 0) {
            gigHistoryContainer.innerHTML = '<article><p>No gigs logged yet. Upload a performance report to get started.</p></article>';
            return;
        }
        gigHistoryContainer.innerHTML = gigDocs.map(doc => {
            const gig = doc.data();
            const gigDate = gig.recordedDate ? gig.recordedDate.toDate().toLocaleDateString() : new Date(gig.date).toLocaleDateString();
            let detailsHTML = '';
            if (gig.stats) {
                const setlist = gig.linkedBits.map(bit => `<li>${bit.title} (${bit.length} min)</li>`).join('');
                detailsHTML = `
                    <div class="grid">
                        <span><strong>Laughs/Min:</strong> ${gig.stats.lpm}</span>
                        <span><strong>Laugh Secs/Min:</strong> ${gig.stats.lspm}</span>
                        <span><strong>Duration:</strong> ${gig.stats.totalDuration}</span>
                    </div>
                    <h6>Setlist Performed:</h6>
                    <ul>${setlist || '<li>No bits were linked.</li>'}</ul>`;
            } else { // Fallback for older, manual data
                detailsHTML = `<p><strong>Rating:</strong> ${'★'.repeat(gig.rating)}${'☆'.repeat(5 - gig.rating)}</p>`;
            }
            return `<article><h6>${gig.venue} on ${gigDate}</h6>${detailsHTML}</article>`;
        }).join('');
    }
});