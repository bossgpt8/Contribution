// Fetch configuration from Vercel Serverless Function
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to load config:', error);
        // Fallback directly to the config if API fails or isn't deployed yet
        return {
            config: {
                apiKey: "YOUR_ACTUAL_API_KEY",
                authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
                projectId: "YOUR_PROJECT_ID",
                storageBucket: "YOUR_PROJECT_ID.appspot.com",
                messagingSenderId: "YOUR_SENDER_ID",
                appId: "YOUR_APP_ID"
            },
            adminPassword: "Jume4real"
        };
    }
}

const remoteConfig = await loadConfig();
const firebaseConfig = remoteConfig.config;
const ADMIN_PASSWORD_REMOTE = remoteConfig.adminPassword;

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const STORAGE_KEY = 'contribution_app_state';
const DOC_REF = doc(db, "app", "state");

let state = {
    boxes: []
};

let isAdminAuthenticated = false;
let isEditMode = false;
let selectedBoxIndex = null;

// Initial Setup/Sync
const initSync = async () => {
    const docSnap = await getDoc(DOC_REF);
    if (!docSnap.exists()) {
        // Initial state if Firestore is empty
        const initialState = {
            boxes: Array(6).fill(null).map((_, i) => ({
                id: Date.now() + i,
                claimed: false,
                name: null,
                secret: [1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5)[i]
            }))
        };
        await setDoc(DOC_REF, initialState);
    }
    
    // Listen for real-time updates
    onSnapshot(DOC_REF, (doc) => {
        if (doc.exists()) {
            state = doc.data();
            updateUI();
        }
    });
};

const saveState = async () => {
    await setDoc(DOC_REF, state);
};

const updateUI = () => {
    const grid = document.getElementById('grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    state.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = `box ${box.claimed ? 'claimed' : ''} ${isEditMode ? 'edit-mode' : ''}`;
        div.id = `box-${i}`;
        div.draggable = isEditMode;
        div.textContent = box.claimed ? '✓' : '?';
        
        if (isEditMode) {
            const removeBtn = document.createElement('div');
            removeBtn.className = 'box-actions';
            removeBtn.innerHTML = `<button class="remove-box-btn" onclick="removeBox(${i}, event)">×</button>`;
            div.appendChild(removeBtn);
            
            div.addEventListener('dragstart', handleDragStart);
            div.addEventListener('dragover', handleDragOver);
            div.addEventListener('drop', handleDrop);
            div.addEventListener('dragend', handleDragEnd);
        } else {
            div.onclick = () => handleBoxClick(i);
        }
        
        grid.appendChild(div);
    });
};

// Listen for Auth changes
onAuthStateChanged(auth, (user) => {
    isAdminAuthenticated = !!user;
    if (isAdminAuthenticated) {
        document.getElementById('admin-mode-btn').textContent = isEditMode ? 'Save & Exit Edit Mode' : 'Enter Admin Panel';
    } else {
        isEditMode = false;
        document.getElementById('admin-mode-btn').textContent = 'Admin Login';
        updateUI();
    }
});

window.toggleAdminMode = async () => {
    if (!isAdminAuthenticated) {
        const email = prompt('Enter admin email:');
        const pass = prompt('Enter admin password:');
        const correctPass = ADMIN_PASSWORD_REMOTE || 'Jume4real';
        
        // Validate password locally first if you prefer, or rely on Firebase Auth
        if (pass !== correctPass) {
            return alert('Incorrect admin password');
        }

        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
        return;
    }
    
    isEditMode = !isEditMode;
    document.getElementById('admin-mode-btn').textContent = isEditMode ? 'Save & Exit Edit Mode' : 'Enter Admin Panel';
    document.getElementById('admin-status').textContent = isEditMode ? 'Edit Mode Active: Drag boxes to reorder or use buttons below.' : '';
    updateUI();
};

window.shuffleBoxes = async () => {
    if (!isAdminAuthenticated) return alert('Auth required');
    const secrets = state.boxes.map(b => b.secret).sort(() => Math.random() - 0.5);
    state.boxes.forEach((box, i) => {
        box.secret = secrets[i];
    });
    await saveState();
    alert('Numbers shuffled!');
};

window.addBox = async () => {
    if (!isAdminAuthenticated) return alert('Auth required');
    const nextNum = state.boxes.length + 1;
    state.boxes.push({
        id: Date.now(),
        claimed: false,
        name: null,
        secret: nextNum
    });
    await saveState();
};

window.removeBox = async (index, event) => {
    event.stopPropagation();
    if (!isAdminAuthenticated) return alert('Auth required');
    state.boxes.splice(index, 1);
    await saveState();
};

// Drag and Drop Logic
let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(this.id.split('-')[1]);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedIndex);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

async function handleDrop(e) {
    e.preventDefault();
    const targetIndex = parseInt(this.id.split('-')[1]);
    if (draggedIndex !== targetIndex) {
        const item = state.boxes.splice(draggedIndex, 1)[0];
        state.boxes.splice(targetIndex, 0, item);
        await saveState();
    }
}

function handleDragEnd() {
    this.classList.remove('dragging');
}

window.handleBoxClick = (index) => {
    // Ensure state and boxes are loaded
    if (!state || !state.boxes || !state.boxes[index]) {
        return;
    }
    
    // Check if this device has already picked a box
    if (localStorage.getItem('has_picked_contribution')) {
        return alert('You have already picked a contribution number!');
    }
    
    if (state.boxes[index].claimed) return;
    selectedBoxIndex = index;
    document.getElementById('modal').classList.add('active');
};

document.getElementById('cancel-btn').onclick = () => {
    document.getElementById('modal').classList.remove('active');
};

document.getElementById('confirm-btn').onclick = async () => {
    const name = document.getElementById('username').value.trim();
    if (!name) return alert('Please enter your name');

    const box = state.boxes[selectedBoxIndex];
    box.claimed = true;
    box.name = name;
    await saveState();

    // Mark this device as having picked
    localStorage.setItem('has_picked_contribution', 'true');

    document.getElementById('modal').classList.remove('active');
    
    document.getElementById('result-number').textContent = box.secret;
    document.getElementById('reveal-modal').classList.add('active');
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

document.getElementById('reset-btn').onclick = async () => {
    if (!isAdminAuthenticated) return alert('Auth required');
    const password = prompt('Enter admin password to reset all boxes:');
    const correctPass = ADMIN_PASSWORD_REMOTE || 'Jume4real';
    if (password === correctPass) {
        if (confirm('Are you sure you want to reset all boxes?')) {
         state.boxes.forEach(b => {
            b.claimed = false;
            b.name = null;
         });
         await saveState();
         // Also clear the "has picked" flag for all devices (local)
         localStorage.removeItem('has_picked_contribution');
         location.reload();
    }
};

document.getElementById('close-reveal-btn').onclick = () => {
    document.getElementById('reveal-modal').classList.remove('active');
    document.getElementById('username').value = '';
};

initSync();
