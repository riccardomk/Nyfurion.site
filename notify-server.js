const express = require('express');
const fs = require('fs');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');
const ADMIN_PASSWORD = 'nyfurion2024'; // Cambia questa password!
const upload = multer({ dest: path.join(__dirname, 'uploads') });
const MSG_FILE = path.join(__dirname, 'messages.json');

app.use(bodyParser.json());
app.use(express.static(__dirname));
if (!fs.existsSync(MSG_FILE)) fs.writeFileSync(MSG_FILE, '[]');

// Utility: carica e salva email
function loadSubscribers() {
    if (!fs.existsSync(SUBSCRIBERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
    } catch {
        return [];
    }
}
function saveSubscribers(list) {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(list, null, 2));
}

// API: iscrizione
app.post('/api/subscribe', (req, res) => {
    const { email } = req.body;
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
        console.log('Iscrizione fallita: email non valida:', email);
        return res.status(400).json({ ok: false, error: 'Invalid email' });
    }
    let list = loadSubscribers();
    if (!list.includes(email)) {
        list.push(email);
        try {
            saveSubscribers(list);
            console.log('Nuova iscrizione:', email);
        } catch (e) {
            console.error('Errore salvataggio file:', e);
            return res.status(500).json({ ok: false, error: 'File write error' });
        }
    } else {
        console.log('Email già iscritta:', email);
    }
    res.json({ ok: true });
});

// API: invio notifica (admin)
app.post('/api/notify-all', async (req, res) => {
    const { password, subject, message } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(403).json({ ok: false, error: 'Forbidden' });
    let list = loadSubscribers();
    if (!list.length) return res.json({ ok: false, error: 'No subscribers' });

    // Configura qui il tuo SMTP (esempio con Gmail)
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'YOUR_GMAIL@gmail.com',
            pass: 'YOUR_APP_PASSWORD'
        }
    });

    let errors = [];
    for (let email of list) {
        try {
            await transporter.sendMail({
                from: '"Nyfurion Club" <YOUR_GMAIL@gmail.com>',
                to: email,
                subject: subject || 'Nyfurion Club is now available!',
                text: message || 'The Club Prime area is now open! Visit us now!'
            });
        } catch (e) {
            errors.push(email);
        }
    }
    res.json({ ok: true, sent: list.length - errors.length, errors });
});

// Serve la pagina admin
app.get('/admin-notify', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-notify.html'));
});

// --- INIZIO CHAT COMMUNITY NYFURION (MESSAGGI + FILE) ---
app.get('/messages', (req, res) => {
    const category = req.query.category || 'General';
    const msgs = JSON.parse(fs.readFileSync(MSG_FILE));
    const filtered = msgs.filter(m => (m.category || 'General') === category);
    res.json(filtered.slice(-50));
});

app.post('/messages', upload.single('file'), (req, res) => {
    const text = req.body.text || '';
    let fileUrl = null, fileName = null;
    if (req.file) {
        fileUrl = '/uploads/' + req.file.filename;
        fileName = req.file.originalname;
    }
    if (!text && !fileUrl) return res.status(400).end();
    const msgs = JSON.parse(fs.readFileSync(MSG_FILE));
    const now = new Date();
    msgs.push({
        id: uuidv4(),
        text,
        fileUrl,
        fileName,
        time: now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        me: false,
        wallet: req.body.wallet || null,
        avatar: req.body.avatar || null,
        category: req.body.category || 'General'
    });
    fs.writeFileSync(MSG_FILE, JSON.stringify(msgs));
    res.json({ ok: true });
});

// Cancella un messaggio
app.delete('/messages/:id', (req, res) => {
    const id = req.params.id;
    let msgs = JSON.parse(fs.readFileSync(MSG_FILE));
    const initialLength = msgs.length;
    msgs = msgs.filter(m => m.id !== id);
    fs.writeFileSync(MSG_FILE, JSON.stringify(msgs));
    res.json({ ok: msgs.length < initialLength });
});

// Modifica un messaggio
app.put('/messages/:id', (req, res) => {
    const id = req.params.id;
    const { text } = req.body;
    let msgs = JSON.parse(fs.readFileSync(MSG_FILE));
    let found = false;
    msgs = msgs.map(m => {
        if (m.id === id) {
            found = true;
            return { ...m, text };
        }
        return m;
    });
    fs.writeFileSync(MSG_FILE, JSON.stringify(msgs));
    res.json({ ok: found });
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// --- FINE CHAT COMMUNITY NYFURION ---

app.listen(PORT, () => {
    console.log(`Notify server running on http://localhost:${PORT}`);
});
