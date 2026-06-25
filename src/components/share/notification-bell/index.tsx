import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge, Dropdown, Empty, Spin, Tooltip } from 'antd';
import { BellOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import {
    callFetchNotifications,
    callCountUnreadNotifications,
    callMarkNotificationAsRead,
    callMarkAllNotificationsAsRead,
} from '@/config/api';
import { INotification } from '@/types/backend';
import { useWebSocket } from '@/context/websocket.context';
import { useAppSelector } from '@/redux/hooks';
import styles from './notification.bell.module.scss';

const STATUS_CONFIG: Record<string, { color: string; label: string; emoji: string }> = {
    APPROVED: { color: '#52c41a', label: 'Đã duyệt', emoji: '✅' },
    REJECTED: { color: '#ff4d4f', label: 'Từ chối', emoji: '❌' },
    REVIEWING: { color: '#1890ff', label: 'Đang xem xét', emoji: '🔍' },
    PENDING: { color: '#faad14', label: 'Chờ xử lý', emoji: '⏳' },
};

function timeAgo(dateStr: string): string {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
}

const NotificationBell = () => {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<INotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { stompClient } = useWebSocket();
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);

    const fetchUnreadCount = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const res = await callCountUnreadNotifications();
            if (res?.data?.unreadCount !== undefined) {
                setUnreadCount(res.data.unreadCount);
            }
        } catch (_) { /* silent */ }
    }, [isAuthenticated]);

    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const res = await callFetchNotifications(1, 15);
            if (res?.data?.result) {
                setNotifications(res.data.result);
            }
        } catch (_) { /* silent */ }
        finally { setLoading(false); }
    }, [isAuthenticated]);

    // Load unread count on mount
    useEffect(() => {
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    // Fetch list when dropdown opens
    useEffect(() => {
        if (open) fetchNotifications();
    }, [open, fetchNotifications]);

    // WebSocket: listen for new notifications on /topic/notifications/{userId}
    const userId = useAppSelector(state => state.account.user?.id);
    useEffect(() => {
        if (!stompClient || !stompClient.connected || !userId) return;

        const sub = stompClient.subscribe(`/topic/notifications/${userId}`, (_msg) => {
            // New notification arrived — refresh count & list
            fetchUnreadCount();
            if (open) fetchNotifications();
        });
        return () => sub.unsubscribe();
    }, [stompClient, userId, open, fetchUnreadCount, fetchNotifications]);

    // Poll unread count every 60s as fallback
    useEffect(() => {
        if (!isAuthenticated) return;
        const id = setInterval(fetchUnreadCount, 60_000);
        return () => clearInterval(id);
    }, [isAuthenticated, fetchUnreadCount]);

    const handleMarkRead = async (n: INotification) => {
        if (n.read) return;
        await callMarkNotificationAsRead(n.id);
        setNotifications(prev =>
            prev.map(item => item.id === n.id ? { ...item, read: true } : item)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const handleMarkAll = async () => {
        setMarkingAll(true);
        await callMarkAllNotificationsAsRead();
        setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
        setUnreadCount(0);
        setMarkingAll(false);
    };

    if (!isAuthenticated) return null;

    const dropdownContent = (
        <div className={styles['notif-panel']} ref={dropdownRef}>
            {/* Header */}
            <div className={styles['notif-header']}>
                <span className={styles['notif-title']}>
                    🔔 Thông báo
                    {unreadCount > 0 && (
                        <span className={styles['notif-badge-count']}>{unreadCount}</span>
                    )}
                </span>
                {unreadCount > 0 && (
                    <Tooltip title="Đánh dấu tất cả đã đọc">
                        <button
                            className={styles['mark-all-btn']}
                            onClick={handleMarkAll}
                            disabled={markingAll}
                        >
                            {markingAll ? <Spin size="small" /> : <><CheckOutlined /> Đọc tất cả</>}
                        </button>
                    </Tooltip>
                )}
            </div>

            {/* Body */}
            <div className={styles['notif-body']}>
                {loading ? (
                    <div className={styles['notif-loading']}>
                        <Spin size="default" />
                        <p>Đang tải thông báo...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <Empty
                        description="Không có thông báo nào"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ padding: '32px 0' }}
                    />
                ) : (
                    notifications.map((n) => {
                        const cfg = STATUS_CONFIG[n.status] ?? { color: '#aaa', label: n.status, emoji: '📢' };
                        return (
                            <div
                                key={n.id}
                                className={`${styles['notif-item']} ${!n.read ? styles['notif-item--unread'] : ''}`}
                                onClick={() => handleMarkRead(n)}
                            >
                                {/* Status dot */}
                                <div
                                    className={styles['status-dot']}
                                    style={{ background: cfg.color }}
                                />
                                <div className={styles['notif-content']}>
                                    <div className={styles['notif-item-title']}>
                                        {cfg.emoji} {n.title}
                                    </div>
                                    <div className={styles['notif-item-body']}>{n.body}</div>
                                    <div className={styles['notif-item-meta']}>
                                        <span
                                            className={styles['status-tag']}
                                            style={{ color: cfg.color, borderColor: cfg.color }}
                                        >
                                            {cfg.label}
                                        </span>
                                        <span className={styles['notif-time']}>
                                            <ClockCircleOutlined style={{ marginRight: 3 }} />
                                            {timeAgo(n.createdAt)}
                                        </span>
                                    </div>
                                </div>
                                {!n.read && <span className={styles['unread-dot']} />}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className={styles['notif-footer']}>
                    Hiển thị {notifications.length} thông báo gần nhất
                </div>
            )}
        </div>
    );

    return (
        <Dropdown
            dropdownRender={() => dropdownContent}
            open={open}
            onOpenChange={setOpen}
            trigger={['click']}
            placement="bottomRight"
            overlayClassName={styles['notif-dropdown-overlay']}
        >
            <div id="notification-bell-btn" className={styles['bell-wrapper']}>
                <Badge
                    count={unreadCount}
                    overflowCount={99}
                    size="small"
                    offset={[-2, 2]}
                >
                    <BellOutlined
                        className={`${styles['bell-icon']} ${unreadCount > 0 ? styles['bell-icon--has-notif'] : ''}`}
                    />
                </Badge>
            </div>
        </Dropdown>
    );
};

export default NotificationBell;
