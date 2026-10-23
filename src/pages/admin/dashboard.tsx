import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Space, Avatar, Button, notification, message } from "antd";
import {
    UserOutlined,
    TeamOutlined,
    FileTextOutlined,
    BankOutlined,
    RiseOutlined,
    FallOutlined,
    ClockCircleOutlined,
    MailOutlined,
    SolutionOutlined
} from '@ant-design/icons';
import CountUp from 'react-countup';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { callFetchUser, callFetchCompany, callFetchJobAdmin, callFetchResume, callSendIntroEmail } from '@/config/api';
import { IResume, IBackendRes, IModelPaginate } from '@/types/backend';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

interface IDashboardStats {
    totalUsers: number;
    totalCompanies: number;
    totalJobs: number;
    totalResumes: number;
    userGrowth: number;
    companyGrowth: number;
    jobGrowth: number;
    resumeGrowth: number;
}

interface ITopCompany {
    id: number;
    name: string;
    logo: string;
    jobCount: number;
}

import { useAppSelector } from '@/redux/hooks';
import { Result } from 'antd';

const fetchEveryPage = async <T,>(fetchPage: (query: string) => Promise<IBackendRes<IModelPaginate<T>>>) => {
    const first = await fetchPage('page=1&size=200&sort=createdAt,desc');
    if (!first.data) throw new Error('Không thể tải dữ liệu thống kê');
    const result = [...first.data.result];
    for (let page = 2; page <= first.data.meta.pages; page++) {
        const next = await fetchPage(`page=${page}&size=200&sort=createdAt,desc`);
        if (!next.data) throw new Error('Không thể tải đủ dữ liệu thống kê');
        result.push(...next.data.result);
    }
    return { ...first, data: { ...first.data, result } };
};

