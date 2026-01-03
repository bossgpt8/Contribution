// Firebase Configuration
const firebaseConfig = window.firebaseConfig;

// Use window globals set in index.html
const app = window.firebaseApp;
const auth = window.firebaseAuth;
const { onAuthStateChanged, signInAnonymously } = window.firebaseAuthUtils;
const { getFirestore, collection, doc, onSnapshot, updateDoc, setDoc, getDoc, getDocs, deleteDoc } = window.firebaseFirestore;

const db = getFirestore(app);
const numbersCollection = collection(db, "numbers");

let currentUser = null;
let state = {
    boxes: []
};

let isAdminAuthenticated = false;
let isEditMode = false;

// Authenticate user anonymously to have a unique ID
signInAnonymously(auth).catch((error) => {
    console.error("Auth error:", error);
    showAlert("Authentication failed. Please check if Anonymous Auth is enabled in Firebase Console.");
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log("Authenticated as:", user.uid);
    }
});

// Initialize boxes if not already loaded from Firestore
const initLocalState = (count = 6) => {
    state.boxes = Array(count).fill(null).map((_, i) => ({
        id: i.toString(),
        claimed: false,
        name: null,
        secret: i + 1
    }));
};

// Listen to the "numbers" collection for changes
onSnapshot(numbersCollection, (querySnapshot) => {
    if (querySnapshot.empty) {
        // If collection is empty, create initial docs (only once)
        initLocalState();
        state.boxes.forEach(async (box) => {
            await setDoc(doc(db, "numbers", box.id), box);
        });
    } else {
        const newBoxes = [];
        querySnapshot.forEach((doc) => {
            newBoxes.push(doc.data());
        });
        // Sort by id or a consistent key to keep grid order
        state.boxes = newBoxes.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        updateUI();
    }
}, (error) => {
    console.error("Firestore error:", error);
    if (error.code === 'permission-denied') {
        showAlert('Security Error: Please check your Firestore rules in the Firebase console.');
    }
});

const saveBoxState = async (box) => {
    try {
        await setDoc(doc(db, "numbers", box.id.toString()), box);
    } catch (e) {
        console.error("Error updating Firestore:", e);
        showAlert('Error saving: ' + e.message);
    }
};

const saveAllState = async () => {
    try {
        // Save each box individually to ensure collection is sync'd
        const promises = state.boxes.map(box => setDoc(doc(db, "numbers", box.id.toString()), box));
        await Promise.all(promises);
    } catch (e) {
        console.error("Error saving all boxes:", e);
    }
};

let selectedBoxIndex = null;

const updateUI = () => {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    
    state.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = `box ${box.claimed ? 'claimed' : ''} ${isEditMode ? 'edit-mode' : ''}`;
        div.id = `box-${i}`;
        div.draggable = isEditMode;
        
        if (isEditMode) {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'edit-number-input';
            input.value = box.secret;
            input.onclick = (e) => e.stopPropagation();
            input.onchange = (e) => {
                box.secret = parseInt(e.target.value) || 0;
                saveBoxState(box);
            };
            div.appendChild(input);

            // Add back the delete button
            const removeBtn = document.createElement('div');
            removeBtn.className = 'box-actions';
            removeBtn.innerHTML = `<button class="remove-box-btn" onclick="removeBox(${i}, event)">×</button>`;
            div.appendChild(removeBtn);

            div.addEventListener('dragstart', handleDragStart);
            div.addEventListener('dragover', handleDragOver);
            div.addEventListener('drop', handleDrop);
            div.addEventListener('dragend', handleDragEnd);
        } else {
            div.textContent = box.claimed ? '✓' : 'Click to Reveal';
            div.onclick = () => handleBoxClick(i);
        }
        
        grid.appendChild(div);
    });
};

const showAlert = (message) => {
    const alertModal = document.getElementById('custom-alert');
    const alertMsg = document.getElementById('custom-alert-message');
    alertMsg.textContent = message;
    alertModal.classList.add('active');
};

document.getElementById('custom-alert-close').onclick = () => {
    document.getElementById('custom-alert').classList.remove('active');
};

window.toggleAdminMode = () => {
    if (!isAdminAuthenticated) {
        const pass = prompt('Enter admin password:');
        if (pass === 'Jume4real') {
            isAdminAuthenticated = true;
        } else {
            showAlert('Incorrect password. Please try again.');
            return;
        }
    }
    
    isEditMode = !isEditMode;
    document.getElementById('admin-mode-btn').textContent = isEditMode ? 'Save & Exit Edit Mode' : 'Enter Edit Mode';
    document.getElementById('admin-status').textContent = isEditMode ? 'Edit Mode Active: Drag boxes to reorder or use buttons below.' : '';
    updateUI();
};

