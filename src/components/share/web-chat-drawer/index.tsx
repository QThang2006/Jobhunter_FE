import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Badge, Button, Drawer, Empty, Input, List, Space, Tag, Tooltip, Typography, message } from 'antd';
import { MessageOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    callFetchWebChatContacts,
    callFetchWebChatMessages,
    callFetchWebChatUnreadCount,
    callSendWebChatMessage
} from '@/config/api';
import { IWebChatContact, IWebChatMessage } from '@/types/backend';
import { useAppSelector } from '@/redux/hooks';
import { useWebSocket } from '@/context/websocket.context';

const { Text } = Typography;

export const OPEN_WEB_CHAT_EVENT = 'jobcake:open-web-chat';
const UNREAD_COUNT_SYNC_EVENT = 'jobcake:web-chat-unread-sync';

let cachedUnreadCount = 0;

const publishUnreadCount = (count: number) => {
    cachedUnreadCount = count;
    window.dispatchEvent(new CustomEvent<number>(UNREAD_COUNT_SYNC_EVENT, { detail: count }));
};

/**
 * Mở thẳng khung chat duy nhất trên toàn ứng dụng (từ nút icon Header hoặc nút "Nhắn Tin Với Tiệm Bánh").
 */
export const triggerOpenWebChat = (contact?: IWebChatContact, jobId?: number | string, jobName?: string) => {
    window.dispatchEvent(new CustomEvent(OPEN_WEB_CHAT_EVENT, {
        detail: { contact, jobId, jobName }
    }));
};

/**
 * Nút icon Messenger đặt trên Header (Desktop / Mobile / Admin).
 * Không chứa <Drawer> bên trong nên dù xuất hiện ở nhiều thanh Header cũng KHÔNG bao giờ mở trùng 2 lớp Drawer!
 */
const WebChatWidget = () => {
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const [unread, setUnread] = useState<number>(cachedUnreadCount);

    useEffect(() => {
        setUnread(cachedUnreadCount);
        const onSync = (e: Event) => {
            const custom = e as CustomEvent<number>;
            setUnread(custom.detail ?? 0);
        };
        window.addEventListener(UNREAD_COUNT_SYNC_EVENT, onSync);
        return () => window.removeEventListener(UNREAD_COUNT_SYNC_EVENT, onSync);
    }, []);

    if (!isAuthenticated) return null;

    return (
        <Tooltip title="Tin nhắn trao đổi Tuyển dụng (Client-Server WebSocket)">
            <Badge count={unread} size="small" offset={[-2, 2]}>
                <Button
                    type="text"
                    shape="circle"
                    icon={<MessageOutlined style={{ fontSize: 18, color: '#1677ff' }} />}
                    onClick={() => triggerOpenWebChat()}
                />
            </Badge>
        </Tooltip>
    );
};

/**
 * Thành phần <Drawer> duy nhất được gắn đúng 1 lần tại LayoutApp.
 */
