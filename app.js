// Mock Firebase configuration for demonstration
// The agent will use local storage to simulate persistence for this Fast-mode session
// unless the user adds the Firebase integration secrets later.

const STORAGE_KEY = 'contribution_app_state';

// Initialize or load state
let state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    boxes: Array(6).fill(null).map((_, i) => ({
        id: i,
        claimed: false,
        name: null,
        secret: [1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5)[i]
    }))
};

let isAdminAuthenticated = false;
let isEditMode = false;

const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

let selectedBoxIndex = null;

const updateUI = () => {
    const grid = document.getElementById('grid');
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

window.toggleAdminMode = () => {
    if (!isAdminAuthenticated) {
        const pass = prompt('Enter admin password:');
        if (pass === 'Jume4real') {
            isAdminAuthenticated = true;
        } else {
            return alert('Incorrect password');
        }
    }
    
    isEditMode = !isEditMode;
    document.getElementById('admin-mode-btn').textContent = isEditMode ? 'Save & Exit Edit Mode' : 'Enter Edit Mode';
    document.getElementById('admin-status').textContent = isEditMode ? 'Edit Mode Active: Drag boxes to reorder or use buttons below.' : '';
    updateUI();
};

window.shuffleBoxes = () => {
    if (!isAdminAuthenticated) return alert('Auth required');
    const secrets = state.boxes.map(b => b.secret).sort(() => Math.random() - 0.5);
    state.boxes.forEach((box, i) => {
        box.secret = secrets[i];
    });
    saveState();
    updateUI();
    alert('Numbers shuffled!');
};

window.addBox = () => {
    if (!isAdminAuthenticated) return alert('Auth required');
    const nextNum = state.boxes.length + 1;
    state.boxes.push({
        id: Date.now(),
        claimed: false,
        name: null,
        secret: nextNum
    });
    saveState();
    updateUI();
};

window.removeBox = (index, event) => {
    event.stopPropagation();
    if (!isAdminAuthenticated) return alert('Auth required');
    state.boxes.splice(index, 1);
    saveState();
    updateUI();
};

// Drag and Drop Logic
let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(this.id.split('-')[1]);
    this.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const targetIndex = parseInt(this.id.split('-')[1]);
    if (draggedIndex !== targetIndex) {
        const item = state.boxes.splice(draggedIndex, 1)[0];
        state.boxes.splice(targetIndex, 0, item);
        saveState();
        updateUI();
    }
}

function handleDragEnd() {
    this.classList.remove('dragging');
}

window.handleBoxClick = (index) => {
    if (state.boxes[index].claimed) return;
    selectedBoxIndex = index;
    document.getElementById('modal').classList.add('active');
};

document.getElementById('cancel-btn').onclick = () => {
    document.getElementById('modal').classList.remove('active');
};

document.getElementById('confirm-btn').onclick = () => {
    const name = document.getElementById('username').value.trim();
    if (!name) return alert('Please enter your name');

    const box = state.boxes[selectedBoxIndex];
    box.claimed = true;
    box.name = name;
    saveState();

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
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
        }
    } else if (password !== null) {
        alert('Incorrect password.');
    }
};

document.getElementById('close-reveal-btn').onclick = () => {
    document.getElementById('reveal-modal').classList.remove('active');
    document.getElementById('username').value = '';
};

// Initial Render
updateUI();
