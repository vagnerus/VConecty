/**
 * VConectY - Servidor de Sinalização (Vercel Serverless Ready)
 * Desenvolvido por: 100% Vagner Oliveira ~ FlasH
 * Copyright (c) 2026
 */
require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const { createAdapter } = require("@socket.io/redis-adapter");
const { Redis } = require("ioredis");
const killswitchRoutes = require('./routes/killswitch');

app.use(cors());
app.use(express.json()); // Para receber analytics

// Configuração Redis (Obrigatório para Vercel/Serverless)
const REDIS_URL = process.env.REDIS_URL; // Ex: redis://:password@host:port
let pubClient, subClient;

if (REDIS_URL) {
    console.log('[REDIS] Connecting to Redis...');
    try {
        pubClient = new Redis(REDIS_URL);
        subClient = pubClient.duplicate();

        pubClient.on('error', (err) => console.error('[REDIS PUB ERROR]', err));
        subClient.on('error', (err) => console.error('[REDIS SUB ERROR]', err));
    } catch (e) {
        console.error('[REDIS] Failed to initialize clients:', e);
    }
} else {
    console.warn('[REDIS] WARNING: REDIS_URL not set. Server will use in-memory state (NOT SCALABLE ON VERCEL).');
}

// Helper para gerenciar Hosts (Abstração para Memória ou Redis)
const hostsManager = {
    // Definir Host
    set: async (id, socketId) => {
        if (pubClient) {
            await pubClient.set(`host:${id}`, socketId, 'EX', 86400); // Expira em 24h
        } else {
            // Fallback memória (local dev)
            if (!global.localHosts) global.localHosts = new Map();
            global.localHosts.set(id, socketId);
        }
    },
    // Obter Host
    get: async (id) => {
        if (pubClient) {
            return await pubClient.get(`host:${id}`);
        } else {
            if (!global.localHosts) return null;
            return global.localHosts.get(id);
        }
    },
    // Remover Host
    del: async (id) => {
        if (pubClient) {
            await pubClient.del(`host:${id}`);
        } else {
            if (global.localHosts) global.localHosts.delete(id);
        }
    }
};

// Kill Switch Routes
app.use('/killswitch', killswitchRoutes);

// Analytics storage (em produção, usar banco de dados)
const analytics = {
    downloads: [],
    stats: {
        totalDownloads: 0,
        successfulUpdates: 0,
        failedUpdates: 0
    }
};

// Endpoint de analytics - rastrear downloads
app.post('/analytics/download', (req, res) => {
    const { currentVersion, targetVersion, os, timestamp } = req.body;

    analytics.downloads.push({
        currentVersion,
        targetVersion,
        os,
        timestamp: timestamp || new Date().toISOString()
    });

    analytics.stats.totalDownloads++;

    console.log(`[ANALYTICS] Download tracked: ${currentVersion} → ${targetVersion} (${os})`);
    res.json({ success: true });
});

// Endpoint de analytics - rastrear resultado
app.post('/analytics/result', (req, res) => {
    const { version, status } = req.body;

    if (status === 'success') {
        analytics.stats.successfulUpdates++;
    } else {
        analytics.stats.failedUpdates++;
    }

    console.log(`[ANALYTICS] Update result: ${version} - ${status}`);
    res.json({ success: true });
});

// Endpoint para obter estatísticas (para dashboard)
app.get('/analytics/stats', (req, res) => {
    const versionDistribution = {};

    analytics.downloads.forEach(d => {
        versionDistribution[d.currentVersion] = (versionDistribution[d.currentVersion] || 0) + 1;
    });

    res.json({
        ...analytics.stats,
        successRate: analytics.stats.totalDownloads > 0
            ? ((analytics.stats.successfulUpdates / analytics.stats.totalDownloads) * 100).toFixed(1)
            : 0,
        versionDistribution,
        recentDownloads: analytics.downloads.slice(-10)
    });
});

// Servir arquivos de atualização (com CORS habilitado)
app.use('/updates', express.static(path.join(__dirname, 'updates')));

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

// Configurar Adapter (se Redis estiver ativo)
if (pubClient && subClient) {
    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('[SOCKET] Redis Adapter configured');
    }).catch(err => {
        // ioredis connects automatically, but we catch connection errors here just in case
        console.log('[SOCKET] Redis Adapter initialization check (ioredis connects automatically)');
    });
}

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // JOIN ROOM (Host registers their ID)
    socket.on('join-host', async (roomId) => {
        socket.join(roomId);
        // Armazenar no Redis/Memória
        await hostsManager.set(roomId, socket.id);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // CLIENT CONNECT (Client signals intent to connect to Host ID)
    socket.on('client-connect', async ({ targetId, from, password }) => {
        console.log(`[SERVER] Client ${from} requesting connection to ${targetId} with password:`, password ? 'YES' : 'NO');

        // Buscar Socket ID do Host (Agora assíncrono por causa do Redis)
        // Nota: Com Redis Adapter, pode ser que o socket não esteja nesta instância.
        // Mas usar .to(socketId).emit() funciona através do Redis Pub/Sub!

        // Precisamos saber se o host existe.
        // Com o adapter, socket.to(id) funciona, mas não retorna se falhou.
        // Por isso mantemos nosso próprio registro `hostsManager`.

        const targetSocketId = await hostsManager.get(targetId);

        if (targetSocketId) {
            console.log(`[SERVER] Forwarding request to host ${targetId} (${targetSocketId})`);
            // Envia para o ID do socket específico. O Redis Adapter roteia se necessário.
            socket.to(targetSocketId).emit('incoming-connection', { from, password });
        } else {
            console.log(`[SERVER] Host ${targetId} not found`);
            // Opcional: Avisar o cliente que falhou
            // socket.emit('connect_error', { message: 'Host not found' });
        }
    });

    // WEBRTC SIGNALING (Forwarding based on 'target' ID)
    socket.on('offer', async (data) => {
        // data: { target, sdp, from }
        // Aqui 'target' é o ID da sala/host (que é o ID do socket do host, se ele usou join(roomId))
        // OU, se o cliente manda o ID do VconectY como target, precisamos resolver.

        // No código original do App.jsx:
        // socket.emit('join-host', myId) -> O socket entra na sala "myId"
        // Então socket.to(data.target) funciona se data.target for o "myId" (roomId).

        console.log(`Forwarding offer from ${data.from || socket.id} to ${data.target}`);
        socket.to(data.target).emit('offer', { sdp: data.sdp, from: data.from || socket.id });
    });

    socket.on('answer', (data) => {
        console.log(`Forwarding answer from ${data.from || socket.id} to ${data.target}`);
        socket.to(data.target).emit('answer', { sdp: data.sdp, from: data.from || socket.id });
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.target).emit('ice-candidate', { candidate: data.candidate });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Limpar hosts é difícil pois não sabemos qual HostID esse socket tinha sem guardar o reverso.
        // Mas o Redis tem expiração (EX), então ele limpa sozinho eventualmente.
        // Para limpar imediatamente, precisaríamos de um Map reverso socket.id -> hostId.
    });
});

// ... (previous code)

const PORT = process.env.PORT || 3000;

// Apenas iniciar o servidor se for executado diretamente (não na Vercel)
if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`VConectY Server running on port ${PORT}`);
    });
}

// Exportar para Vercel (Serverless Function)
module.exports = (req, res) => {
    // Permitir que o servidor HTTP (com Socket.IO + Express) manipule a requisição
    server.emit('request', req, res);
};
