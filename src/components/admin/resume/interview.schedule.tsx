import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Space, Tooltip, message, Segmented, Badge, Spin } from 'antd';
import {
    LeftOutlined,
    RightOutlined,
    CalendarOutlined,
    VideoCameraOutlined,
    ShopOutlined,
    CopyOutlined,
    EyeOutlined,
    ReloadOutlined,
    UserOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { callFetchResume } from '@/config/api';
import { IResume } from '@/types/backend';
import { useWebSocket } from '@/context/websocket.context';

dayjs.extend(isoWeek);
dayjs.extend(customParseFormat);

interface IProps {
    onOpenResumeDetail: (resume: IResume) => void;
    refreshSignal?: number;
}

const DAYS_OF_WEEK = [
    { label: 'Thứ Hai', dayIndex: 0, short: 'T2' },
    { label: 'Thứ Ba', dayIndex: 1, short: 'T3' },
    { label: 'Thứ Tư', dayIndex: 2, short: 'T4' },
    { label: 'Thứ Năm', dayIndex: 3, short: 'T5' },
    { label: 'Thứ Sáu', dayIndex: 4, short: 'T6' },
    { label: 'Thứ Bảy', dayIndex: 5, short: 'T7' },
    { label: 'Chủ Nhật', dayIndex: 6, short: 'CN' },
];

const InterviewSchedule: React.FC<IProps> = ({ onOpenResumeDetail, refreshSignal }) => {
    const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
    const [loading, setLoading] = useState<boolean>(false);
    const [resumes, setResumes] = useState<IResume[]>([]);
    const [filterType, setFilterType] = useState<string>('ALL'); // 'ALL' | 'ONLINE_MEET' | 'OFFLINE'

    const { stompClient } = useWebSocket();

    // Lấy ngày đầu tuần (Thứ Hai) và cuối tuần (Chủ Nhật)
    const startOfWeek = currentDate.startOf('isoWeek');
    const endOfWeek = currentDate.endOf('isoWeek');

    const fetchInterviews = async () => {
        setLoading(true);
        try {
            const res = await callFetchResume('page=1&size=200&sort=updatedAt,desc');
            if (res && res.data && res.data.result) {
                setResumes(res.data.result);
            }
        } catch (error) {
            console.error('Error fetching interview resumes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterviews();
    }, [refreshSignal]);

    // WebSocket real-time subscription
    useEffect(() => {
        if (stompClient && stompClient.connected) {
            const subscription = stompClient.subscribe('/topic/resumes', (msg) => {
                if (msg.body) {
                    fetchInterviews();
                }
            });
            return () => subscription.unsubscribe();
        }
    }, [stompClient]);

    // Helper kiểm tra resume có khớp với ngày cột hay không
    const matchesDay = (resume: IResume, targetDay: Dayjs) => {
        if (!resume.interviewDate) return false;

        const targetStr = targetDay.format('DD/MM/YYYY');
        if (resume.interviewDate.trim() === targetStr) return true;

        const parsed = dayjs(resume.interviewDate, ['DD/MM/YYYY', 'YYYY-MM-DD'], true);
        if (parsed.isValid() && parsed.isSame(targetDay, 'day')) return true;

        return false;
    };

    // Lọc theo hình thức phỏng vấn và loại bỏ các hồ sơ đã duyệt hoặc bị từ chối
    const filteredResumes = resumes.filter((r) => {
        if (!r.interviewDate) return false;
        // Chỉ hiển thị các hồ sơ đang trong quy trình phỏng vấn; ẩn hoàn toàn các hồ sơ đã APPROVED hoặc REJECTED
        if (r.status === 'APPROVED' || r.status === 'REJECTED') return false;
        if (filterType === 'ONLINE_MEET') return r.interviewType === 'ONLINE_MEET';
        if (filterType === 'OFFLINE') return r.interviewType === 'OFFLINE';
        return true;
    });

    // Thống kê trong tuần hiện tại
    const thisWeekResumes = filteredResumes.filter((r) => {
        for (let i = 0; i < 7; i++) {
            if (matchesDay(r, startOfWeek.add(i, 'day'))) return true;
        }
        return false;
    });

    const countOnline = thisWeekResumes.filter((r) => r.interviewType === 'ONLINE_MEET').length;
    const countOffline = thisWeekResumes.filter((r) => r.interviewType === 'OFFLINE').length;

    return (
        <div style={{ padding: '4px 0 20px 0' }}>
            {/* Thanh công cụ điều hướng & Bộ lọc (Đồng bộ trắng/xám/xanh dương nhạt) */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '14px 18px',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    marginBottom: 16,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                }}
            >
                {/* Điều hướng tuần */}
                <Space wrap size={12}>
                    <Space size={6}>
                        <Button
                            icon={<LeftOutlined />}
                            onClick={() => setCurrentDate(currentDate.subtract(1, 'week'))}
                            style={{ borderRadius: 6 }}
                        >
                            Tuần Trước
                        </Button>
                        <Button
                            onClick={() => setCurrentDate(dayjs())}
                            style={{ borderRadius: 6, fontWeight: 500 }}
                        >
                            Hôm Nay
                        </Button>
                        <Button
                            icon={<RightOutlined />}
                            onClick={() => setCurrentDate(currentDate.add(1, 'week'))}
                            style={{ borderRadius: 6 }}
                        >
                            Tuần Sau
                        </Button>
                    </Space>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 6 }}>
                        <CalendarOutlined style={{ color: '#1677ff', fontSize: 17 }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {startOfWeek.format('DD/MM/YYYY')} — {endOfWeek.format('DD/MM/YYYY')}
                        </span>
                        <span
                            style={{
                                fontSize: 12,
                                fontWeight: 500,
                                padding: '2px 8px',
                                background: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                color: '#4b5563',
                                borderRadius: 6
                            }}
                        >
                            Tuần {currentDate.isoWeek()}
                        </span>
                    </div>
                </Space>

                {/* Thống kê đồng bộ một phong cách (trắng xám nhã nhặn, không màu mè) */}
                <Space wrap size={12}>
                    <Space size={8}>
                        <div
                            style={{
                                padding: '4px 10px',
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: 6,
                                fontSize: 13,
                                color: '#374151',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <span>Tổng:</span>
                            <strong style={{ color: '#111827' }}>{thisWeekResumes.length}</strong>
                            <span style={{ color: '#6b7280', fontSize: 12 }}>cuộc hẹn</span>
                        </div>

                        <div
                            style={{
                                padding: '4px 10px',
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: 6,
                                fontSize: 13,
                                color: '#374151',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <VideoCameraOutlined style={{ color: '#6b7280' }} />
                            <span>Online:</span>
                            <strong style={{ color: '#111827' }}>{countOnline}</strong>
                        </div>

                        <div
                            style={{
                                padding: '4px 10px',
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: 6,
                                fontSize: 13,
                                color: '#374151',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <ShopOutlined style={{ color: '#6b7280' }} />
                            <span>Tại tiệm:</span>
                            <strong style={{ color: '#111827' }}>{countOffline}</strong>
                        </div>
                    </Space>

                    <Segmented
                        value={filterType}
                        onChange={(val) => setFilterType(val as string)}
                        options={[
                            { label: 'Tất cả', value: 'ALL' },
                            { label: 'Online (Meet)', value: 'ONLINE_MEET' },
                            { label: 'Tại tiệm', value: 'OFFLINE' }
                        ]}
                    />

                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchInterviews}
                        loading={loading}
                        style={{ borderRadius: 6 }}
                    >
                        Làm mới
                    </Button>
                </Space>
            </div>

            {/* Bảng 7 cột (Thứ 2 đến Chủ Nhật) */}
            <Spin spinning={loading}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, minmax(180px, 1fr))',
                        gap: 12,
                        overflowX: 'auto',
                        paddingBottom: 8
                    }}
                >
                    {DAYS_OF_WEEK.map((item) => {
                        const dayObj = startOfWeek.add(item.dayIndex, 'day');
                        const isToday = dayObj.isSame(dayjs(), 'day');

                        // Lấy các cuộc phỏng vấn trong ngày này và sắp xếp theo giờ
                        const dayInterviews = filteredResumes
                            .filter((r) => matchesDay(r, dayObj))
                            .sort((a, b) => {
                                const timeA = a.interviewTime || '00:00';
                                const timeB = b.interviewTime || '00:00';
                                return timeA.localeCompare(timeB);
                            });

                        return (
                            <div
                                key={item.dayIndex}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: isToday ? '#fafcff' : '#f9fafb',
                                    border: isToday ? '1.5px solid #1677ff' : '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    minHeight: 500,
                                    boxShadow: isToday ? '0 2px 8px rgba(22, 119, 255, 0.08)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {/* Header của Cột ngày */}
                                <div
                                    style={{
                                        padding: '10px 10px',
                                        background: isToday ? '#1677ff' : '#ffffff',
                                        color: isToday ? '#ffffff' : '#111827',
                                        borderBottom: isToday ? 'none' : '1px solid #e5e7eb',
                                        borderRadius: '7px 7px 0 0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                                            {item.label}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: isToday ? 'rgba(255, 255, 255, 0.85)' : '#6b7280',
                                                marginTop: 2
                                            }}
                                        >
                                            {dayObj.format('DD/MM')}
                                        </div>
                                    </div>
                                    <div>
                                        {isToday ? (
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: '#1677ff',
                                                    background: '#ffffff',
                                                    padding: '2px 6px',
                                                    borderRadius: 4
                                                }}
                                            >
                                                Hôm Nay
                                            </span>
                                        ) : (
                                            <Badge
                                                count={dayInterviews.length}
                                                style={{
                                                    backgroundColor: dayInterviews.length > 0 ? '#1677ff' : '#9ca3af',
                                                    color: '#ffffff'
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Body của Cột ngày: Danh sách Card */}
                                <div
                                    style={{
                                        flex: 1,
                                        padding: 8,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10
                                    }}
                                >
                                    {dayInterviews.length === 0 ? (
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                padding: '40px 10px',
                                                color: '#9ca3af',
                                                fontSize: 12
                                            }}
                                        >
                                            Không có lịch hẹn
                                        </div>
                                    ) : (
                                        dayInterviews.map((interview) => (
                                            <Card
                                                key={interview.id}
                                                size="small"
                                                hoverable
                                                style={{
                                                    borderRadius: 6,
                                                    border: '1px solid #e5e7eb',
                                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                                                    background: '#ffffff'
                                                }}
                                                bodyStyle={{ padding: '10px 12px' }}
                                            >
                                                {/* Header của Card: Giờ hẹn & Tag hình thức (đồng bộ màu) */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 4,
                                                        flexWrap: 'wrap',
                                                        marginBottom: 8
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: '#111827',
                                                            background: '#f3f4f6',
                                                            border: '1px solid #e5e7eb',
                                                            padding: '2px 6px',
                                                            borderRadius: 4
                                                        }}
                                                    >
                                                        🕒 {interview.interviewTime || '--:--'}
                                                    </span>

                                                    {interview.interviewType === 'OFFLINE' ? (
                                                        <Tag
                                                            icon={<ShopOutlined style={{ color: '#6b7280' }} />}
                                                            style={{
                                                                margin: 0,
                                                                fontSize: 11,
                                                                borderRadius: 4,
                                                                background: '#f9fafb',
                                                                border: '1px solid #e5e7eb',
                                                                color: '#374151'
                                                            }}
                                                        >
                                                            Tại tiệm
                                                        </Tag>
                                                    ) : (
                                                        <Tag
                                                            icon={<VideoCameraOutlined style={{ color: '#1677ff' }} />}
                                                            style={{
                                                                margin: 0,
                                                                fontSize: 11,
                                                                borderRadius: 4,
                                                                background: '#f9fafb',
                                                                border: '1px solid #e5e7eb',
                                                                color: '#374151'
                                                            }}
                                                        >
                                                            Online Meet
                                                        </Tag>
                                                    )}
                                                </div>

                                                {/* Tên ứng viên & Email */}
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        color: '#111827',
                                                        fontSize: 13,
                                                        marginBottom: 2,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6
                                                    }}
                                                >
                                                    <UserOutlined style={{ color: '#1677ff', fontSize: 12 }} />
                                                    <span
                                                        style={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {interview.user?.name || interview.email?.split('@')[0]}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: '#6b7280',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        marginBottom: 6
                                                    }}
                                                >
                                                    {interview.email}
                                                </div>

                                                {/* Vị trí ứng tuyển & Tiệm bánh */}
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: 500,
                                                        color: '#1677ff',
                                                        marginBottom: 2,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    💼 {interview.job?.name || 'Vị trí làm việc'}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: '#4b5563',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        marginBottom: 6
                                                    }}
                                                >
                                                    🏪 {interview.companyName || 'Tiệm Bánh'}
                                                </div>

                                                {/* Ghi chú nếu có */}
                                                {interview.note && (
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            color: '#4b5563',
                                                            background: '#f9fafb',
                                                            padding: '4px 6px',
                                                            borderRadius: 4,
                                                            border: '1px dashed #e5e7eb',
                                                            marginBottom: 8,
                                                            fontStyle: 'italic',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        📝 {interview.note}
                                                    </div>
                                                )}

                                                {/* Nút thao tác dưới Card: bố cục 2 hàng gọn gàng, không bị tràn viền */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 6,
                                                        borderTop: '1px solid #f3f4f6',
                                                        paddingTop: 8,
                                                        marginTop: 6
                                                    }}
                                                >
                                                    {interview.interviewType === 'ONLINE_MEET' && interview.meetLink && (
                                                        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                                                            <a
                                                                href={interview.meetLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ flex: 1 }}
                                                            >
                                                                <Button
                                                                    type="primary"
                                                                    size="small"
                                                                    icon={<VideoCameraOutlined />}
                                                                    style={{
                                                                        borderRadius: 4,
                                                                        fontSize: 11,
                                                                        height: 24,
                                                                        width: '100%',
                                                                        fontWeight: 500
                                                                    }}
                                                                >
                                                                    Vào Meet
                                                                </Button>
                                                            </a>
                                                            <Tooltip title="Sao chép link Google Meet">
                                                                <Button
                                                                    size="small"
                                                                    icon={<CopyOutlined />}
                                                                    style={{ borderRadius: 4, height: 24, width: 28 }}
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(interview.meetLink!);
                                                                        message.success('Đã sao chép link Google Meet!');
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        </div>
                                                    )}

                                                    <Button
                                                        size="small"
                                                        icon={<EyeOutlined />}
                                                        style={{
                                                            borderRadius: 4,
                                                            fontSize: 11,
                                                            height: 24,
                                                            width: '100%',
                                                            background: '#f9fafb',
                                                            borderColor: '#e5e7eb',
                                                            color: '#374151'
                                                        }}
                                                        onClick={() => onOpenResumeDetail(interview)}
                                                    >
                                                        Chi tiết
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Spin>
        </div>
    );
};

export default InterviewSchedule;