export const WebChatDrawerHost = () => {
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const currentUser = useAppSelector(state => state.account.user);
    const { stompClient } = useWebSocket();

    const [open, setOpen] = useState<boolean>(false);
    const [contacts, setContacts] = useState<IWebChatContact[]>([]);
    const [selectedContact, setSelectedContact] = useState<IWebChatContact | null>(null);
    const [messages, setMessages] = useState<IWebChatMessage[]>([]);
    const [inputValue, setInputValue] = useState<string>('');
    const [contextJobId, setContextJobId] = useState<number | string | undefined>(undefined);
    const [sending, setSending] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const loadUnread = useCallback(async () => {
        if (!isAuthenticated) {
            publishUnreadCount(0);
            return;
        }
        const res = await callFetchWebChatUnreadCount();
        if (res?.data !== undefined) {
            publishUnreadCount(res.data.unreadCount || 0);
        }
    }, [isAuthenticated]);

    const loadContacts = useCallback(async () => {
        if (!isAuthenticated) return;
        const res = await callFetchWebChatContacts();
        if (res?.data) {
            setContacts(res.data);
        }
    }, [isAuthenticated]);

    const loadConversation = useCallback(async (partnerId: number) => {
        const res = await callFetchWebChatMessages(partnerId);
        if (res?.data) {
            setMessages(res.data);
            loadUnread();
            loadContacts();
        }
    }, [loadUnread, loadContacts]);

    useEffect(() => {
        loadUnread();
    }, [loadUnread]);

    useEffect(() => {
        if (open) {
            loadContacts();
        }
    }, [open, loadContacts]);

    useEffect(() => {
        if (selectedContact?.userId && open) {
            loadConversation(selectedContact.userId);
        }
    }, [selectedContact?.userId, open, loadConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Chỉ có DUY NHẤT 1 listener tại WebChatDrawerHost -> Mở đúng 1 Drawer, bấm X đóng sạch 100%!
    useEffect(() => {
        const handler = (e: Event) => {
            const custom = e as CustomEvent<{ contact?: IWebChatContact; jobId?: number | string; jobName?: string }>;
            setOpen(true);
            if (custom.detail?.contact) {
                const target = custom.detail.contact;
                setSelectedContact(target);
                setContextJobId(custom.detail.jobId);
                setContacts(prev => prev.some(c => c.userId === target.userId) ? prev : [target, ...prev]);
                if (custom.detail.jobName) {
                    setInputValue(prev => prev || `Chào tiệm bánh, mình muốn hỏi thêm về vị trí "${custom.detail.jobName}" ạ!`);
                }
            }
        };
        window.addEventListener(OPEN_WEB_CHAT_EVENT, handler);
        return () => window.removeEventListener(OPEN_WEB_CHAT_EVENT, handler);
    }, []);

    // Lắng nghe tin nhắn thời gian thực qua WebSocket STOMP (/topic/web-chat/{userId})
    useEffect(() => {
        if (!stompClient || !stompClient.connected || !currentUser?.id) return;
        const sub = stompClient.subscribe(`/topic/web-chat/${currentUser.id}`, (frame) => {
            if (!frame.body) return;
            try {
                const incoming: IWebChatMessage = JSON.parse(frame.body);
                const myId = Number(currentUser.id);
                const partnerId = incoming.senderId === myId ? incoming.receiverId : incoming.senderId;

                if (open && selectedContact && selectedContact.userId === partnerId) {
                    setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]);
                } else if (incoming.receiverId === myId) {
                    publishUnreadCount(cachedUnreadCount + 1);
                }
                loadContacts();
            } catch {
                // ignore malformed frame
            }
        });
        return () => sub.unsubscribe();
    }, [stompClient, currentUser?.id, open, selectedContact, loadContacts]);

    const handleSend = async () => {
        if (!selectedContact || !inputValue.trim()) return;
        const text = inputValue.trim();
        setInputValue('');
        setSending(true);
        try {
            const res = await callSendWebChatMessage(selectedContact.userId, text, contextJobId);
            if (res?.data) {
                setMessages(prev => prev.some(m => m.id === res.data!.id) ? prev : [...prev, res.data!]);
                setContextJobId(undefined);
                loadContacts();
            } else {
                message.error('Không gửi được tin nhắn');
            }
        } finally {
            setSending(false);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <Drawer
            title={
                <Space>
                    <MessageOutlined style={{ color: '#1677ff' }} />
                    <span>JobCake Messenger (HR ↔ Ứng Viên • WebSocket STOMP)</span>
                </Space>
            }
            placement="right"
            width="min(760px, 96vw)"
            open={open}
            onClose={() => setOpen(false)}
            styles={{ body: { padding: 0, display: 'flex', height: '100%' } }}
        >
            <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                {/* Danh sách hội thoại */}
                <div style={{ width: '36%', borderRight: '1px solid #e5e7eb', overflowY: 'auto', background: '#f9fafb' }}>
                    {contacts.length === 0 ? (
                        <div style={{ padding: 24 }}>
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Chưa có cuộc trò chuyện. Ứng viên có thể bấm 'Nhắn tin với Tiệm bánh' ở trang việc làm!"
                            />
                        </div>
                    ) : (
                        <List
                            dataSource={contacts}
                            renderItem={item => {
                                const active = selectedContact?.userId === item.userId;
                                return (
                                    <List.Item
                                        onClick={() => setSelectedContact(item)}
                                        style={{
                                            padding: '12px 14px',
                                            cursor: 'pointer',
                                            background: active ? '#e6f4ff' : 'transparent',
                                            borderBottom: '1px solid #f0f0f0'
                                        }}
                                    >
                                        <List.Item.Meta
                                            avatar={
                                                <Badge count={item.unreadCount} size="small">
                                                    <Avatar style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
                                                </Badge>
                                            }
                                            title={
                                                <Space size={4} wrap>
                                                    <Text strong style={{ fontSize: 13 }}>{item.name}</Text>
                                                    {item.companyName && <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>{item.companyName}</Tag>}
                                                </Space>
                                            }
                                            description={
                                                <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {item.lastMessage}
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    )}
                </div>

                {/* Khung tin nhắn */}
                <div style={{ width: '64%', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {!selectedContact ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Empty description="Chọn một người ở bên trái để bắt đầu nhắn tin trực tuyến" />
                        </div>
                    ) : (
                        <>
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
                                <Text strong>{selectedContact.name}</Text>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                    {selectedContact.email} {selectedContact.companyName ? `• ${selectedContact.companyName}` : ''}
                                </div>
                            </div>

                            <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto', background: '#f8fafc' }}>
                                {messages.map(msg => {
                                    const isMine = String(msg.senderId) === String(currentUser?.id);
                                    return (
                                        <div
                                            key={msg.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: isMine ? 'flex-end' : 'flex-start',
                                                marginBottom: 10
                                            }}
                                        >
                                            <div
                                                style={{
                                                    maxWidth: '78%',
                                                    padding: '8px 12px',
                                                    borderRadius: 10,
                                                    background: isMine ? '#1677ff' : '#ffffff',
                                                    color: isMine ? '#ffffff' : '#111827',
                                                    border: isMine ? 'none' : '1px solid #e5e7eb',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                                }}
                                            >
                                                {msg.jobName && (
                                                    <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 4, fontWeight: 600 }}>
                                                        📌 Vị trí: {msg.jobName}
                                                    </div>
                                                )}
                                                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13.5 }}>
                                                    {msg.content}
                                                </div>
                                                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 4, textAlign: 'right' }}>
                                                    {msg.createdAt ? dayjs(msg.createdAt).format('HH:mm DD/MM') : ''}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        placeholder={`Nhắn tin tới ${selectedContact.name}...`}
                                        value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        onPressEnter={handleSend}
                                    />
                                    <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={handleSend}>
                                        Gửi
                                    </Button>
                                </Space.Compact>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Drawer>
    );
};

export default WebChatWidget;
