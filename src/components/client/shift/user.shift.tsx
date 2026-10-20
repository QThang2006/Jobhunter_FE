import { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Empty, Card, Space, Badge, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { IWorkShift } from '@/types/backend';
import { callFetchMyWorkShifts } from '@/config/api';
import dayjs from 'dayjs';
import { CalendarOutlined, FieldTimeOutlined, ShopOutlined, SwapOutlined } from '@ant-design/icons';
import { useWebSocket } from '@/context/websocket.context';
import { useAppSelector } from '@/redux/hooks';

const UserShiftSchedule = () => {
    const [shifts, setShifts] = useState<IWorkShift[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const user = useAppSelector(state => state.account.user);
    const { stompClient } = useWebSocket();

    const fetchShifts = useCallback(async () => {
        setLoading(true);
        const res = await callFetchMyWorkShifts('page=1&size=50&sort=shiftDate,desc&sort=startTime,asc');
        if (res?.data?.result) {
            setShifts(res.data.result);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    // WebSocket auto-refresh when shifts are modified or transferred
    useEffect(() => {
        if (!stompClient || !stompClient.connected) return;

        const subGeneral = stompClient.subscribe('/topic/shifts', () => {
            fetchShifts();
        });

        let subPersonal: any = null;
        if (user?.id) {
            subPersonal = stompClient.subscribe(`/topic/shifts/${user.id}`, () => {
                fetchShifts();
            });
        }

        return () => {
            subGeneral.unsubscribe();
            if (subPersonal) subPersonal.unsubscribe();
        };
    }, [stompClient, user?.id, fetchShifts]);

    const renderStatus = (status: string) => {
        switch (status) {
            case 'ASSIGNED':
                return <Tag color="blue">Đã phân ca</Tag>;
            case 'TRANSFERRED':
                return (
                    <Tag color="orange" icon={<SwapOutlined />}>
                        Đã chuyển ca
                    </Tag>
                );
            case 'CONFIRMED':
                return <Tag color="green">Đã xác nhận</Tag>;
            case 'COMPLETED':
                return <Tag color="purple">Hoàn thành</Tag>;
            case 'CANCELLED':
                return <Tag color="red">Đã hủy</Tag>;
            default:
                return <Tag>{status}</Tag>;
        }
    };

    const columns: ColumnsType<IWorkShift> = [
        {
            title: 'STT',
            key: 'index',
            width: 50,
            align: 'center',
            render: (_t, _r, index) => index + 1,
        },
        {
            title: 'Ngày Làm Việc',
            dataIndex: 'shiftDate',
            key: 'shiftDate',
            render: (_t, record) => {
                const isToday = dayjs(record.shiftDate).isSame(dayjs(), 'day');
                const isPast = dayjs(record.shiftDate).isBefore(dayjs(), 'day');
                return (
                    <Space direction="vertical" size={2}>
                        <Space>
                            <CalendarOutlined style={{ color: isToday ? '#d46b08' : '#8c7b70' }} />
                            <span style={{ fontWeight: isToday ? 700 : 500, color: isToday ? '#d46b08' : 'inherit' }}>
                                {dayjs(record.shiftDate).format('DD/MM/YYYY')}
                            </span>
                            {isToday && <Tag color="gold" style={{ margin: 0, fontSize: 11 }}>Hôm nay</Tag>}
                        </Space>
                        <span style={{ fontSize: 12, color: '#8c7b70' }}>
                            {dayjs(record.shiftDate).format('dddd')}
                        </span>
                    </Space>
                );
            },
        },
        {
            title: 'Ca Làm',
            dataIndex: 'shiftName',
            key: 'shiftName',
            render: (_t, record) => (
                <Tag color="volcano" style={{ fontSize: 13, padding: '3px 8px' }}>
                    {record.shiftName}
                </Tag>
            ),
        },
        {
            title: 'Khung Giờ',
            key: 'time',
            render: (_t, record) => (
                <Space>
                    <FieldTimeOutlined style={{ color: '#d46b08' }} />
                    <span style={{ fontWeight: 600 }}>{record.startTime || '--:--'} - {record.endTime || '--:--'}</span>
                </Space>
            ),
        },
        {
            title: 'Tiệm Bánh',
            dataIndex: ['company', 'name'],
            key: 'company',
            render: (_t, record) => (
                <Space>
                    <ShopOutlined style={{ color: '#d46b08' }} />
                    <span>{record.company?.name || '--'}</span>
                </Space>
            ),
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'status',
            key: 'status',
            render: (_t, record) => renderStatus(record.status),
        },
        {
            title: 'Nhiệm Vụ / Ghi Chú',
            dataIndex: 'note',
            key: 'note',
            render: (_t, record) => {
                const isTransferred = record.status === 'TRANSFERRED' || (record.note && record.note.includes('[ĐÃ CHUYỂN CA]'));
                return (
                    <div>
                        {isTransferred && (
                            <div style={{ color: '#d46b08', fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                                <SwapOutlined style={{ marginRight: 4 }} />
                                Ca làm việc được chuyển giao
                            </div>
                        )}
                        <span style={{ color: '#4a382e' }}>{record.note || 'Không có ghi chú'}</span>
                    </div>
                );
            },
        },
    ];

    return (
        <div>
            <div style={{
                background: '#fffaf5',
                border: '1px solid #ebd9c8',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16
            }}>
                <div style={{ fontWeight: 600, color: '#4a2c11' }}>
                    Lịch Phân Ca Làm Việc Của Bạn
                </div>
                <div style={{ fontSize: 13, color: '#7a6b61', marginTop: 2 }}>
                    Danh sách ca làm việc được chủ tiệm phân công. Khi chủ tiệm điều phối hoặc chuyển ca, hệ thống sẽ tự động cập nhật và gửi thông báo theo thời gian thực.
                </div>
            </div>

            <Table<IWorkShift>
                columns={columns}
                dataSource={shifts}
                rowKey="id"
                loading={loading}
                pagination={{
                    pageSize: 8,
                    responsive: true,
                    showTotal: (total) => `Tổng cộng ${total} ca làm`,
                }}
                locale={{
                    emptyText: <Empty description="Bạn chưa có ca làm việc nào được phân công" />
                }}
            />
        </div>
    );
};

export default UserShiftSchedule;
