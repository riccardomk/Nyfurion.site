// leaderboard-server.js
// Backend semplice per leaderboard quiz Nyfurion
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3002;
const DB_FILE = './leaderboard.json';

app.use(cors());
app.use(express.json());

// Carica leaderboard da file
function loadLeaderboard() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
        return [];
    }
}
// Salva leaderboard su file
function saveLeaderboard(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ottieni classifica
app.get('/api/leaderboard', (req, res) => {
    res.json(loadLeaderboard());
});

// Aggiungi risultato
app.post('/api/leaderboard', (req, res) => {
    const { name, score, percent, quiz, date } = req.body;
    if (!name || typeof score !== 'number' || typeof percent !== 'number' || !quiz || !date) {
        return res.status(400).json({ error: 'Invalid data' });
    }
    const leaderboard = loadLeaderboard();
    leaderboard.push({ name, score, percent, quiz, date });
    // Tieni solo gli ultimi 100
    while (leaderboard.length > 100) leaderboard.shift();
    saveLeaderboard(leaderboard);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log('Leaderboard server running on port', PORT);
});
