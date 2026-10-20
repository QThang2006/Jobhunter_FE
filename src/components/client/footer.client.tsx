import { MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { GiCroissant } from 'react-icons/gi';
import styles from '@/styles/client.module.scss';

const Footer = () => {
    return (
        <footer className={styles['footer-section']}>
            <div className={styles['container']}>
                <div className={styles['footer-slim-wrapper']}>
                    <div className={styles['footer-brand-info']}>
                        <div className={styles['brand-mini']}>
                            <GiCroissant className={styles['logo-icon-mini']} />
                            <span className={styles['logo-text-mini']}>BakeJobs</span>
                        </div>
                        <span className={styles['footer-separator']}>|</span>
                        <span className={styles['footer-desc-mini']}>
                            Nền tảng kết nối việc làm chuyên biệt ngành Bánh & F&B
                        </span>
                    </div>

                    <div className={styles['footer-contact-mini']}>
                        <a href="mailto:quocthangngo2006@gmail.com" className={styles['contact-item']}>
                            <MailOutlined style={{ color: '#6b7280' }} />
                            <span>quocthangngo2006@gmail.com</span>
                        </a>
                        <span className={styles['divider-dot']}>•</span>
                        <a href="tel:0338668016" className={styles['contact-item']}>
                            <PhoneOutlined style={{ color: '#6b7280' }} />
                            <span>0338668016</span>
                        </a>
                        <span className={styles['divider-dot']}>•</span>
                        <span className={styles['copyright-mini']}>
                            &copy; {new Date().getFullYear()} BakeJobs
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;