import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

export default function initSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.use((socket, next) => {
        // Parse cookie to get token
        const cookieHeader = socket.handshake.headers.cookie;
        let token = null;
        if (cookieHeader) {
            const cookies = cookieHeader.split(';').reduce((acc, curr) => {
                const [key, value] = curr.trim().split('=');
                acc[key] = value;
                return acc;
            }, {});
            token = cookies.token;
        }
        
        token = token || socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) return next(new Error("Authentication error"));
        
        jwt.verify(token, process.env.JWT_SECRET || 'secret_key_tam_thoi', (err, decoded) => {
            if (err) return next(new Error("Authentication error"));
            socket.user = decoded;
            next();
        });
    });

    io.on('connection', (socket) => {
        console.log(`User connected to chat: ${socket.user?.id}`);
        
        socket.join(`user_${socket.user?.id}`);

        socket.on('join_conversation', (conversationId) => {
            socket.join(`conv_${conversationId}`);
        });

        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conv_${conversationId}`);
        });

        socket.on('typing', ({ conversationId, isTyping }) => {
            socket.to(`conv_${conversationId}`).emit('typing', {
                userId: socket.user?.id,
                isTyping
            });
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected from chat: ${socket.user?.id}`);
        });
    });

    return io;
}
