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
        // The "scattered" secret numbers
        secret: [1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5)[i]
    }))
};

const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

let selectedBoxIndex = null;

const updateUI = () => {
    state.boxes.forEach((box, i) => {
        const element = document.getElementById(`box-${i}`);
        if (box.claimed) {
            element.classList.add('claimed');
            element.textContent = '✓'; // Number is hidden until user clicks their OWN claim
        } else {
            element.classList.remove('claimed');
            element.textContent = '?';
        }
    });
};

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
    if (confirm('Are you sure you want to reset all boxes? This will clear all claims.')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
};

document.getElementById('close-reveal-btn').onclick = () => {
    document.getElementById('reveal-modal').classList.remove('active');
    document.getElementById('username').value = '';
};

// Initial Render
updateUI();
