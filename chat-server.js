// chat-server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-memory chat messages (for demo)
let messages = [];

// REST endpoint to get all messages (opzionale)
app.get('/messages', (req, res) => {
  res.json(messages);
});

// WebSocket events
io.on('connection', (socket) => {
  // Invia tutti i messaggi all'utente appena connesso
  socket.emit('chat-history', messages);

  // Ricevi nuovo messaggio
  socket.on('new-message', (msg) => {
    messages.push(msg);
    // Invia a tutti i client
    io.emit('new-message', msg);
  });

  // Ricevi richiesta di cancellazione messaggio
  socket.on('delete-message', (msgIndex) => {
    if (typeof msgIndex === 'number' && msgIndex >= 0 && msgIndex < messages.length) {
      messages.splice(msgIndex, 1);
      io.emit('delete-message', msgIndex);
    }
  });

  // Ricevi richiesta di modifica messaggio
  socket.on('edit-message', ({ index, newText }) => {
    if (typeof index === 'number' && index >= 0 && index < messages.length && typeof newText === 'string') {
      messages[index].text = newText;
      io.emit('edit-message', { index, newText });
    }
  });

  // Ricevi richiesta di reazione
  socket.on('react-message', ({ index, reaction }) => {
    if (typeof index === 'number' && index >= 0 && index < messages.length && typeof reaction === 'string') {
      if (!messages[index].reactions) messages[index].reactions = [];
      messages[index].reactions.push(reaction);
      io.emit('react-message', { index, reaction });
    }
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Chat server in ascolto su http://localhost:${PORT}`);
});
