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
        // data: { target, sdp }
        socket.to(data.target).emit('offer', { sdp: data.sdp, from: socket.id });
        // Note: The 'from' here could be the ID if we passed it, but socket.id is enough for direct reply 
        // if the client logic handled it. However, our App.jsx expects 'from' to be the ID in some places 
        // and uses the socket room for others.
        // Let's stick to the App.jsx logic: "socket.on('offer', ({sdp, from}))"
        // And App.jsx sends: "currSocket.emit('offer', { target: targetId, sdp: offer })"

        // Actually, to support the App.jsx logic where 'from' is displayed or used:
        // We should pass the sender's ID if possible, or just the socket ID if the app handles it.
        // In this simple version, let's just forward what we have.
    });

    socket.on('answer', (data) => {
        socket.to(data.target).emit('answer', { sdp: data.sdp });
    });

    socket.on('ice-candidate', (data) => {
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