window.shuffleBoxes = () => {
    if (!isAdminAuthenticated) return showAlert('Authentication required.');
    
    // Create a unique list of numbers from 1 to the current number of boxes
    const count = state.boxes.length;
    const uniqueNumbers = Array.from({length: count}, (_, i) => i + 1)
        .sort(() => Math.random() - 0.5);
    
    state.boxes.forEach((box, i) => {
        box.secret = uniqueNumbers[i];
    });
    
    saveAllState();
    updateUI();
    showAlert('Numbers shuffled and duplicates removed!');
};

window.addBox = () => {
    if (!isAdminAuthenticated) return alert('Auth required');
    const nextNum = state.boxes.length + 1;
    state.boxes.push({
        id: Date.now().toString(),
        claimed: false,
        name: null,
        secret: nextNum
    });
    saveBoxState(state.boxes[state.boxes.length - 1]);
    updateUI();
};

window.removeBox = async (index, event) => {
    event.stopPropagation();
    if (!isAdminAuthenticated) return alert('Auth required');
    const removedBox = state.boxes.splice(index, 1)[0];
    
    // Delete the specific document from Firestore
    try {
        const { deleteDoc, doc } = window.firebaseFirestore;
        await deleteDoc(doc(db, "numbers", removedBox.id.toString()));
        updateUI();
    } catch (e) {
        console.error("Error deleting box:", e);
        // Fallback to resaving all if delete fails
        await saveAllState();
        updateUI();
    }
};

// Drag and Drop Logic
let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(this.id.split('-')[1]);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    e.dataTransfer.setData('text/plain', draggedIndex);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    const targetIndex = parseInt(this.id.split('-')[1]);
    if (draggedIndex !== targetIndex) {
        // Swap the two boxes
        const temp = state.boxes[draggedIndex];
        state.boxes[draggedIndex] = state.boxes[targetIndex];
        state.boxes[targetIndex] = temp;
        
        saveAllState();
        updateUI();
    }
}

function handleDragEnd() {
    this.classList.remove('dragging');
}

window.handleBoxClick = (index) => {
    if (!currentUser) {
        showAlert('Please wait a moment while we secure your session...');
        return;
    }
    
    // Check if user already claimed a box
    const alreadyClaimed = state.boxes.find(b => b.userId === currentUser.uid);
    if (alreadyClaimed) {
        selectedBoxIndex = state.boxes.indexOf(alreadyClaimed);
        document.getElementById('result-number').textContent = alreadyClaimed.secret;
        document.getElementById('reveal-modal').classList.add('active');
        return;
    }

    if (state.boxes[index].claimed) {
        showAlert('This box has already been claimed! Please select another available box.');
        return;
    }
    selectedBoxIndex = index;
    document.getElementById('modal').classList.add('active');
};

document.getElementById('cancel-btn').onclick = () => {
    document.getElementById('modal').classList.remove('active');
};

document.getElementById('confirm-btn').onclick = () => {
    const name = document.getElementById('username').value.trim();
    if (!name) {
        showAlert('Please enter your name to proceed.');
        return;
    }

    const box = state.boxes[selectedBoxIndex];
    box.claimed = true;
    box.name = name;
    box.userId = currentUser.uid; // Tie box to user
    saveBoxState(box);

    document.getElementById('modal').classList.remove('active');
    
    // Show reveal
    document.getElementById('result-number').textContent = box.secret;
    document.getElementById('reveal-modal').classList.add('active');
    
    updateUI();
};

document.getElementById('share-wa-btn').onclick = () => {
    const box = state.boxes[selectedBoxIndex];
    const text = `Hi, I picked my contribution number! My number is ${box.secret}. (Claimed by ${box.name})`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
};

document.getElementById('copy-btn').onclick = () => {
    const box = state.boxes[selectedBoxIndex];
    const text = `Hi, I picked my contribution number! My number is ${box.secret}. (Claimed by ${box.name})`;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = originalText, 2000);
    });
};

document.getElementById('reset-btn').onclick = () => {
    const password = prompt('Enter admin password to reset all boxes:');
    if (password === 'Jume4real') { // Simple password protection
        if (confirm('Are you sure you want to reset all boxes? This will clear all claims.')) {
            // Re-initialize local state and save all to Firestore
            initLocalState();
            saveAllState();
        }
    } else if (password !== null) {
        showAlert('Incorrect password.');
    }
};

document.getElementById('close-reveal-btn').onclick = () => {
    document.getElementById('reveal-modal').classList.remove('active');
    document.getElementById('username').value = '';
};

// Initial Render
updateUI();
