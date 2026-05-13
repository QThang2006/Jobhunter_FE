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
    // Lấy token từ localStorage (giống như axios)
    const token = localStorage.getItem('access_token');

    useEffect(() => {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        // Kết nối vào endpoint "/ws" mà server đã mở
        const socket = new SockJS(`${backendUrl}/ws`);
        const client = Stomp.over(socket);

        // Tắt log debug cho đỡ rối console
        client.debug = () => { };

        // Chuẩn bị header gửi kèm (Auth)
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        client.connect(headers, (frame) => {
            console.log('✅ Connected to WebSocket System');
            setStompClient(client);
        }, (error) => {
            console.error('❌ WebSocket Error:', error);
        });

        // Cleanup: Ngắt kết nối khi unmount hoặc khi token thay đổi (login/logout)
        return () => {
            if (client && client.connected) {
                client.disconnect(() => {
                    // console.log('WebSocket Disconnected');
                });
            }
        }
    }, [isAuthenticated, token]); // Chạy lại khi trạng thái đăng nhập thay đổi

    return (
        <WebSocketContext.Provider value={{ stompClient }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => useContext(WebSocketContext);
