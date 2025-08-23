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

    const userName = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');
    const addSetForm = document.getElementById('add-set-form');
    let currentUser = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            userName.textContent = user.displayName;
        } else {
            window.location.href = 'signin.html';
        }
    });

    logoutBtn.addEventListener('click', () => auth.signOut());

    addSetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const newSet = {
            title: document.getElementById('set-title').value,
            length: parseFloat(document.getElementById('set-length').value),
            tags: document.getElementById('set-tags').value.split(',').map(t => t.trim()).filter(Boolean),
            transcription: ""
        };
        db.collection('users').doc(currentUser.uid).collection('sets').add(newSet);
        addSetForm.reset();
        alert('Bit added! You can add the transcription on the "My Bits" page.');
    });
});