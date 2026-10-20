import { MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Space } from 'antd';
import { GiCroissant } from 'react-icons/gi';
import styles from '@/styles/client.module.scss';

const Footer = () => {
    return (
        <footer className={styles['footer-section']}>
            <div className={styles['container']}>
                <div className={styles['footer-compact-wrapper']}>
                    {/* Logo thương hiệu */}
                    <div className={styles['footer-brand-header']}>
                        <GiCroissant className={styles['footer-logo-icon']} />
                        <span className={styles['footer-logo-text']}>BakeJobs</span>
                    </div>

                    {/* Miêu tả */}
                    <p className={styles['footer-desc-compact']}>
                        Nền tảng kết nối việc làm và nhân sự chuyên biệt cho ngành Bánh, Xưởng bánh và Chuỗi F&B trên toàn quốc.
                    </p>

                    {/* Thông tin liên hệ */}
                    <div className={styles['footer-contact-compact']}>
                        <Space size={20} wrap align="center">
                            <span className={styles['contact-item']}>
                                <MailOutlined className={styles['contact-icon']} />
                                <a href="mailto:quocthangngo2006@gmail.com">quocthangngo2006@gmail.com</a>
                            </span>
                            <span className={styles['contact-divider']}>•</span>
                            <span className={styles['contact-item']}>
                                <PhoneOutlined className={styles['contact-icon']} />
                                <a href="tel:0338668016">Hotline: 0338668016</a>
                            </span>
                        </Space>
                    </div>

                    {/* Bản quyền */}
                    <div className={styles['footer-copyright-compact']}>
                        &copy; {new Date().getFullYear()} BakeJobs. Nền tảng tuyển dụng & kết nối nhân sự Tiệm Bánh.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;