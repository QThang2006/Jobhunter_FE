import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Space, Tooltip, message, Segmented, Row, Col, Badge, Empty, Spin } from 'antd';
import {
    LeftOutlined,
    RightOutlined,
    CalendarOutlined,
    VideoCameraOutlined,
    ShopOutlined,
    CopyOutlined,
    EyeOutlined,
    ReloadOutlined,
    UserOutlined,
    CheckCircleOutlined
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
            // Lấy danh sách hồ sơ (tối đa 200 bản ghi mới nhất)
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

    // Lọc theo hình thức phỏng vấn
    const filteredResumes = resumes.filter((r) => {
        if (!r.interviewDate) return false;
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
            {/* Thanh công cụ điều hướng & Bộ lọc */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '16px 20px',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    marginBottom: 16,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                }}
            >
                {/* Điều hướng tuần */}
                <Space wrap size={12}>
                    <Space>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                        <CalendarOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                            {startOfWeek.format('DD/MM/YYYY')} — {endOfWeek.format('DD/MM/YYYY')}
                        </span>
                        <Tag color="blue" style={{ borderRadius: 4, marginLeft: 4 }}>
                            Tuần {currentDate.isoWeek()}
                        </Tag>
                    </div>
                </Space>

                {/* Thống kê & Bộ lọc hình thức */}
                <Space wrap size={14}>
                    <Space size={6}>
                        <Tag color="default" style={{ padding: '3px 8px', borderRadius: 4 }}>
                            Tổng: <strong>{thisWeekResumes.length}</strong> cuộc hẹn
                        </Tag>
                        <Tag color="blue" style={{ padding: '3px 8px', borderRadius: 4 }}>
                            <VideoCameraOutlined style={{ marginRight: 4 }} />
                            Online: <strong>{countOnline}</strong>
                        </Tag>
                        <Tag color="orange" style={{ padding: '3px 8px', borderRadius: 4 }}>
                            <ShopOutlined style={{ marginRight: 4 }} />
                            Tại tiệm: <strong>{countOffline}</strong>
                        </Tag>
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
                        gridTemplateColumns: 'repeat(7, minmax(200px, 1fr))',
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
                                    minHeight: 520,
                                    boxShadow: isToday ? '0 2px 8px rgba(22, 119, 255, 0.08)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {/* Header của Cột ngày */}
                                <div
                                    style={{
                                        padding: '12px 10px',
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
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>
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
                                            <Tag color="cyan" style={{ margin: 0, borderRadius: 4, fontWeight: 500 }}>
                                                Hôm Nay
                                            </Tag>
                                        ) : (
                                            <Badge
                                                count={dayInterviews.length}
                                                style={{
                                                    backgroundColor: dayInterviews.length > 0 ? '#1677ff' : '#d1d5db',
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
                                                {/* Header của Card: Giờ hẹn & Tag hình thức */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        marginBottom: 8
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            color: '#0958d9',
                                                            background: '#e6f4ff',
                                                            padding: '2px 6px',
                                                            borderRadius: 4
                                                        }}
                                                    >
                                                        🕒 {interview.interviewTime || '--:--'}
                                                    </span>

                                                    {interview.interviewType === 'OFFLINE' ? (
                                                        <Tag
                                                            color="orange"
                                                            icon={<ShopOutlined />}
                                                            style={{ margin: 0, fontSize: 11, borderRadius: 4 }}
                                                        >
                                                            Tại tiệm
                                                        </Tag>
                                                    ) : (
                                                        <Tag
                                                            color="blue"
                                                            icon={<VideoCameraOutlined />}
                                                            style={{ margin: 0, fontSize: 11, borderRadius: 4 }}
                                                        >
                                                            Meet
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

                                                {/* Nút thao tác dưới Card */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 6,
                                                        borderTop: '1px solid #f3f4f6',
                                                        paddingTop: 8,
                                                        marginTop: 4
                                                    }}
                                                >
                                                    {interview.interviewType === 'ONLINE_MEET' && interview.meetLink ? (
                                                        <Space size={4}>
                                                            <a
                                                                href={interview.meetLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Button
                                                                    type="primary"
                                                                    size="small"
                                                                    icon={<VideoCameraOutlined />}
                                                                    style={{ borderRadius: 4, fontSize: 11, height: 24, padding: '0 8px' }}
                                                                >
                                                                    Vào Meet
                                                                </Button>
                                                            </a>
                                                            <Tooltip title="Copy link phòng họp">
                                                                <Button
                                                                    size="small"
                                                                    icon={<CopyOutlined />}
                                                                    style={{ borderRadius: 4, height: 24, padding: '0 6px' }}
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(interview.meetLink!);
                                                                        message.success('Đã sao chép link Google Meet!');
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        </Space>
                                                    ) : (
                                                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Trực tiếp</span>
                                                    )}

                                                    <Button
                                                        size="small"
                                                        icon={<EyeOutlined />}
                                                        style={{ borderRadius: 4, fontSize: 11, height: 24, padding: '0 8px' }}
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
