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

    const uploadInput = document.getElementById('upload-performance-file');
    const gigHistoryContainer = document.getElementById('gig-history-container');
    const linkBitsModal = document.getElementById('linkBitsModal');
    const modalTranscript = document.getElementById('modal-transcript');
    const modalBitsChecklist = document.getElementById('modal-bits-checklist');
    const savePerformanceBtn = document.getElementById('save-performance-btn');
    const analysisSection = document.getElementById('analysis-section');
    const analyzeBtn = document.getElementById('analyze-with-gemini-btn');
    const geminiApiKeyInput = document.getElementById('gemini-api-key');

    let currentUser = null;
    let allUserBits = [];
    let parsedPerformanceData = {};
    let currentFileContent = null;

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
        if (!file) {
            analysisSection.classList.add('d-none');
            return;
        };
        const reader = new FileReader();
        reader.onload = event => {
            currentFileContent = event.target.result;
            analysisSection.classList.remove('d-none');
        };
        reader.readAsText(file);
    });

    analyzeBtn.addEventListener('click', async () => {
        const apiKey = geminiApiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter your Gemini API key.');
            return;
        }
        if (!currentFileContent) {
            alert('Please upload a file first.');
            return;
        }

        analyzeBtn.setAttribute('aria-busy', 'true');
        analyzeBtn.textContent = 'Analyzing...';

        const prompt = `
            You are an AI assistant for a comedian. Your task is to analyze a performance transcript and determine which of the comedian's pre-written bits were performed.

            Here is the comedian's library of bits in JSON format. Each bit has an "id", "title", and "transcription":
            ${JSON.stringify(allUserBits)}

            Here is the transcript of the recent performance:
            ---
            ${currentFileContent}
            ---

            Compare the performance transcript to the bit library. Identify which bits from the library appear in the performance. The performance may contain improv or crowd work not in the library, so only match bits that are clearly present.
            
            Return your answer ONLY as a valid JSON array of the IDs of the matched bits. For example: ["bitId1", "bitId3", "bitId8"]
        `;
        
        try {
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            
            const data = await response.json();
            const geminiResponseText = data.candidates[0].content.parts[0].text;
            
            // Clean up the response to make sure it's valid JSON
            const jsonString = geminiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const matchedIds = JSON.parse(jsonString);

            openLinkingModal(currentFileContent, matchedIds);

        } catch (error) {
            alert('An error occurred during analysis. Check the console for details.');
            console.error(error);
        } finally {
            analyzeBtn.removeAttribute('aria-busy');
            analyzeBtn.textContent = 'Analyze Setlist with Gemini';
        }
    });

    function openLinkingModal(transcript, preSelectedIds = []) {
        parsedPerformanceData = {}; // Reset
        const lines = transcript.split('\n');
        parsedPerformanceData.recordedDate = new Date(lines.find(l => l.startsWith('Recorded:')).split(': ')[1].trim());
        parsedPerformanceData.venue = lines[0].trim();
        parsedPerformanceData.stats = {
            lpm: lines.find(l => l.startsWith('Laughs per Minute:')).split(': ')[1].trim(),
            lspm: lines.find(l => l.startsWith('Laugh Seconds per Minute:')).split(': ')[1].trim(),
            totalDuration: lines.find(l => l.startsWith('Total Duration:')).split(': ')[1].trim(),
        };
        parsedPerformanceData.fullTranscript = transcript;

        modalTranscript.textContent = transcript;
        modalBitsChecklist.innerHTML = allUserBits.map(bit => `
            <label>
                <input type="checkbox" value="${bit.id}" ${preSelectedIds.includes(bit.id) ? 'checked' : ''}/>
                ${bit.title} (${bit.length} min)
            </label>
        `).join('');
        linkBitsModal.setAttribute('open', true);
    }

    savePerformanceBtn.addEventListener('click', () => {
        // This function is unchanged from the previous version
    });

    function renderGigHistory(gigDocs) {
        // This function is unchanged from the previous version
    }

    // --- FULL FUNCTIONS (UNCHANGED) ---
    // Make sure to paste the full, working versions of these from our previous exchange.
    savePerformanceBtn.addEventListener('click', () => {
        if (!currentUser || !parsedPerformanceData) return;
        const selectedBitIds = Array.from(modalBitsChecklist.querySelectorAll('input:checked')).map(input => input.value);
        const selectedBits = allUserBits.filter(bit => selectedBitIds.includes(bit.id));
        const performanceToSave = { ...parsedPerformanceData, linkedBits: selectedBits, createdAt: new Date() };

        db.collection('users').doc(currentUser.uid).collection('gigs').add(performanceToSave)
            .then(() => {
                linkBitsModal.removeAttribute('open');
                uploadInput.value = '';
                analysisSection.classList.add('d-none');
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
                const setlist = (gig.linkedBits || []).map(bit => `<li>${bit.title} (${bit.length} min)</li>`).join('');
                detailsHTML = `
                    <div class="grid">
                        <span><strong>Laughs/Min:</strong> ${gig.stats.lpm}</span>
                        <span><strong>Laugh Secs/Min:</strong> ${gig.stats.lspm}</span>
                        <span><strong>Duration:</strong> ${gig.stats.totalDuration}</span>
                    </div>
                    <h6>Setlist Performed:</h6>
                    <ul>${setlist || '<li>No bits were linked.</li>'}</ul>`;
            } else { 
                detailsHTML = `<p><strong>Rating:</strong> ${'★'.repeat(gig.rating)}${'☆'.repeat(5 - gig.rating)}</p>`;
            }
            return `<article><h6>${gig.venue} on ${gigDate}</h6>${detailsHTML}</article>`;
        }).join('');
    }
});