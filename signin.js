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
    const auth = firebase.auth();
    // --- END FIREBASE SETUP ---

    const loginBtn = document.getElementById('login-btn');

    // If the user is already logged in, redirect them to the main app
    auth.onAuthStateChanged(user => {
        if (user) {
            window.location.href = 'index.html';
        }
    });

    // Handle the login button click
    loginBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            console.error("Login failed:", error);
            alert("Login failed. Please try again. Make sure pop-ups are enabled for this site.");
        });
    });
});