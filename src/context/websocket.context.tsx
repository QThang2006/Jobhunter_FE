import { createContext, useContext, useEffect, useState } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { useAppSelector } from "@/redux/hooks";

interface IWebSocketContext {
    stompClient: Stomp.Client | null;
}

const WebSocketContext = createContext<IWebSocketContext>({ stompClient: null });

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [stompClient, setStompClient] = useState<Stomp.Client | null>(null);
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const userId = useAppSelector(state => state.account.user?.id);
    // Lấy token từ localStorage (giống như axios)
    const token = localStorage.getItem('access_token');

    useEffect(() => {
        setStompClient(null);
        if (!isAuthenticated || !token) return;

        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        let active = true;
        let currentClient: Stomp.Client | null = null;
        let currentSocket: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

        const connect = () => {
            if (!active) return;
            const latestToken = localStorage.getItem('access_token');
            if (!latestToken) return;

            const socket = new SockJS(`${backendUrl}/ws`);
            const client = Stomp.over(socket);
            client.debug = () => { };
            currentSocket = socket;
            currentClient = client;

            const headers = { Authorization: `Bearer ${latestToken}` };
            client.connect(
                headers,
                () => {
                    if (!active) {
                        if (client.connected) client.disconnect(() => socket.close());
                        return;
                    }
                    setStompClient(client);
                },
                () => {
                    if (!active) return;
                    setStompClient(null);
                    if (reconnectTimer) clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(connect, 5000);
                }
            );
        };

        connect();

        return () => {
            active = false;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            if (currentClient?.connected) {
                currentClient.disconnect(() => currentSocket?.close());
            } else {
                currentSocket?.close();
            }
            setStompClient(null);
        };
    }, [isAuthenticated, token, userId]);

    return (
        <WebSocketContext.Provider value={{ stompClient }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => useContext(WebSocketContext);
