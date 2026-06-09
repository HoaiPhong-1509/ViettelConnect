'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useChatWebSocket() {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        // Ensure this matches your backend URL
        const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
            withCredentials: true
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return socket;
}
