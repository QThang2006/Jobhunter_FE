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
                            title: <span><ScheduleOutlined style={{ color: '#d46b08' }} /> Lịch ca làm việc của tôi</span>,
                        },
                    ]}
                />
            </div>

            <div style={{
                background: '#ffffff',
                border: '1px solid #ebd9c8',
                borderRadius: 12,
                padding: '24px 28px',
                boxShadow: '0 2px 10px rgba(180, 115, 60, 0.04)'
            }}>
                <h1 style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#4a2c11',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <ScheduleOutlined style={{ color: '#d46b08' }} />
                    Lịch Ca Làm Việc Nhân Viên
                </h1>

                <UserShiftSchedule />
            </div>
        </div>
    );
};

export default MyShiftsPage;
