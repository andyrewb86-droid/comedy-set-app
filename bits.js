document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = { /* PASTE YOUR CONFIG HERE */ };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

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
        db.collection('users').doc(userId).collection('sets').orderBy('title').onSnapshot(snapshot => {
            comedySets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterAndRender();
        });
    }
    
    // Paste the full renderSets, filterAndRender, and setListContainer listener functions from our last version here.
});