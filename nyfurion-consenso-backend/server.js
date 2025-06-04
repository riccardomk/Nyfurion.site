const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/consenso', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const { userAgent, policyVersion } = req.body;
    const timestamp = new Date().toISOString();
    const sessionId = req.body.sessionId || '';

    const record = {
        timestamp,
        ip,
        userAgent,
        policyVersion: policyVersion || '1.0',
        sessionId
    };

    fs.appendFile('consensi-log.json', JSON.stringify(record) + '\n', err => {
        if (err) {
            res.status(500).json({ ok: false, error: 'Errore salvataggio consenso' });
        } else {
            res.json({ ok: true });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Consenso backend in ascolto su http://localhost:${PORT}`);
});
