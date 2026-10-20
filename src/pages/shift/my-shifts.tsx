import UserShiftSchedule from '@/components/client/shift/user.shift';
import styles from '@/styles/client.module.scss';
import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';
import { HomeOutlined, ScheduleOutlined } from '@ant-design/icons';

const MyShiftsPage = () => {
    return (
        <div className={styles["container"]} style={{ paddingTop: 20, paddingBottom: 36, minHeight: '75vh' }}>
            <div style={{ marginBottom: 16 }}>
                <Breadcrumb
                    items={[
                        {
                            title: <Link to="/"><HomeOutlined /> Trang chủ</Link>,
                        },
                        {
                            title: <span><ScheduleOutlined style={{ color: '#3b82f6' }} /> Lịch ca làm việc của tôi</span>,
                        },
                    ]}
                />
            </div>

            <div style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: '24px 28px',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)'
            }}>
                <h1 style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <ScheduleOutlined style={{ color: '#3b82f6' }} />
                    Lịch Ca Làm Việc Nhân Viên
                </h1>

                <UserShiftSchedule />
            </div>
        </div>
    );
};

export default MyShiftsPage;
