import { Link } from 'react-router-dom';
import { Row, Col } from 'antd';
import {
    EnvironmentOutlined,
    PhoneOutlined,
    MailOutlined,
    SafetyCertificateOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import { GiCroissant } from 'react-icons/gi';
import styles from '@/styles/client.module.scss';

const Footer = () => {
    return (
        <footer className={styles['footer-section']}>
            <div className={styles['container']}>
                <Row gutter={[40, 32]} className={styles['footer-main']}>
                    {/* Cột 1: Thông tin thương hiệu */}
                    <Col span={24} sm={24} md={8} lg={8}>
                        <div className={styles['footer-brand']}>
                            <div className={styles['brand-header']}>
                                <GiCroissant className={styles['footer-logo-icon']} />
                                <span className={styles['footer-logo-text']}>BakeJobs</span>
                            </div>
                            <p className={styles['footer-desc']}>
                                Cổng kết nối việc làm và giải pháp nhân sự chuyên biệt cho ngành Bánh, Xưởng sản xuất bánh và Hệ thống ẩm thực F&B trên toàn quốc.
                            </p>
                            <div className={styles['footer-contact-list']}>
                                <div className={styles['contact-item']}>
                                    <EnvironmentOutlined className={styles['contact-icon']} />
                                    <span>Hệ thống tiệm bánh đối tác trên toàn quốc</span>
                                </div>
                                <div className={styles['contact-item']}>
                                    <MailOutlined className={styles['contact-icon']} />
                                    <span>support@bakejobs.vn</span>
                                </div>
                                <div className={styles['contact-item']}>
                                    <PhoneOutlined className={styles['contact-icon']} />
                                    <span>Hotline: 1900 6868 (8:00 - 18:00, T2 - T7)</span>
                                </div>
                            </div>
                        </div>
                    </Col>

                    {/* Cột 2: Dành cho Ứng viên */}
                    <Col span={24} sm={12} md={5} lg={5}>
                        <h4 className={styles['footer-col-title']}>Dành Cho Ứng Viên</h4>
                        <ul className={styles['footer-nav-list']}>
                            <li>
                                <Link to="/job">Tìm việc làm ngành bánh</Link>
                            </li>
                            <li>
                                <Link to="/company">Hệ thống tiệm bánh</Link>
                            </li>
                            <li>
                                <Link to="/job?skills=Bánh%20kem">Việc làm Thợ Bánh Kem</Link>
                            </li>
                            <li>
                                <Link to="/job?skills=Bánh%20mì">Việc làm Thợ Bánh Mì</Link>
                            </li>
                            <li>
                                <Link to="/job">Việc làm theo ca / Part-time</Link>
                            </li>
                        </ul>
                    </Col>

                    {/* Cột 3: Dành cho Nhà tuyển dụng */}
                    <Col span={24} sm={12} md={5} lg={6}>
                        <h4 className={styles['footer-col-title']}>Nhà Tuyển Dụng / Tiệm Bánh</h4>
                        <ul className={styles['footer-nav-list']}>
                            <li>
                                <Link to="/admin">Cổng quản trị tiệm bánh</Link>
                            </li>
                            <li>
                                <Link to="/admin/job">Đăng tin tuyển dụng thợ bánh</Link>
                            </li>
                            <li>
                                <Link to="/admin/resume">Quản lý hồ sơ & Xếp lịch thử việc</Link>
                            </li>
                            <li>
                                <Link to="/company">Hợp tác chuỗi tiệm bánh</Link>
                            </li>
                            <li>
                                <Link to="/admin">Giải pháp nhân sự theo ca</Link>
                            </li>
                        </ul>
                    </Col>

                    {/* Cột 4: Hỗ trợ & Quy định */}
                    <Col span={24} sm={12} md={6} lg={5}>
                        <h4 className={styles['footer-col-title']}>Quy Định & Hỗ Trợ</h4>
                        <ul className={styles['footer-nav-list']}>
                            <li>
                                <span className={styles['static-link']}>Quy chế hoạt động</span>
                            </li>
                            <li>
                                <span className={styles['static-link']}>Chính sách bảo mật thông tin</span>
                            </li>
                            <li>
                                <span className={styles['static-link']}>Điều khoản sử dụng</span>
                            </li>
                            <li>
                                <span className={styles['static-link']}>Quy trình xếp lịch thử việc</span>
                            </li>
                            <li>
                                <span className={styles['static-link']}>Hỗ trợ ứng viên 24/7</span>
                            </li>
                        </ul>
                    </Col>
                </Row>

                <div className={styles['footer-divider']}></div>

                <div className={styles['footer-bottom']}>
                    <div className={styles['copyright-text']}>
                        &copy; {new Date().getFullYear()} BakeJobs. Nền tảng tuyển dụng & kết nối nhân sự Tiệm Bánh.
                    </div>
                    <div className={styles['footer-badges']}>
                        <span className={styles['badge-item']}>
                            <SafetyCertificateOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                            Tiệm bánh xác thực
                        </span>
                        <span className={styles['badge-item']}>
                            <CheckCircleOutlined style={{ color: '#fa8c16', marginRight: 6 }} />
                            Ứng tuyển & Xếp lịch trực tiếp
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;