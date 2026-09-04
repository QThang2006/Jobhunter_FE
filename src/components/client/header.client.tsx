import { useState, useEffect } from 'react';
import { CodeOutlined, ContactsOutlined, FireOutlined, LogoutOutlined, MenuFoldOutlined, RiseOutlined, TwitterOutlined } from '@ant-design/icons';
import { Avatar, Drawer, Dropdown, MenuProps, Space, message } from 'antd';
import { Menu, ConfigProvider } from 'antd';
import styles from '@/styles/client.module.scss';
import { isMobile } from 'react-device-detect';
import { FaReact } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { callLogout } from '@/config/api';
import { setLogoutAction } from '@/redux/slice/accountSlide';
import ManageAccount from './modal/manage.account';
import NotificationBell from '@/components/share/notification-bell';

const Header = (props: any) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const user = useAppSelector(state => state.account.user);
    const [openMobileMenu, setOpenMobileMenu] = useState<boolean>(false);

    const [current, setCurrent] = useState('home');
    const location = useLocation();

    const [openMangeAccount, setOpenManageAccount] = useState<boolean>(false);

    useEffect(() => {
        setCurrent(location.pathname);
    }, [location])

    const items: MenuProps['items'] = [
        {
            label: <Link to={'/'}>Trang Chủ</Link>,
            key: '/',
            icon: <TwitterOutlined />,
        },
        {
            label: <Link to={'/job'}>Việc Làm IT</Link>,
            key: '/job',
            icon: <CodeOutlined />,
        },
        {
            label: <Link to={'/company'}>Top Công ty IT</Link>,
            key: '/company',
            icon: <RiseOutlined />,
        }
    ];



    const onClick: MenuProps['onClick'] = (e) => {
        setCurrent(e.key);
    };

    const handleLogout = async () => {
        const res = await callLogout();
        if (res && res && +res.statusCode === 200) {
            dispatch(setLogoutAction({}));
            message.success('Đăng xuất thành công');
            navigate('/')
        }
    }

    const itemsDropdown = [
        {
            label: <label
                style={{ cursor: 'pointer' }}
                onClick={() => {
                    setOpenManageAccount(true);
                    setOpenMobileMenu(false);
                }}
            >Quản lý tài khoản</label>,
            key: 'manage-account',
            icon: <ContactsOutlined />
        },
        ...(user.role?.permissions?.length ? [{
            label: <Link
                to={"/admin"}
                onClick={() => setOpenMobileMenu(false)}
            >Trang Quản Trị</Link>,
            key: 'admin',
            icon: <FireOutlined />
        },] : []),

        {
            label: <label
                style={{ cursor: 'pointer' }}
                onClick={() => {
                    handleLogout();
                    setOpenMobileMenu(false);
                }}
            >Đăng xuất</label>,
            key: 'logout',
            icon: <LogoutOutlined />
        },
    ];

    const itemsMobiles = [
        {
            label: <Link to={'/'} onClick={() => setOpenMobileMenu(false)}>Trang Chủ</Link>,
            key: '/',
            icon: <TwitterOutlined />,
        },
        {
            label: <Link to={'/job'} onClick={() => setOpenMobileMenu(false)}>Việc Làm IT</Link>,
            key: '/job',
            icon: <CodeOutlined />,
        },
        {
            label: <Link to={'/company'} onClick={() => setOpenMobileMenu(false)}>Top Công ty IT</Link>,
            key: '/company',
            icon: <RiseOutlined />,
        },
        ...itemsDropdown
    ];

    return (
        <>
            <div className={styles["header-section"]}>
                <div className={styles["container"]}>
                    <div className={styles["header-wrapper"]}>
                        <div className={styles['brand']} onClick={() => navigate('/')}>
                            <FaReact className={styles['logo-icon']} title='JobHunter' />
                            <span className={styles['logo-text']}>JobHunter</span>
                        </div>

                        <div className={styles['top-menu-desktop']}>
                            <ConfigProvider
                                theme={{
                                    token: {
                                        colorPrimary: '#fff',
                                        colorBgContainer: '#222831',
                                        colorText: '#a7a7a7',
                                    },
                                }}
                            >
                                <Menu
                                    selectedKeys={[current]}
                                    mode="horizontal"
                                    items={items}
                                />
                            </ConfigProvider>

                            <div className={styles['extra']}>
                                {isAuthenticated === false ?
                                    <Link to={'/login'}>Đăng Nhập</Link>
                                    :
                                    <Space size={12} align="center">
                                        <NotificationBell />
                                        <Dropdown menu={{ items: itemsDropdown }} trigger={['click']}>
                                            <Space style={{ cursor: "pointer" }}>
                                                <span>Welcome {user?.name}</span>
                                                <Avatar> {user?.name?.substring(0, 2)?.toUpperCase()} </Avatar>
                                            </Space>
                                        </Dropdown>
                                    </Space>
                                }
                            </div>
                        </div>

                        <div className={styles['header-mobile-trigger']}>
                            {isAuthenticated && <NotificationBell />}
                            <MenuFoldOutlined
                                className={styles['hamburger-icon']}
                                onClick={() => setOpenMobileMenu(true)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <Drawer
                title={
                    isAuthenticated ? (
                        <Space align="center">
                            <Avatar>{user?.name?.substring(0, 2)?.toUpperCase()}</Avatar>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.name}</div>
                                <div style={{ fontSize: 12, color: '#888' }}>{user?.email}</div>
                            </div>
                        </Space>
                    ) : "Danh mục Chức năng"
                }
                placement="right"
                onClose={() => setOpenMobileMenu(false)}
                open={openMobileMenu}
                width={280}
            >
                <Menu
                    onClick={(e) => {
                        onClick(e);
                        setOpenMobileMenu(false);
                    }}
                    selectedKeys={[current]}
                    mode="vertical"
                    items={
                        isAuthenticated
                            ? itemsMobiles
                            : [
                                ...items.map(item => ({
                                    ...item,
                                    label: <Link to={item.key} onClick={() => setOpenMobileMenu(false)}>{(item.label as any)?.props?.children ?? item.label}</Link>
                                })),
                                {
                                    label: <Link to={'/login'} onClick={() => setOpenMobileMenu(false)}>Đăng Nhập</Link>,
                                    key: '/login',
                                    icon: <LogoutOutlined />
                                }
                            ]
                    }
                />
            </Drawer>

            <ManageAccount
                open={openMangeAccount}
                onClose={setOpenManageAccount}
            />
        </>
    )
};

export default Header;