const DashboardPage = () => {
    const userRole = useAppSelector(state => state.account.user.role.name);

    const [stats, setStats] = useState<IDashboardStats>({
        totalUsers: 0,
        totalCompanies: 0,
        totalJobs: 0,
        totalResumes: 0,
        userGrowth: 0,
        companyGrowth: 0,
        jobGrowth: 0,
        resumeGrowth: 0
    });
    const [recentResumes, setRecentResumes] = useState<IResume[]>([]);
    const [topCompanies, setTopCompanies] = useState<ITopCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isEmailLoading, setIsEmailLoading] = useState(false);

    useEffect(() => {
        if (userRole === 'SUPER_ADMIN') {
            fetchDashboardData();
        }
    }, [userRole]);

    const handleSendEmail = async () => {
        setIsEmailLoading(true);
        try {
            const res = await callSendIntroEmail();

            message.success("Gửi email giới thiệu công việc thành công!");

        }
        finally {
            setIsEmailLoading(false);
        }
    }

    if (userRole !== 'SUPER_ADMIN') {
        return (
            <Result
                status="403"
                title="403"
                subTitle="Xin lỗi, bạn không có quyền truy cập bảng thông tin này."
            />
        );
    }

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch all data in parallel (include both page/size for Spring Data and current/pageSize)
            const [usersRes, companiesRes, jobsRes, resumesRes] = await Promise.all([
                fetchEveryPage(callFetchUser),
                fetchEveryPage(callFetchCompany),
                fetchEveryPage(callFetchJobAdmin),
                fetchEveryPage(callFetchResume)
            ]);

            // Calculate stats
            const totalUsers = usersRes.data?.meta?.total || 0;
            const totalCompanies = companiesRes.data?.meta?.total || 0;
            const totalJobs = jobsRes.data?.meta?.total || 0;
            const totalResumes = resumesRes.data?.meta?.total || 0;

            // Hàm tính toán phần trăm tăng trưởng so với tháng trước một cách chính xác
            const calculateMetricGrowth = (items: any[] = [], totalCurrent: number): number => {
                const now = dayjs();
                const startOfCurrentMonth = now.startOf('month');

                // Lọc những bản ghi hợp lệ được tạo trước ngày đầu tiên của tháng hiện tại (tính đến hết tháng trước)
                const countBeforeThisMonth = items.filter((item: any) =>
                    item && item.createdAt && dayjs(item.createdAt).isValid() && dayjs(item.createdAt).isBefore(startOfCurrentMonth)
                ).length;

                // 1. Nếu hệ thống đã có dữ liệu trước tháng này: Tỷ lệ tăng trưởng tổng số lượng (Cumulative Growth)
                if (countBeforeThisMonth > 0) {
                    const growth = ((totalCurrent - countBeforeThisMonth) / countBeforeThisMonth) * 100;
                    return Number(growth.toFixed(1));
                }

                // 2. Nếu trước tháng này chưa có dữ liệu và tháng này bắt đầu có phát sinh (ví dụ: công ty mới, CV mới): Tăng trưởng mới 100%
                if (totalCurrent > 0) {
                    return 100;
                }

                return 0;
            };

            const userGrowth = calculateMetricGrowth(usersRes.data?.result, totalUsers);
            const companyGrowth = calculateMetricGrowth(companiesRes.data?.result, totalCompanies);
            const jobGrowth = calculateMetricGrowth(jobsRes.data?.result, totalJobs);
            const resumeGrowth = calculateMetricGrowth(resumesRes.data?.result, totalResumes);

            setStats({
                totalUsers,
                totalCompanies,
                totalJobs,
                totalResumes,
                userGrowth,
                companyGrowth,
                jobGrowth,
                resumeGrowth
            });

            // Set recent resumes with manual population
            if (resumesRes.data?.result) {
                const recent = resumesRes.data.result.slice(0, 5);
                const companies = companiesRes.data?.result || [];
                const jobs = jobsRes.data?.result || [];

                const populatedResumes = recent.map((resume: any) => {
                    // Company: Use existing object if available, otherwise find in list
                    let company = typeof resume.companyId === 'object' ? resume.companyId : null;
                    if (!company) {
                        const companyIdStr = resume.companyId;
                        company = companies.find((c: any) => c.id == companyIdStr);
                    }

                    // Job: Use existing object if available, otherwise find in list
                    let job = resume.job ?? (typeof resume.jobId === 'object' ? resume.jobId : null);
                    if (!job) {
                        const jobIdStr = resume.jobId;
                        job = jobs.find((j: any) => j.id == jobIdStr);
                    }

                    return {
                        ...resume,
                        companyId: company ? { id: company.id, name: company.name, logo: company.logo } : { name: resume.companyName || 'N/A' },
                        jobId: job ? { id: job.id, name: job.name } : { name: 'N/A' }
                    };
                });

                setRecentResumes(populatedResumes);
            }

            // Calculate top companies by job count
            if (jobsRes.data?.result && companiesRes.data?.result) {
                const companyJobCount: { [key: string]: number } = {};
                jobsRes.data.result.forEach((job: any) => {
                    const companyId = job.company?.id;
                    if (companyId) {
                        companyJobCount[companyId] = (companyJobCount[companyId] || 0) + 1;
                    }
                });

                const topComps = companiesRes.data.result
                    .map((company: any) => ({
                        id: company.id,
                        name: company.name,
                        logo: company.logo,
                        jobCount: companyJobCount[company.id] || 0
                    }))
                    .sort((a: any, b: any) => b.jobCount - a.jobCount)
                    .slice(0, 5);

                setTopCompanies(topComps);
            }

            // Generate REAL chart data based on actual createdAt dates (last 6 months)
            const chartMonths = [];
            const monthlyData: { [key: string]: { jobs: number; resumes: number; users: number } } = {};

            // Initialize last 6 months
            for (let i = 5; i >= 0; i--) {
                const monthDate = dayjs().subtract(i, 'month');
                const monthKey = monthDate.format('YYYY-MM');
                const monthLabel = monthDate.format('MM/YYYY');
                chartMonths.push({ key: monthKey, label: monthLabel });
                monthlyData[monthKey] = { jobs: 0, resumes: 0, users: 0 };
            }

            // Count actual data by month
            usersRes.data?.result?.forEach((user: any) => {
                const monthKey = dayjs(user.createdAt).format('YYYY-MM');
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].users++;
                }
            });

            jobsRes.data?.result?.forEach((job: any) => {
                const monthKey = dayjs(job.createdAt).format('YYYY-MM');
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].jobs++;
                }
            });

            resumesRes.data?.result?.forEach((resume: any) => {
                const monthKey = dayjs(resume.createdAt).format('YYYY-MM');
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].resumes++;
                }
            });

            // Build chart data
            const realChartData = chartMonths.map(({ key, label }) => ({
                month: label,
                jobs: monthlyData[key].jobs,
                resumes: monthlyData[key].resumes,
                users: monthlyData[key].users
            }));

            setChartData(realChartData);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatter = (value: number | string) => {
        return <CountUp end={Number(value)} separator="," />;
    };

    const statusColors: { [key: string]: string } = {
        PENDING: 'gold',
        REVIEWING: 'blue',
        APPROVED: 'green',
        REJECTED: 'red'
    };

    const recentResumeColumns = [
        {
            title: 'Ứng viên',
            dataIndex: 'email',
            key: 'email',
            render: (email: string) => (
                <Space>
                    <Avatar icon={<UserOutlined />} />
                    <span>{email}</span>
                </Space>
            )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={statusColors[status] || 'default'}>
                    {status}
                </Tag>
            )
        },
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => (
                <Space>
                    <ClockCircleOutlined />
                    {dayjs(date).fromNow()}
                </Space>
            )
        }
    ];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    const pieData = [
        { name: 'Pending', value: recentResumes.filter(r => r.status === 'PENDING').length },
        { name: 'Reviewing', value: recentResumes.filter(r => r.status === 'REVIEWING').length },
        { name: 'Approved', value: recentResumes.filter(r => r.status === 'APPROVED').length },
        { name: 'Rejected', value: recentResumes.filter(r => r.status === 'REJECTED').length }
    ].filter(item => item.value > 0);

    return (
        <div style={{ padding: '0 0 24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontWeight: 700, color: '#111827' }}>Bảng điều khiển</h2>
                <Button
                    type="primary"
                    icon={<MailOutlined />}
                    loading={isEmailLoading}
                    onClick={() => handleSendEmail()}
                    style={{
                        background: '#1677ff',
                        borderColor: '#1677ff',
                        height: 38,
                        borderRadius: 6,
                        fontWeight: 500,
                        boxShadow: '0 2px 6px rgba(22, 119, 255, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                    }}
                >
                    Gửi Email giới thiệu công việc
                </Button>
            </div>

            {/* Statistics Cards */}
            <Row gutter={[20, 20]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: 10,
                            border: '1px solid #edf2f7',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            background: '#ffffff',
                            transition: 'all 0.3s ease'
                        }}
                        bodyStyle={{ padding: '18px 20px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ color: '#64748b', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                                    Tổng người dùng
                                </div>
                                <Statistic
                                    value={stats.totalUsers}
                                    formatter={formatter}
                                    valueStyle={{ fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}
                                />
                            </div>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: '#eff6ff',
                                color: '#1677ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20
                            }}>
                                <UserOutlined />
                            </div>
                        </div>
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', fontSize: 12 }}>
                            <span style={{
                                color: stats.userGrowth >= 0 ? '#16a34a' : '#dc2626',
                                fontWeight: 600,
                                marginRight: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2
                            }}>
                                {stats.userGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                                {' '}{stats.userGrowth >= 0 ? '+' : ''}{stats.userGrowth}%
                            </span>
                            <span style={{ color: '#94a3b8' }}>so với tháng trước</span>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: 10,
                            border: '1px solid #edf2f7',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            background: '#ffffff',
                            transition: 'all 0.3s ease'
                        }}
                        bodyStyle={{ padding: '18px 20px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ color: '#64748b', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                                    Tổng công ty
                                </div>
                                <Statistic
                                    value={stats.totalCompanies}
                                    formatter={formatter}
                                    valueStyle={{ fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}
                                />
                            </div>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: '#f5f3ff',
                                color: '#7c3aed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20
                            }}>
                                <BankOutlined />
                            </div>
                        </div>
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', fontSize: 12 }}>
                            <span style={{
                                color: stats.companyGrowth >= 0 ? '#16a34a' : '#dc2626',
                                fontWeight: 600,
                                marginRight: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2
                            }}>
                                {stats.companyGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                                {' '}{stats.companyGrowth >= 0 ? '+' : ''}{stats.companyGrowth}%
                            </span>
                            <span style={{ color: '#94a3b8' }}>so với tháng trước</span>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: 10,
                            border: '1px solid #edf2f7',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            background: '#ffffff',
                            transition: 'all 0.3s ease'
                        }}
                        bodyStyle={{ padding: '18px 20px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ color: '#64748b', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                                    Tổng việc làm
                                </div>
                                <Statistic
                                    value={stats.totalJobs}
                                    formatter={formatter}
                                    valueStyle={{ fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}
                                />
                            </div>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: '#fff7ed',
                                color: '#ea580c',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20
                            }}>
                                <FileTextOutlined />
                            </div>
                        </div>
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', fontSize: 12 }}>
                            <span style={{
                                color: stats.jobGrowth >= 0 ? '#16a34a' : '#dc2626',
                                fontWeight: 600,
                                marginRight: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2
                            }}>
                                {stats.jobGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                                {' '}{stats.jobGrowth >= 0 ? '+' : ''}{stats.jobGrowth}%
                            </span>
                            <span style={{ color: '#94a3b8' }}>so với tháng trước</span>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: 10,
                            border: '1px solid #edf2f7',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            background: '#ffffff',
                            transition: 'all 0.3s ease'
                        }}
                        bodyStyle={{ padding: '18px 20px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ color: '#64748b', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                                    Tổng CV
                                </div>
                                <Statistic
                                    value={stats.totalResumes}
                                    formatter={formatter}
                                    valueStyle={{ fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}
                                />
                            </div>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                background: '#f0fdf4',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20
                            }}>
                                <SolutionOutlined />
                            </div>
                        </div>
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f8fafc', display: 'flex', alignItems: 'center', fontSize: 12 }}>
                            <span style={{
                                color: stats.resumeGrowth >= 0 ? '#16a34a' : '#dc2626',
                                fontWeight: 600,
                                marginRight: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2
                            }}>
                                {stats.resumeGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                                {' '}{stats.resumeGrowth >= 0 ? '+' : ''}{stats.resumeGrowth}%
                            </span>
                            <span style={{ color: '#94a3b8' }}>so với tháng trước</span>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Charts Section */}
            <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
                <Col xs={24} lg={16}>
                    <Card
                        title="Thống kê theo tháng"
                        bordered={false}
                        style={{ height: '100%' }}
                    >
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="jobs"
                                    stroke="#8884d8"
                                    strokeWidth={2}
                                    name="Việc làm"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="resumes"
                                    stroke="#82ca9d"
                                    strokeWidth={2}
                                    name="CV"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="users"
                                    stroke="#ffc658"
                                    strokeWidth={2}
                                    name="Người dùng"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                <Col xs={24} lg={8}>
                    <Card
                        title="Trạng thái CV"
                        bordered={false}
                        style={{ height: '100%' }}
                    >
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>

            {/* Recent Resumes & Top Companies */}
            <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
                <Col xs={24} lg={14}>
                    <Card
                        title="CV mới nhất"
                        bordered={false}
                        extra={<a href="/admin/resume">Xem tất cả</a>}
                    >
                        <Table
                            dataSource={recentResumes}
                            columns={recentResumeColumns}
                            rowKey="id"
                            pagination={false}
                            loading={loading}
                        />
                    </Card>
                </Col>

                <Col xs={24} lg={10}>
                    <Card
                        title="Top công ty"
                        bordered={false}
                        extra={<a href="/admin/company">Xem tất cả</a>}
                    >
                        {topCompanies.map((company, index) => (
                            <div
                                key={company.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 0',
                                    borderBottom: index < topCompanies.length - 1 ? '1px solid #f0f0f0' : 'none'
                                }}
                            >
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        background: COLORS[index % COLORS.length],
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        marginRight: 12
                                    }}
                                >
                                    {index + 1}
                                </div>
                                <Avatar
                                    src={`${company.logo}`}
                                    icon={<BankOutlined />}
                                    style={{ marginRight: 12 }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500 }}>{company.name}</div>
                                    <div style={{ fontSize: 12, color: '#888' }}>
                                        {company.jobCount} việc làm
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Card>
                </Col>
            </Row>

            {/* Bar Chart */}
            <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
                <Col span={24}>
                    <Card
                        title="So sánh dữ liệu"
                        bordered={false}
                    >
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="jobs" fill="#8884d8" name="Việc làm" />
                                <Bar dataKey="resumes" fill="#82ca9d" name="CV" />
                                <Bar dataKey="users" fill="#ffc658" name="Người dùng" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardPage;