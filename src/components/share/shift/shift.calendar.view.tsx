import React, { useState } from 'react';
import { Calendar, Tag, Space, Button, Modal, Tooltip, Row, Col, Popconfirm } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { IWorkShift, IUser } from '@/types/backend';
import {
    CalendarOutlined,
    ClockCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    FieldTimeOutlined,
    PlusOutlined,
    ShopOutlined,
    SwapOutlined,
    UserOutlined
} from '@ant-design/icons';

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
    if (name.includes('sáng')) return '#d46b08'; // Nâu cam nướng bánh
    if (name.includes('chiều')) return '#1677ff'; // Xanh dương
    if (name.includes('tối')) return '#13c2c2';  // Cyan
    if (name.includes('đêm')) return '#722ed1';  // Tím
    if (name.includes('full')) return '#52c41a'; // Xanh lá
    return '#fa8c16';
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
                                    background: isTransferred ? '#fff7e6' : '#fffaf5',
                                    border: `1px solid ${isTransferred ? '#ffa940' : '#ebd9c8'}`,
                                    borderLeft: `4px solid ${color}`,
                                    borderRadius: 4,
                                    padding: '2px 5px',
                                    fontSize: 11,
                                    lineHeight: 1.35,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                                    <span style={{ fontWeight: 700, color: color, whiteSpace: 'nowrap' }}>
                                        {item.shiftName}
                                    </span>
                                    {isTransferred && (
                                        <Tooltip title="Ca làm đã được chuyển">
                                            <SwapOutlined style={{ color: '#d46b08', fontSize: 10 }} />
                                        </Tooltip>
                                    )}
                                </div>
                                <div style={{ color: '#5c4a3d', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
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
                            color: '#d46b08',
                            textAlign: 'center',
                            background: '#fffaf5',
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
                            color: '#8c7b70',
                            cursor: 'pointer',
                            padding: '2px 0',
                            borderRadius: 3,
                            border: '1px dashed #ebd9c8',
                            background: '#faf6f0'
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
                border: '1px solid #ebd9c8',
                borderRadius: 12,
                padding: '16px 20px',
                boxShadow: '0 2px 10px rgba(180, 115, 60, 0.04)'
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
                        <FieldTimeOutlined style={{ color: '#d46b08' }} />
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
                            style={{ background: '#d46b08', borderColor: '#d46b08' }}
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
                            background: '#fffaf5',
                            border: '1px solid #ebd9c8',
                            borderRadius: 8,
                            padding: '14px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#4a2c11' }}>
                                    {detailModalShift.shiftName}
                                </span>
                                <div style={{ color: '#7a6b61', fontSize: 13, marginTop: 2 }}>
                                    <ClockCircleOutlined style={{ marginRight: 6, color: '#d46b08' }} />
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
                                <div style={{ fontSize: 12, color: '#8c7b70' }}>Ngày làm việc</div>
                                <div style={{ fontWeight: 600, color: '#4a2c11', fontSize: 14 }}>
                                    <CalendarOutlined style={{ marginRight: 6, color: '#d46b08' }} />
                                    {dayjs(detailModalShift.shiftDate).format('DD/MM/YYYY')} ({dayjs(detailModalShift.shiftDate).format('dddd')})
                                </div>
                            </Col>

                            <Col span={12}>
                                <div style={{ fontSize: 12, color: '#8c7b70' }}>Nhân viên đảm nhận</div>
                                <div style={{ fontWeight: 600, color: '#4a2c11', fontSize: 14 }}>
                                    <UserOutlined style={{ marginRight: 6, color: '#d46b08' }} />
                                    {detailModalShift.user?.name || 'Chưa gán'}
                                </div>
                                {detailModalShift.user?.email && (
                                    <div style={{ fontSize: 12, color: '#8c7b70' }}>{detailModalShift.user.email}</div>
                                )}
                            </Col>

                            <Col span={24}>
                                <div style={{ fontSize: 12, color: '#8c7b70' }}>Tiệm bánh</div>
                                <div style={{ fontWeight: 600, color: '#4a2c11' }}>
                                    <ShopOutlined style={{ marginRight: 6, color: '#d46b08' }} />
                                    {detailModalShift.company?.name || '--'}
                                </div>
                            </Col>

                            <Col span={24}>
                                <div style={{ fontSize: 12, color: '#8c7b70' }}>Ghi chú nhiệm vụ / Nhật ký</div>
                                <div style={{
                                    background: '#faf6f0',
                                    border: '1px solid #ebd9c8',
                                    borderRadius: 6,
                                    padding: '8px 12px',
                                    color: '#4a382e',
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
