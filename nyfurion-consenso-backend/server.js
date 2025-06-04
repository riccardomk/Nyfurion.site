const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Cartella log protetta nella root del progetto
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'consensi-log.json');

// Crea la cartella log se non esiste
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Utility: maschera IP (privacy by design, opzionale)
function maskIp(ip) {
    if (!ip) return '';
    // IPv4: 1.2.3.4 -> 1.2.3.0
    // IPv6: abcd:... -> abcd:...:0000
    if (ip.includes('.')) {
        return ip.split('.').slice(0, 3).join('.') + '.0';
    }
    if (ip.includes(':')) {
        return ip.split(':').slice(0, 3).join(':') + ':0000';
    }
    return ip;
}

app.post('/api/consenso', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const { userAgent, policyVersion } = req.body;
    const timestamp = new Date().toISOString();
    const sessionId = req.body.sessionId || '';

    const record = {
        timestamp,
        ip: maskIp(ip), // Maschera IP per privacy
        userAgent,
        policyVersion: policyVersion || '1.0',
        sessionId
    };

    // Rotazione log base: se > 5MB rinomina il file
    try {
        if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 5 * 1024 * 1024) {
            const backupName = LOG_FILE.replace('.json', `-${Date.now()}.json`);
            fs.renameSync(LOG_FILE, backupName);
        }
    } catch (e) {
        // Ignora errori di rotazione
    }

    fs.appendFile(LOG_FILE, JSON.stringify(record) + '\n', err => {
        if (err) {
            res.status(500).json({ ok: false, error: 'Errore salvataggio consenso' });
        } else {
            res.json({ ok: true });
        }
    });
});

// Endpoint audit locale (solo da localhost): visualizza tutti i consensi
app.get('/api/consensi', (req, res) => {
    const remote = req.socket.remoteAddress;
    if (remote !== '::1' && remote !== '127.0.0.1' && remote !== '::ffff:127.0.0.1') {
        return res.status(403).json({ error: 'Accesso negato' });
    }
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Errore lettura log' });
        const lines = data.trim().split('\n').filter(Boolean);
        const records = lines.map(l => {
            try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean);
        res.json(records);
    });
});

// Endpoint per cancellare un consenso (GDPR: diritto all'oblio, solo da localhost)
// Richiede: timestamp e sessionId (o altro identificativo)
app.post('/api/consenso/delete', (req, res) => {
    const remote = req.socket.remoteAddress;
    if (remote !== '::1' && remote !== '127.0.0.1' && remote !== '::ffff:127.0.0.1') {
        return res.status(403).json({ error: 'Accesso negato' });
    }
    const { timestamp, sessionId } = req.body;
    if (!timestamp || !sessionId) {
        return res.status(400).json({ error: 'Dati insufficienti' });
    }
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Errore lettura log' });
        const lines = data.trim().split('\n').filter(Boolean);
        const filtered = lines.filter(l => {
            try {
                const rec = JSON.parse(l);
                return !(rec.timestamp === timestamp && rec.sessionId === sessionId);
            } catch {
                return true;
            }
        });
        fs.writeFile(LOG_FILE, filtered.join('\n') + '\n', err2 => {
            if (err2) return res.status(500).json({ error: 'Errore scrittura log' });
            res.json({ ok: true, deleted: true });
        });
    });
});

// Endpoint per esportare tutti i consensi (CSV, solo da localhost)
app.get('/api/consensi/export', (req, res) => {
    const remote = req.socket.remoteAddress;
    if (remote !== '::1' && remote !== '127.0.0.1' && remote !== '::ffff:127.0.0.1') {
        return res.status(403).json({ error: 'Accesso negato' });
    }
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Errore lettura log' });
        const lines = data.trim().split('\n').filter(Boolean);
        const records = lines.map(l => {
            try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean);
        let csv = 'timestamp,ip,userAgent,policyVersion,sessionId\n';
        records.forEach(r => {
            csv += `"${r.timestamp}","${r.ip}","${r.userAgent.replace(/"/g, "'")}","${r.policyVersion}","${r.sessionId}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="consensi.csv"');
        res.send(csv);
    });
});

app.listen(PORT, () => {
    console.log(`Consenso backend in ascolto su http://localhost:${PORT}`);
});
