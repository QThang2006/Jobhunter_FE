import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Col, Input, Row, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import {
    ApartmentOutlined,
    CloudSyncOutlined,
    FileProtectOutlined,
    LaptopOutlined,
    NotificationOutlined,
    ReloadOutlined,
    SendOutlined,
    WifiOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { callFetchBakeryNetworkStatus, callSendBakeryDirective } from '@/config/api';
import { IBakeryNetworkStatus, IBakeryStationDto, IBakeryStationLog, ISharedRecipeIndex } from '@/types/backend';
import { useWebSocket } from '@/context/websocket.context';

const { Title, Text } = Typography;

const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const BakeryNetworkPage = () => {
    const [data, setData] = useState<IBakeryNetworkStatus | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [directiveText, setDirectiveText] = useState<string>('');
    const [sending, setSending] = useState<boolean>(false);
    const { stompClient } = useWebSocket();

    const fetchStatus = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await callFetchBakeryNetworkStatus();
            if (res?.data) {
                setData(res.data);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    useEffect(() => {
        if (!stompClient || !stompClient.connected) return;
        const sub = stompClient.subscribe('/topic/bakery-mesh', () => {
            fetchStatus(true);
        });
        return () => sub.unsubscribe();
    }, [stompClient, fetchStatus]);

    const handleSendDirective = async () => {
        if (!directiveText.trim()) {
            message.warning('Vui lòng nhập nội dung chỉ đạo muốn phát xuống xưởng bánh!');
            return;
        }
        setSending(true);
        try {
            const res = await callSendBakeryDirective(directiveText.trim());
            if (res?.data) {
                message.success('Đã gửi chỉ đạo! Tracker xưởng bánh sẽ tự phát Loa UDP tới toàn bộ máy trạm.');
                setDirectiveText('');
                fetchStatus(true);
            }
        } finally {
            setSending(false);
        }
    };

    const stationColumns: ColumnsType<IBakeryStationDto> = [
        { title: 'Mã Máy', dataIndex: 'stationId', key: 'stationId', width: 120, render: v => <Tag color="geekblue">{v}</Tag> },
        { title: 'Nhân Viên Trực', dataIndex: 'bakerName', key: 'bakerName', render: v => <strong>{v}</strong> },
        { title: 'Khu Vực Bếp', dataIndex: 'kitchenZone', key: 'kitchenZone', render: v => <Tag color="blue">{v}</Tag> },
        {
            title: 'Địa Chỉ Mạng LAN (TCP / UDP)',
            key: 'addr',
            render: (_, r) => <code>{r.ipAddress} (TCP:{r.tcpPort} / UDP:{r.udpPort})</code>
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'status',
            key: 'status',
            render: (st: string) => {
                const map: Record<string, { label: string; color: string }> = {
                    AVAILABLE: { label: 'Đang rảnh', color: 'green' },
                    BAKING: { label: 'Đang nướng bánh', color: 'orange' },
                    DECORATING: { label: 'Đang bắt kem', color: 'purple' },
                    BUSY_ORDER: { label: 'Bận đơn gấp', color: 'red' }
                };
                const item = map[st] || { label: st || 'Online', color: 'green' };
                return <Tag color={item.color}>{item.label}</Tag>;
            }
        }
    ];

    const recipeColumns: ColumnsType<ISharedRecipeIndex> = [
        { title: 'Tên Tệp Công Thức / Ảnh Mẫu', dataIndex: 'fileName', key: 'fileName', render: v => <strong>📄 {v}</strong> },
        { title: 'Dung Lượng', dataIndex: 'fileSize', key: 'fileSize', width: 120, render: v => formatBytes(v) },
        {
            title: 'Mã Toàn Vẹn SHA-256',
            dataIndex: 'sha256Hash',
            key: 'sha256Hash',
            render: (v: string) => <code style={{ fontSize: 12, color: '#4b5563' }}>{v ? `${v.substring(0, 18)}...` : ''}</code>
        },
        {
            title: 'Máy Đang Lưu Trữ (P2P)',
            key: 'holder',
            render: (_, r) => <span>{r.bakerName} <Tag>{r.kitchenZone}</Tag></span>
        },
        {
            title: 'Cập Nhật',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            width: 155,
            render: v => v ? dayjs(v).format('DD/MM/YYYY HH:mm:ss') : ''
        }
    ];

    const logColumns: ColumnsType<IBakeryStationLog> = [
        {
            title: 'Thời Gian',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 165,
            render: v => v ? dayjs(v).format('DD/MM/YYYY HH:mm:ss') : ''
        },
        {
            title: 'Sự Kiện',
            dataIndex: 'eventType',
            key: 'eventType',
            width: 150,
            render: (v: string) => {
                const color = v === 'ONLINE' || v === 'TRACKER_START' ? 'green'
                    : v === 'ADMIN_DIRECTIVE' ? 'gold'
                    : v === 'SHARE_FILE' ? 'blue' : 'volcano';
                return <Tag color={color}>{v}</Tag>;
            }
        },
        { title: 'Nguồn Tracker', dataIndex: 'trackerHost', key: 'trackerHost', width: 170 },
        { title: 'Chi Tiết Hoạt Động', dataIndex: 'detail', key: 'detail' }
    ];

    const trackerOnline = Boolean(data?.trackerOnline);

    return (
        <div style={{ padding: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>
                        <ApartmentOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                        Giám Sát Mạng Lưới Phân Tán Xưởng Bánh (Cloud ↔ RMI/P2P)
                    </Title>
                    <Text type="secondary">
                        Theo dõi thời gian thực các máy trạm JobCake Station tại xưởng bánh và gửi thông báo chỉ đạo từ xa qua loa UDP.
                    </Text>
                </div>
                <Button icon={<ReloadOutlined />} onClick={() => fetchStatus()} loading={loading}>
                    Làm mới
                </Button>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderRadius: 10 }}>
                        <Statistic
                            title="Trạng Thái RMI Tracker Xưởng"
                            value={trackerOnline ? 'P2P LAI (ONLINE)' : 'OFFLINE / P2P THUẦN'}
                            valueStyle={{ color: trackerOnline ? '#16a34a' : '#d97706', fontSize: 18, fontWeight: 700 }}
                            prefix={<WifiOutlined />}
                        />
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                            {data?.trackerHost ? `RMI: ${data.trackerHost}:${data.rmiPort}` : 'Chưa nhận đồng bộ từ Tracker'}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderRadius: 10 }}>
                        <Statistic
                            title="Máy Trạm Đang Trực Ca"
                            value={data?.onlineStations?.length || 0}
                            suffix="máy"
                            valueStyle={{ color: '#1677ff', fontWeight: 700 }}
                            prefix={<LaptopOutlined />}
                        />
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                            Cập nhật gần nhất: {data?.lastSyncAt ? dayjs(data.lastSyncAt).format('HH:mm:ss') : '—'}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderRadius: 10 }}>
                        <Statistic
                            title="Chỉ Mục Công Thức / Mẫu Bánh"
                            value={data?.sharedRecipes?.length || 0}
                            suffix="tệp P2P"
                            valueStyle={{ color: '#0d9488', fontWeight: 700 }}
                            prefix={<FileProtectOutlined />}
                        />
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                            Lưu tệp gốc tại máy trạm (0 MB tốn Cloud)
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} style={{ borderRadius: 10 }}>
                        <Statistic
                            title="Nhật Ký PostgreSQL"
                            value={data?.recentLogs?.length || 0}
                            suffix="sự kiện"
                            valueStyle={{ color: '#7c3aed', fontWeight: 700 }}
                            prefix={<CloudSyncOutlined />}
                        />
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                            Lệnh chỉ đạo đang chờ phát: {data?.pendingDirectiveCount || 0}
                        </div>
                    </Card>
                </Col>
            </Row>

            <Card
                title={
                    <Space>
                        <NotificationOutlined style={{ color: '#f59e0b' }} />
                        <span>Phát Chỉ Đạo Khẩn Từ Chủ Tiệm Xuống Toàn Xưởng Bánh (Web Cloud → RMI Tracker → Loa UDP Broadcast)</span>
                    </Space>
                }
                style={{ marginBottom: 16, borderRadius: 10 }}
            >
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        size="large"
                        placeholder="VD: Đơn bánh cưới 3 tầng #108 khách ghé lấy sớm lúc 16:30, bếp nướng & phòng kem ưu tiên hoàn thiện!"
                        value={directiveText}
                        onChange={e => setDirectiveText(e.target.value)}
                        onPressEnter={handleSendDirective}
                    />
                    <Button
                        type="primary"
                        size="large"
                        icon={<SendOutlined />}
                        loading={sending}
                        onClick={handleSendDirective}
                        style={{ background: '#f59e0b', borderColor: '#f59e0b', fontWeight: 600 }}
                    >
                        Phát Loa Xuống Xưởng
                    </Button>
                </Space.Compact>
            </Card>

            <Card
                title={
                    <Space>
                        <Badge status={trackerOnline ? 'processing' : 'warning'} />
                        <span>1. Danh Sách Máy Trạm Nhân Viên Đang Hoạt Động Tại Xưởng</span>
                    </Space>
                }
                style={{ marginBottom: 16, borderRadius: 10 }}
            >
                <Table<IBakeryStationDto>
                    rowKey="stationId"
                    columns={stationColumns}
                    dataSource={data?.onlineStations || []}
                    loading={loading}
                    pagination={false}
                    locale={{
                        emptyText: trackerOnline
                            ? 'Chưa có máy trạm nào đăng nhập vào Tracker'
                            : 'Tracker xưởng bánh đang tắt (Các máy trạm tại tiệm đang tự vận hành ở chế độ P2P Thuần qua mạng LAN)'
                    }}
                    scroll={{ x: 700 }}
                />
            </Card>

            <Card
                title="2. Chỉ Mục Tệp Công Thức & Mẫu Bánh Đang Chia Sẻ Trong Mạng P2P (shared_recipe_indexes)"
                style={{ marginBottom: 16, borderRadius: 10 }}
            >
                <Table<ISharedRecipeIndex>
                    rowKey="id"
                    columns={recipeColumns}
                    dataSource={data?.sharedRecipes || []}
                    loading={loading}
                    pagination={{ pageSize: 6 }}
                    scroll={{ x: 750 }}
                />
            </Card>

            <Card
                title="3. Nhật Ký Hoạt Động Mạng Phân Tán Xưởng Bánh Trên PostgreSQL (bakery_station_logs)"
                style={{ borderRadius: 10 }}
            >
                <Table<IBakeryStationLog>
                    rowKey="id"
                    columns={logColumns}
                    dataSource={data?.recentLogs || []}
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 750 }}
                />
            </Card>
        </div>
    );
};

export default BakeryNetworkPage;
