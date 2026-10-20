import { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Empty, Space, Segmented } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { IWorkShift } from '@/types/backend';
import { callFetchMyWorkShifts } from '@/config/api';
import dayjs from 'dayjs';
import { CalendarOutlined, FieldTimeOutlined, ShopOutlined, SwapOutlined, TableOutlined } from '@ant-design/icons';
import { useWebSocket } from '@/context/websocket.context';
import { useAppSelector } from '@/redux/hooks';
import ShiftCalendarView from '@/components/share/shift/shift.calendar.view';

const UserShiftSchedule = () => {
    const [shifts, setShifts] = useState<IWorkShift[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
    const user = useAppSelector(state => state.account.user);
    const { stompClient } = useWebSocket();

    const fetchShifts = useCallback(async () => {
        setLoading(true);
        const res = await callFetchMyWorkShifts('page=1&size=200&sort=shiftDate,asc&sort=startTime,asc');
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
                return (
                    <Space direction="vertical" size={2}>
                        <Space>
                            <CalendarOutlined style={{ color: isToday ? '#2563eb' : '#6b7280' }} />
                            <span style={{ fontWeight: isToday ? 700 : 500, color: isToday ? '#2563eb' : 'inherit' }}>
                                {dayjs(record.shiftDate).format('DD/MM/YYYY')}
                            </span>
                            {isToday && <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>Hôm nay</Tag>}
                        </Space>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
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
                <Tag color="blue" style={{ fontSize: 13, padding: '3px 8px' }}>
                    {record.shiftName}
                </Tag>
            ),
        },
        {
            title: 'Khung Giờ',
            key: 'time',
            render: (_t, record) => (
                <Space>
                    <FieldTimeOutlined style={{ color: '#2563eb' }} />
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
                    <ShopOutlined style={{ color: '#6b7280' }} />
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
                            <div style={{ color: '#2563eb', fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                                <SwapOutlined style={{ marginRight: 4 }} />
                                Ca làm việc được chuyển giao
                            </div>
                        )}
                        <span style={{ color: '#374151' }}>{record.note || 'Không có ghi chú'}</span>
                    </div>
                );
            },
        },
    ];

    return (
        <div>
            {/* Header info & view toggle */}
            <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
            }}>
                <div>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>
                        Lịch Phân Ca Làm Việc Của Bạn
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                        Theo dõi ca làm theo tháng hoặc dạng danh sách. Mọi thay đổi hoặc chuyển ca sẽ được cập nhật tức thì.
                    </div>
                </div>

                <Segmented
                    value={viewMode}
                    onChange={(val: any) => setViewMode(val)}
                    options={[
                        { label: 'Lịch Tháng', value: 'calendar', icon: <CalendarOutlined /> },
                        { label: 'Danh Sách', value: 'table', icon: <TableOutlined /> },
                    ]}
                />
            </div>

            {viewMode === 'calendar' ? (
                <ShiftCalendarView
                    shifts={shifts}
                    loading={loading}
                    isAdmin={false}
                />
            ) : (
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
            )}
        </div>
    );
};

export default UserShiftSchedule;
