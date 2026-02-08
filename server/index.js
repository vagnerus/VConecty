/**
 * VConectY - Servidor de Sinalização
 * Desenvolvido por: 100% Vagner Oliveira ~ FlasH
 * Copyright (c) 2026
 */
const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');

app.use(cors());

// Serve static files from 'public' directory (Frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for SPA routing (if user reloads on /session)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// app.get('/', (req, res) => res.send('VConectY Signaling Server Running 🟢'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store active hosts
const hosts = new Map();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // JOIN ROOM (Host registers their ID)
    socket.on('join-host', (roomId) => {
        socket.join(roomId);
        hosts.set(roomId, socket); // Store the host's socket
        console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // CLIENT CONNECT (Client signals intent to connect to Host ID)
    socket.on('client-connect', ({ targetId, from, password }) => {
        console.log(`[SERVER] Client ${from} requesting connection to ${targetId} with password:`, password ? 'YES' : 'NO');
        const targetSocket = hosts.get(targetId);
        if (targetSocket) {
            console.log(`[SERVER] Forwarding request to host ${targetId}`);
            targetSocket.emit('incoming-connection', { from, password });
        } else {
            console.log(`[SERVER] Host ${targetId} not found`);
        }
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
