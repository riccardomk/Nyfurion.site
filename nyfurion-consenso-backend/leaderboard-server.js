const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;
const DATA_FILE = path.join(__dirname, 'leaderboard.json');

app.use(cors());
app.use(express.json());

// Carica la leaderboard dal file
function loadLeaderboard() {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
        return [];
    }
}

// Salva la leaderboard su file
function saveLeaderboard(list) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(list.slice(0, 50), null, 2));
}

// API: restituisce la leaderboard
app.get('/api/leaderboard', (req, res) => {
    res.json(loadLeaderboard());
});

// API: aggiunge un nuovo punteggio
app.post('/api/leaderboard', (req, res) => {
    const { name, score, percent, quiz, date } = req.body;
    if (!name || typeof score !== 'number') {
        return res.status(400).json({ ok: false, error: 'Dati insufficienti' });
    }
    let leaderboard = loadLeaderboard();
    leaderboard.push({ name, score, percent, quiz, date });
    leaderboard = leaderboard.sort((a, b) => b.score - a.score).slice(0, 50);
    saveLeaderboard(leaderboard);
    res.json({ ok: true });
});

// API compatibile con submit-score (opzionale, per retrocompatibilità)
app.post('/api/submit-score', (req, res) => {
    const { score } = req.body;
    const name = req.body.name || req.body.address || 'Anonymous';
    if (!name || typeof score !== 'number') {
        return res.status(400).json({ ok: false, error: 'Dati insufficienti' });
    }
    let leaderboard = loadLeaderboard();
    leaderboard.push({ name, score, date: new Date().toISOString() });
    leaderboard = leaderboard.sort((a, b) => b.score - a.score).slice(0, 50);
    saveLeaderboard(leaderboard);
    res.json({ ok: true });
});

app.listen(PORT, () => {
    console.log(`Leaderboard server running on port ${PORT}`);
});
