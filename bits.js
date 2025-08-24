// ... (Firebase setup and other functions are unchanged)

// Only showing the changed event listener
setListContainer.addEventListener('click', (e) => {
    if (!currentUser) return;
    const target = e.target;
    const setItem = target.closest('.set-item');
    if (!setItem) return;
    const docId = setItem.getAttribute('data-id');
    const userSetsCollection = db.collection('users').doc(currentUser.uid).collection('sets');

    // THIS IS THE UPDATED PART
    if (target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this bit?')) {
            userSetsCollection.doc(docId).delete();
        }
    }
    // ... (rest of the click handlers are unchanged)
});

// ... (The rest of the file is unchanged)
