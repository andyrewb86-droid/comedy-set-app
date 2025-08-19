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
    const auth = firebase.auth();
    // --- END FIREBASE SETUP ---

    const logGigForm = document.getElementById('log-gig-form');
    const gigHistoryContainer = document.getElementById('gig-history-container');
    let currentUser = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadGigHistory(user.uid);
        } else {
            currentUser = null;
            gigHistoryContainer.innerHTML = '<p>Please log in on the main page to see your history.</p>';
        }
    });

    function loadGigHistory(userId) {
        const gigsCollection = db.collection('users').doc(userId).collection('gigs');
        gigsCollection.orderBy('date', 'desc').onSnapshot(snapshot => {
            if (snapshot.empty) {
                gigHistoryContainer.innerHTML = '<p>No gigs logged yet.</p>';
                return;
            }
            gigHistoryContainer.innerHTML = snapshot.docs.map(doc => {
                const gig = doc.data();
                const gigDate = new Date(gig.date).toLocaleDateString();
                return `
                    <div class="gig-item">
                        <h3>${gig.venue} - ${gigDate}</h3>
                        <p><strong>Rating:</strong> ${'★'.repeat(gig.rating)}${'☆'.repeat(5 - gig.rating)}</p>
                        <p><strong>Comments:</strong> ${gig.comments}</p>
                        ${gig.mediaLink ? `<a href="${gig.mediaLink}" target="_blank">Watch/Listen to Recording</a>` : ''}
                    </div>
                `;
            }).join('');
        });
    }

    logGigForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert('You must be logged in to save a gig.');
            return;
        }

        const venue = document.getElementById('gig-venue').value;
        const date = document.getElementById('gig-date').value;
        const mediaLink = document.getElementById('gig-media-link').value;
        const rating = parseInt(document.getElementById('gig-rating').value, 10);
        const comments = document.getElementById('gig-comments').value;

        if (venue && date && rating) {
            const gigsCollection = db.collection('users').doc(currentUser.uid).collection('gigs');
            gigsCollection.add({
                venue,
                date,
                mediaLink,
                rating,
                comments,
                createdAt: new Date()
            }).then(() => {
                logGigForm.reset();
            });
        }
    });
});