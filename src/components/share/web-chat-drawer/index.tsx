import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Badge, Button, Drawer, Empty, Input, List, Space, Tag, Tooltip, Typography, message } from 'antd';
import { MessageOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    callFetchWebChatContacts,
    callFetchWebChatMessages,
    callFetchWebChatUnreadCount,
    callMarkWebChatRead,
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
    cachedUnreadCount = Math.max(0, count);
    window.dispatchEvent(new CustomEvent<number>(UNREAD_COUNT_SYNC_EVENT, { detail: cachedUnreadCount }));
};

/**
 * Mở thẳng khung chat duy nhất trên toàn ứng dụng (từ nút icon Header, nút "Nhắn Tin Với Tiệm Bánh" hoặc nút "Nhắn Tin Ứng Viên").
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
    const openRef = useRef<boolean>(open);
    const selectedContactRef = useRef<IWebChatContact | null>(selectedContact);

    useEffect(() => {
        openRef.current = open;
    }, [open]);

    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    // Reset sạch state khi đăng xuất hoặc đổi tài khoản trong cùng trình duyệt
    useEffect(() => {
        setOpen(false);
        setContacts([]);
        setSelectedContact(null);
        setMessages([]);
        setInputValue('');
        setContextJobId(undefined);
        publishUnreadCount(0);
    }, [isAuthenticated, currentUser?.id]);

    const loadUnread = useCallback(async () => {
        if (!isAuthenticated) {
            publishUnreadCount(0);
            return;
        }
        try {
            const res = await callFetchWebChatUnreadCount();
            if (res?.data !== undefined) {
                publishUnreadCount(res.data.unreadCount || 0);
            }
        } catch {
            // silent
        }
    }, [isAuthenticated]);

    const loadContacts = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const res = await callFetchWebChatContacts();
            if (res?.data) {
                const serverContacts = res.data;
                const currentTarget = selectedContactRef.current;
                // Giữ lại liên hệ vừa mở từ trang Job/CV nếu hai bên chưa gửi tin đầu tiên
                if (currentTarget && !serverContacts.some(c => Number(c.userId) === Number(currentTarget.userId))) {
                    setContacts([currentTarget, ...serverContacts]);
                } else {
                    setContacts(serverContacts);
                }
            }
        } catch {
            // silent
        }
    }, [isAuthenticated]);

    const loadConversation = useCallback(async (partnerId: number) => {
        if (!isAuthenticated) return;
        try {
            const res = await callFetchWebChatMessages(partnerId);
            if (res?.data) {
                setMessages(res.data);
                loadUnread();
                loadContacts();
            }
        } catch {
            // silent
        }
    }, [isAuthenticated, loadUnread, loadContacts]);

    useEffect(() => {
        if (isAuthenticated && currentUser?.id) {
            loadUnread();
        }
    }, [isAuthenticated, currentUser?.id, loadUnread]);

    useEffect(() => {
        if (open) {
            loadContacts();
        }
    }, [open, loadContacts]);

    useEffect(() => {
        if (selectedContact?.userId && open) {
            loadConversation(Number(selectedContact.userId));
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
                selectedContactRef.current = target;
                setSelectedContact(target);
                setContextJobId(custom.detail.jobId);
                setContacts(prev => prev.some(c => Number(c.userId) === Number(target.userId)) ? prev : [target, ...prev]);
                if (custom.detail.jobName) {
                    setInputValue(prev => prev || `Chào tiệm bánh, mình muốn hỏi thêm về vị trí "${custom.detail.jobName}" ạ!`);
                }
            }
        };
        window.addEventListener(OPEN_WEB_CHAT_EVENT, handler);
        return () => window.removeEventListener(OPEN_WEB_CHAT_EVENT, handler);
    }, []);

    // Lắng nghe tin nhắn thời gian thực qua WebSocket STOMP (/topic/web-chat/{userId})
    // Dùng ref cho open/selectedContact để giữ kết nối ổn định 1 lần duy nhất trong suốt phiên đăng nhập
    useEffect(() => {
        if (!stompClient || !stompClient.connected || !currentUser?.id) return;
        const myId = Number(currentUser.id);

        const sub = stompClient.subscribe(`/topic/web-chat/${myId}`, (frame) => {
            if (!frame.body) return;
            try {
                const incoming: IWebChatMessage = JSON.parse(frame.body);
                const senderId = Number(incoming.senderId);
                const receiverId = Number(incoming.receiverId);
                const partnerId = senderId === myId ? receiverId : senderId;

                const isDrawerOpen = openRef.current;
                const activePartner = selectedContactRef.current;
                const isViewingPartner = isDrawerOpen && activePartner && Number(activePartner.userId) === partnerId;

                if (isViewingPartner) {
                    setMessages(prev => prev.some(m => Number(m.id) === Number(incoming.id)) ? prev : [...prev, incoming]);
                    if (receiverId === myId) {
                        // Đang mở đúng khung chat với người gửi -> đánh dấu đã đọc ngay trên DB để đồng bộ badge = 0
                        callMarkWebChatRead(partnerId)
                            .then((res) => {
                                if (res?.data !== undefined) {
                                    publishUnreadCount(res.data.unreadCount || 0);
                                }
                                loadContacts();
                            })
                            .catch(() => loadContacts());
                        return;
                    }
                } else if (receiverId === myId) {
                    publishUnreadCount(cachedUnreadCount + 1);
                }
                loadContacts();
            } catch {
                // ignore malformed frame
            }
        });
        return () => sub.unsubscribe();
    }, [stompClient, currentUser?.id, loadContacts]);

    // Fallback nhẹ: nếu đang mở khung chat mà WebSocket tạm ngắt (ví dụ Render vừa ngủ dậy), tự đồng bộ lại mỗi 8 giây
    useEffect(() => {
        if (!open || !isAuthenticated || (stompClient && stompClient.connected)) return;
        const timer = setInterval(() => {
            loadContacts();
            if (selectedContactRef.current?.userId) {
                loadConversation(Number(selectedContactRef.current.userId));
            }
        }, 8000);
        return () => clearInterval(timer);
    }, [open, isAuthenticated, stompClient, loadContacts, loadConversation]);

    const handleSelectContact = (item: IWebChatContact) => {
        if (Number(selectedContact?.userId) !== Number(item.userId)) {
            setContextJobId(undefined);
            setInputValue('');
        }
        selectedContactRef.current = item;
        setSelectedContact(item);
    };

    const handleSend = async () => {
        if (!selectedContact || !inputValue.trim() || sending) return;
        const text = inputValue.trim();
        setInputValue('');
        setSending(true);
        try {
            const res = await callSendWebChatMessage(selectedContact.userId, text, contextJobId);
            if (res?.data) {
                setMessages(prev => prev.some(m => Number(m.id) === Number(res.data!.id)) ? prev : [...prev, res.data!]);
                setContextJobId(undefined);
                loadContacts();
            } else {
                setInputValue(text);
                message.error(res?.message || 'Không gửi được tin nhắn');
            }
        } catch (err: any) {
            setInputValue(text);
            message.error(err?.response?.data?.message || 'Không gửi được tin nhắn');
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
            zIndex={1150}
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
                                const active = Number(selectedContact?.userId) === Number(item.userId);
                                return (
                                    <List.Item
                                        onClick={() => handleSelectContact(item)}
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
                                    const isMine = Number(msg.senderId) === Number(currentUser?.id);
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
