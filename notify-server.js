const express = require('express');
const fs = require('fs');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3001;
const SUBSCRIBERS_FILE = path.join(__dirname, 'subscribers.json');
const ADMIN_PASSWORD = 'nyfurion2024'; // Cambia questa password!

app.use(bodyParser.json());
app.use(express.static(__dirname));

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
        return res.status(400).json({ ok: false, error: 'Invalid email' });
    }
    let list = loadSubscribers();
    if (!list.includes(email)) {
        list.push(email);
        saveSubscribers(list);
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

app.listen(PORT, () => {
    console.log(`Notify server running on http://localhost:${PORT}`);
});
