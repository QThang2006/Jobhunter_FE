import React, { useState, useEffect } from 'react';
import {
    AppstoreOutlined,
    ExceptionOutlined,
    ApiOutlined,
    UserOutlined,
    BankOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    AliwangwangOutlined,
    BugOutlined,
    ScheduleOutlined,
    MenuOutlined,
    CloseOutlined,
    LogoutOutlined,
    HomeOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Dropdown, Space, message, Avatar, Button, Drawer, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Link } from 'react-router-dom';
import { callLogout } from 'config/api';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { isMobile } from 'react-device-detect';
import type { MenuProps } from 'antd';
import { setLogoutAction } from '@/redux/slice/accountSlide';
import { ALL_PERMISSIONS } from '@/config/permissions';
import NotificationBell from '@/components/share/notification-bell';

const { Content, Sider } = Layout;
const { Text } = Typography;

const LayoutAdmin = () => {
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState('');
    const user = useAppSelector(state => state.account.user);

    const permissions = useAppSelector(state => state.account.user.role.permissions);
    const [menuItems, setMenuItems] = useState<MenuProps['items']>([]);

    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    useEffect(() => {
        const ACL_ENABLE = import.meta.env.VITE_ACL_ENABLE;
        if (permissions?.length || ACL_ENABLE === 'false') {

            const viewCompany = permissions?.find(item =>
                item.apiPath === ALL_PERMISSIONS.COMPANIES.GET_PAGINATE.apiPath
                && item.method === ALL_PERMISSIONS.COMPANIES.GET_PAGINATE.method
            )

            const viewUser = permissions?.find(item =>
                item.apiPath === ALL_PERMISSIONS.USERS.GET_PAGINATE.apiPath
                && item.method === ALL_PERMISSIONS.USERS.GET_PAGINATE.method
            )

            const viewJob = permissions?.find(item =>
                item.apiPath === ALL_PERMISSIONS.JOBS.GET_PAGINATE.apiPath
                && item.method === ALL_PERMISSIONS.JOBS.GET_PAGINATE.method
            )

            const viewResume = permissions?.find(item =>
                item.apiPath === ALL_PERMISSIONS.RESUMES.GET_PAGINATE.apiPath
                && item.method === ALL_PERMISSIONS.RESUMES.GET_PAGINATE.method
            )

            const viewRole = permissions?.find(item =>
                item.apiPath === ALL_PERMISSIONS.ROLES.GET_PAGINATE.apiPath
                && item.method === ALL_PERMISSIONS.ROLES.GET_PAGINATE.method
            )

            const viewPermission = permissions?.find(item =>
                item.apiPath === ALL_PERMISSIONS.PERMISSIONS.GET_PAGINATE.apiPath
                && item.method === ALL_PERMISSIONS.USERS.GET_PAGINATE.method
            )
            const full = [
                ...(user.role.name === 'SUPER_ADMIN' || ACL_ENABLE === 'false' ? [{
                    label: <Link to='/admin'>Dashboard</Link>,
                    key: '/admin',
                    icon: <AppstoreOutlined />
                }] : []),

                ...(viewCompany || ACL_ENABLE === 'false' ? [{
                    label: <Link to='/admin/company'>Company</Link>,
                    key: '/admin/company',
                    icon: <BankOutlined />,
                }] : []),

                ...(viewUser || ACL_ENABLE === 'false' ? [{
                    label: <Link to='/admin/user'>User</Link>,
                    key: '/admin/user',
                    icon: <UserOutlined />
                }] : []),
                ...(viewJob || ACL_ENABLE === 'false' ? [{
                    label: <Link to='/admin/job'>Job</Link>,
                    key: '/admin/job',
                    icon: <ScheduleOutlined />
                }] : []),

                ...(viewResume || ACL_ENABLE === 'false' ? [{
                    label: <Link to='/admin/resume'>Resume</Link>,
                    key: '/admin/resume',
                    icon: <AliwangwangOutlined />
                }] : []),
                ...(viewPermission || ACL_ENABLE === 'false' ? [{
                    label: <Link to='/admin/permission'>Permission</Link>,
                    key: '/admin/permission',
                    icon: <ApiOutlined />
                }] : []),
                ...(viewRole || ACL_ENABLE === 'false' ? [{
                    label: <Link to='/admin/role'>Role</Link>,
                    key: '/admin/role',
                    icon: <ExceptionOutlined />
                }] : []),
            ];

            setMenuItems(full);
        }
    }, [permissions])

    useEffect(() => {
        setActiveMenu(location.pathname)
        // Close mobile drawer on route change
        setMobileDrawerOpen(false);

        // TỰ ĐỘNG REDIRECT CHO NON-SUPER-ADMIN
        if (location.pathname === '/admin' && user.role.name !== 'SUPER_ADMIN' && menuItems && menuItems.length > 0) {
            const firstItem: any = menuItems[0];
            if (firstItem && firstItem.key) {
                navigate(firstItem.key);
            }
        }
    }, [location, menuItems, user.role.name])

    const handleLogout = async () => {
        const res = await callLogout();
        if (res && +res.statusCode === 200) {
            dispatch(setLogoutAction({}));
            message.success('Đăng xuất thành công');
            navigate('/')
        }
    }

    const itemsDropdown = [
        {
            label: <Link to={'/'}><HomeOutlined /> Trang chủ</Link>,
            key: 'home',
        },
        {
            type: 'divider' as const,
        },
        {
            label: <span style={{ color: '#ff4d4f' }}><LogoutOutlined /> Đăng xuất</span>,
            key: 'logout',
            onClick: () => handleLogout(),
        },
    ];

    // ─────────────────────── MOBILE LAYOUT ───────────────────────
    if (isMobile) {
        return (
            <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
                {/* Mobile Header */}
                <div className="mobile-admin-header">
                    <Button
                        type="text"
                        icon={<MenuOutlined />}
                        onClick={() => setMobileDrawerOpen(true)}
                        className="mobile-menu-btn"
                    />

                    <div className="mobile-admin-logo">
                        <BugOutlined className="logo-icon" />
                        <span className="logo-text">ADMIN</span>
                    </div>

                    <Space size={8} align="center">
                        <NotificationBell />
                        <Dropdown menu={{ items: itemsDropdown }} trigger={['click']} placement="bottomRight">
                            <Avatar
                                size={36}
                                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                            >
                                {user?.name?.substring(0, 2)?.toUpperCase()}
                            </Avatar>
                        </Dropdown>
                    </Space>
                </div>

                {/* Mobile Drawer Sidebar */}
                <Drawer
                    placement="left"
                    open={mobileDrawerOpen}
                    onClose={() => setMobileDrawerOpen(false)}
                    width={280}
                    styles={{ body: { padding: 0 } }}
                    closeIcon={false}
                    className="mobile-admin-drawer"
                >
                    {/* Drawer Header */}
                    <div className="drawer-header">
                        <div className="drawer-user-info">
                            <Avatar
                                size={48}
                                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontSize: 16, fontWeight: 700 }}
                            >
                                {user?.name?.substring(0, 2)?.toUpperCase()}
                            </Avatar>
                            <div className="drawer-user-details">
                                <Text strong style={{ color: '#fff', fontSize: 15 }}>{user?.name}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'block' }}>{user?.role?.name}</Text>
                            </div>
                        </div>
                        <Button
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={() => setMobileDrawerOpen(false)}
                            style={{ color: '#fff', marginTop: -8 }}
                        />
                    </div>

                    {/* Navigation Menu */}
                    <Menu
                        selectedKeys={[activeMenu]}
                        mode="inline"
                        items={menuItems}
                        onClick={(e) => {
                            setActiveMenu(e.key);
                            setMobileDrawerOpen(false);
                        }}
                        className="mobile-admin-menu"
                        style={{ border: 'none', flex: 1 }}
                    />

                    {/* Drawer Footer */}
                    <div className="drawer-footer">
                        <Button
                            danger
                            type="text"
                            icon={<HomeOutlined />}
                            onClick={() => navigate('/')}
                            block
                            style={{ textAlign: 'left', marginBottom: 4 }}
                        >
                            Trang chủ
                        </Button>
                        <Button
                            danger
                            type="text"
                            icon={<LogoutOutlined />}
                            onClick={() => handleLogout()}
                            block
                            style={{ textAlign: 'left' }}
                        >
                            Đăng xuất
                        </Button>
                    </div>
                </Drawer>

                {/* Main Content */}
                <Content className="mobile-admin-content">
                    <Outlet />
                </Content>
            </Layout>
        );
    }

    // ─────────────────────── DESKTOP LAYOUT ───────────────────────
    return (
        <>
            <Layout
                style={{ minHeight: '100vh' }}
                className="layout-admin"
            >
                <Sider
                    theme='light'
                    collapsible
                    collapsed={collapsed}
                    onCollapse={(value) => setCollapsed(value)}>
                    <div style={{ height: 32, margin: 16, textAlign: 'center' }}>
                        <BugOutlined />  ADMIN
                    </div>
                    <Menu
                        selectedKeys={[activeMenu]}
                        mode="inline"
                        items={menuItems}
                        onClick={(e) => setActiveMenu(e.key)}
                    />
                </Sider>

                <Layout>
                    <div className='admin-header' style={{ display: "flex", justifyContent: "space-between", marginRight: 20, alignItems: "center" }}>
                        <Button
                            type="text"
                            icon={collapsed ? React.createElement(MenuUnfoldOutlined) : React.createElement(MenuFoldOutlined)}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{
                                fontSize: '16px',
                                width: 64,
                                height: 64,
                            }}
                        />

                        <Space size={16} align="center">
                            <NotificationBell />
                            <Dropdown menu={{ items: itemsDropdown }} trigger={['click']}>
                                <Space style={{ cursor: "pointer" }}>
                                    Welcome {user?.name}
                                    <Avatar> {user?.name?.substring(0, 2)?.toUpperCase()} </Avatar>
                                </Space>
                            </Dropdown>
                        </Space>
                    </div>
                    <Content style={{ padding: '15px' }}>
                        <Outlet />
                    </Content>
                </Layout>
            </Layout>
        </>
    );
};

export default LayoutAdmin;