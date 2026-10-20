import React, { useState } from 'react';
import { Calendar, Tag, Tooltip, Modal, Row, Col, Space, Button, Popconfirm } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
    FieldTimeOutlined,
    UserOutlined,
    SwapOutlined,
    ShopOutlined,
    ClockCircleOutlined,
    CalendarOutlined,
    EditOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import { IWorkShift, IUser } from '@/types/backend';

interface IProps {
    shifts: IWorkShift[];
    loading?: boolean;
    isAdmin?: boolean;
    employees?: IUser[];
    onOpenCreateForDate?: (date: Dayjs) => void;
    onOpenTransfer?: (shift: IWorkShift) => void;
    onOpenEdit?: (shift: IWorkShift) => void;
    onDeleteShift?: (id: string | number) => void;
}

export const getShiftColor = (shiftName: string) => {
    const name = (shiftName || '').toLowerCase();
    if (name.includes('sáng')) return '#2563eb';
    if (name.includes('chiều')) return '#0284c7';
    if (name.includes('tối')) return '#0f766e';
    if (name.includes('đêm')) return '#6d28d9';
    if (name.includes('full')) return '#059669';
    return '#4b5563';
};

const ShiftCalendarView = (props: IProps) => {
    const {
        shifts = [],
        loading = false,
        isAdmin = false,
        employees = [],
        onOpenCreateForDate,
        onOpenTransfer,
        onOpenEdit,
        onDeleteShift
    } = props;

    const [detailModalShift, setDetailModalShift] = useState<IWorkShift | null>(null);

    const dateCellRender = (currentDate: Dayjs) => {
        const dateStr = currentDate.format('YYYY-MM-DD');
        const dayShifts = shifts.filter(s => s.shiftDate === dateStr);
        const isToday = currentDate.isSame(dayjs(), 'day');

        return (
            <div style={{ minHeight: 90, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {dayShifts.slice(0, 3).map((item) => {
                        const color = getShiftColor(item.shiftName);
                        const isTransferred = item.status === 'TRANSFERRED' || (item.note && item.note.includes('[ĐÃ CHUYỂN CA]'));

                        return (
                            <div
                                key={item.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailModalShift(item);
                                }}
                                style={{
                                    background: isTransferred ? '#eff6ff' : '#f9fafb',
                                    border: `1px solid ${isTransferred ? '#bfdbfe' : '#e5e7eb'}`,
                                    borderLeft: `4px solid ${color}`,
                                    borderRadius: 4,
                                    padding: '2px 5px',
                                    fontSize: 11,
                                    lineHeight: 1.35,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                                    <span style={{ fontWeight: 700, color: color, whiteSpace: 'nowrap' }}>
                                        {item.shiftName}
                                    </span>
                                    {isTransferred && (
                                        <Tooltip title="Ca làm đã được chuyển">
                                            <SwapOutlined style={{ color: '#2563eb', fontSize: 10 }} />
                                        </Tooltip>
                                    )}
                                </div>
                                <div style={{ color: '#4b5563', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {item.startTime && item.endTime ? `${item.startTime}-${item.endTime}` : ''}
                                    {isAdmin && item.user?.name ? ` • ${item.user.name}` : ''}
                                </div>
                            </div>
                        );
                    })}

                    {dayShifts.length > 3 && (
                        <div style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#2563eb',
                            textAlign: 'center',
                            background: '#f3f4f6',
                            borderRadius: 3,
                            padding: '1px 0'
                        }}>
                            +{dayShifts.length - 3} ca khác
                        </div>
                    )}
                </div>

                {isAdmin && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenCreateForDate) {
                                onOpenCreateForDate(currentDate);
                            }
                        }}
                        style={{
                            marginTop: 4,
                            textAlign: 'center',
                            fontSize: 11,
                            color: '#6b7280',
                            cursor: 'pointer',
                            padding: '2px 0',
                            borderRadius: 3,
                            border: '1px dashed #d1d5db',
                            background: '#f9fafb'
                        }}
                    >
                        + Thêm ca
                    </div>
                )}
            </div>
        );
    };

    const cellRender = (current: Dayjs, info: { type: string; originNode: React.ReactElement }) => {
        if (info.type === 'date') {
            return dateCellRender(current);
        }
        return info.originNode;
    };

    return (
        <div>
            {/* Calendar */}
            <div style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: '16px 20px',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)'
            }}>
                <Calendar
                    cellRender={cellRender}
                    onSelect={(date, selectInfo) => {
                        if (selectInfo.source === 'date' && isAdmin && onOpenCreateForDate) {
                            onOpenCreateForDate(date);
                        }
                    }}
                />
            </div>

            {/* Modal Chi tiết Ca Làm Việc khi click vào ca trên lịch */}
            <Modal
                title={
                    <Space>
                        <FieldTimeOutlined style={{ color: '#2563eb' }} />
                        <span>Thông Tin Chi Tiết Ca Làm Việc</span>
                    </Space>
                }
                open={Boolean(detailModalShift)}
                onCancel={() => setDetailModalShift(null)}
                footer={[
                    <Button key="close" onClick={() => setDetailModalShift(null)}>
                        Đóng
                    </Button>,
                    ...(isAdmin && detailModalShift ? [
                        <Button
                            key="transfer"
                            type="primary"
                            icon={<SwapOutlined />}
                            onClick={() => {
                                const s = detailModalShift;
                                setDetailModalShift(null);
                                onOpenTransfer && onOpenTransfer(s);
                            }}
                            style={{ background: '#2563eb', borderColor: '#2563eb' }}
                        >
                            Chuyển Ca Này
                        </Button>,
                        <Button
                            key="edit"
                            icon={<EditOutlined />}
                            onClick={() => {
                                const s = detailModalShift;
                                setDetailModalShift(null);
                                onOpenEdit && onOpenEdit(s);
                            }}
                        >
                            Chỉnh Sửa
                        </Button>,
                        <Popconfirm
                            key="delete"
                            title="Xóa ca làm việc"
                            description="Bạn có chắc chắn muốn xóa ca này?"
                            onConfirm={() => {
                                if (detailModalShift?.id && onDeleteShift) {
                                    onDeleteShift(detailModalShift.id);
                                    setDetailModalShift(null);
                                }
                            }}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                        >
                            <Button danger icon={<DeleteOutlined />}>
                                Xóa
                            </Button>
                        </Popconfirm>
                    ] : [])
                ]}
                width={540}
                destroyOnClose
            >
                {detailModalShift && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 10 }}>
                        <div style={{
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            padding: '14px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                                    {detailModalShift.shiftName}
                                </span>
                                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
                                    <ClockCircleOutlined style={{ marginRight: 6, color: '#2563eb' }} />
                                    {detailModalShift.startTime || '--:--'} - {detailModalShift.endTime || '--:--'}
                                </div>
                            </div>
                            <div>
                                {detailModalShift.status === 'TRANSFERRED' ? (
                                    <Tag color="orange" icon={<SwapOutlined />}>Đã chuyển ca</Tag>
                                ) : detailModalShift.status === 'CONFIRMED' ? (
                                    <Tag color="green">Đã xác nhận</Tag>
                                ) : detailModalShift.status === 'COMPLETED' ? (
                                    <Tag color="purple">Hoàn thành</Tag>
                                ) : detailModalShift.status === 'CANCELLED' ? (
                                    <Tag color="red">Đã hủy</Tag>
                                ) : (
                                    <Tag color="blue">Đã phân ca</Tag>
                                )}
                            </div>
                        </div>

                        <Row gutter={[12, 12]}>
                            <Col span={12}>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>Ngày làm việc</div>
                                <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
                                    <CalendarOutlined style={{ marginRight: 6, color: '#2563eb' }} />
                                    {dayjs(detailModalShift.shiftDate).format('DD/MM/YYYY')} ({dayjs(detailModalShift.shiftDate).format('dddd')})
                                </div>
                            </Col>

                            <Col span={12}>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>Nhân viên đảm nhận</div>
                                <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
                                    <UserOutlined style={{ marginRight: 6, color: '#2563eb' }} />
                                    {detailModalShift.user?.name || 'Chưa gán'}
                                </div>
                                {detailModalShift.user?.email && (
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>{detailModalShift.user.email}</div>
                                )}
                            </Col>

                            <Col span={24}>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>Tiệm bánh</div>
                                <div style={{ fontWeight: 600, color: '#111827' }}>
                                    <ShopOutlined style={{ marginRight: 6, color: '#2563eb' }} />
                                    {detailModalShift.company?.name || '--'}
                                </div>
                            </Col>

                            <Col span={24}>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>Ghi chú nhiệm vụ / Nhật ký</div>
                                <div style={{
                                    background: '#f9fafb',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 6,
                                    padding: '8px 12px',
                                    color: '#374151',
                                    marginTop: 4,
                                    fontSize: 13,
                                    lineHeight: 1.5
                                }}>
                                    {detailModalShift.note || 'Không có ghi chú.'}
                                </div>
                            </Col>
                        </Row>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ShiftCalendarView;
