const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

const resolveFromRoot = (p) => {
    if (!p) return null;
    return path.isAbsolute(p) ? p : path.resolve(__dirname, '..', p);
};

const HTTPS_PORT = process.env.HTTPS_PORT;
const HTTPS_KEY_PATH = resolveFromRoot(process.env.HTTPS_KEY_PATH);
const HTTPS_CERT_PATH = resolveFromRoot(process.env.HTTPS_CERT_PATH);
const HTTPS_CA_PATH = resolveFromRoot(process.env.HTTPS_CA_PATH);

const httpServer = http.createServer(app);

let httpsServer = null;
if (HTTPS_PORT && HTTPS_KEY_PATH && HTTPS_CERT_PATH && fs.existsSync(HTTPS_KEY_PATH) && fs.existsSync(HTTPS_CERT_PATH)) {
    const httpsOptions = {
        key: fs.readFileSync(HTTPS_KEY_PATH),
        cert: fs.readFileSync(HTTPS_CERT_PATH)
    };
    if (HTTPS_CA_PATH && fs.existsSync(HTTPS_CA_PATH)) {
        httpsOptions.ca = fs.readFileSync(HTTPS_CA_PATH);
    }
    httpsServer = https.createServer(httpsOptions, app);
}

const ioServer = httpsServer || httpServer;
const io = new Server(ioServer, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// Routes
const authRoutes = require('./routes/authRoutes');
const childRoutes = require('./routes/childRoutes');
const activityRoutes = require('./routes/activityRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/children', childRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/mentor', require('./routes/mentorRoutes'));
app.use('/api/resources', require('./routes/resourceRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/observations', require('./routes/observationRoutes'));
app.use('/api/speech', require('./routes/speechRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));

app.set('io', io);

io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error("Not Authorized"));
        }
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = payload.user || { id: payload.user_id };
        return next();
    } catch (err) {
        return next(new Error("Not Authorized"));
    }
});

io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (userId) {
        socket.join(`user:${userId}`);
    }

    socket.on('call:invite', ({ toUserId, callId, fromUser }) => {
        if (!toUserId || !callId) return;
        io.to(`user:${toUserId}`).emit('call:invite', {
            callId,
            fromUser: fromUser || { id: userId },
            toUserId
        });
    });

    socket.on('call:decline', ({ toUserId, callId }) => {
        if (!toUserId || !callId) return;
        io.to(`user:${toUserId}`).emit('call:decline', {
            callId,
            fromUserId: userId
        });
    });

    socket.on('call:accept', ({ toUserId, callId }) => {
        if (!toUserId || !callId) return;
        io.to(`user:${toUserId}`).emit('call:accept', {
            callId,
            fromUserId: userId
        });
    });

    socket.on('call:end', ({ toUserId, callId }) => {
        if (!toUserId || !callId) return;
        io.to(`user:${toUserId}`).emit('call:end', {
            callId,
            fromUserId: userId
        });
    });

    socket.on('call:join', ({ callId }) => {
        if (!callId) return;
        const room = `call:${callId}`;
        socket.join(room);
        const participants = io.sockets.adapter.rooms.get(room);
        if (participants && participants.size >= 2) {
            io.to(room).emit('call:ready', { callId });
        }
    });

    socket.on('call:signal', ({ toUserId, callId, data }) => {
        if (!toUserId || !callId || !data) return;
        io.to(`user:${toUserId}`).emit('call:signal', {
            callId,
            fromUserId: userId,
            data
        });
    });
});



app.get('/', (req, res) => {
    res.json({ message: 'CareBridge API is running' });
});


const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

if (httpsServer) {
    httpsServer.listen(HTTPS_PORT, () => {
        console.log(`Server running on https://localhost:${HTTPS_PORT}`);
    });
}
