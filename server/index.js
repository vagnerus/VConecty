const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

app.use(cors());
app.get('/', (req, res) => res.send('VConectY Signaling Server Running 🟢'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // JOIN ROOM (Host registers their ID)
    socket.on('join-host', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // CLIENT CONNECT (Client signals intent to connect to Host ID)
    socket.on('client-connect', (data) => {
        // data: { targetId, from }
        console.log(`Client ${data.from} connecting to Target ${data.targetId}`);
        socket.to(data.targetId).emit('incoming-connection', { from: data.from });
    });

    // WEBRTC SIGNALING (Forwarding based on 'target' ID)
    socket.on('offer', (data) => {
        // data: { target, sdp, from } - forward the sender's ID
        console.log(`Forwarding offer from ${data.from || socket.id} to ${data.target}`);
        socket.to(data.target).emit('offer', { sdp: data.sdp, from: data.from || socket.id });
    });

    socket.on('answer', (data) => {
        // data: { target, sdp, from }
        console.log(`Forwarding answer from ${data.from || socket.id} to ${data.target}`);
        socket.to(data.target).emit('answer', { sdp: data.sdp, from: data.from || socket.id });
    });

    socket.on('ice-candidate', (data) => {
        // data: { target, candidate }
        socket.to(data.target).emit('ice-candidate', { candidate: data.candidate });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`VConectY Server running on port ${PORT}`);
});
