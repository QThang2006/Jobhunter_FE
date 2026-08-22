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
    MailOutlined
} from '@ant-design/icons';
import CountUp from 'react-countup';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { callFetchUser, callFetchCompany, callFetchJob, callFetchResume, callSendIntroEmail } from '@/config/api';
import { IResume } from '@/types/backend';
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
        if (userRole && userRole !== 'NORMAL_USER') {
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

    if (userRole === 'NORMAL_USER') {
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
            // Fetch all data in parallel (increase pageSize to get more historical data)
            const [usersRes, companiesRes, jobsRes, resumesRes] = await Promise.all([
                callFetchUser('current=1&pageSize=1000'),
                callFetchCompany('current=1&pageSize=1000'),
                callFetchJob('current=1&pageSize=1000'),
                callFetchResume('current=1&pageSize=1000&sort=createdAt,desc&populate=companyId,jobId')
            ]);

            // Calculate stats
            const totalUsers = usersRes.data?.meta?.total || 0;
            const totalCompanies = companiesRes.data?.meta?.total || 0;
            const totalJobs = jobsRes.data?.meta?.total || 0;
            const totalResumes = resumesRes.data?.meta?.total || 0;

            // Calculate real growth based on data from last 2 months
            const now = dayjs();
            const currentMonth = now.month();
            const lastMonth = now.subtract(1, 'month').month();

            // Count users created this month vs last month
            const usersThisMonth = usersRes.data?.result?.filter((user: any) =>
                dayjs(user.createdAt).month() === currentMonth
            ).length || 0;
            const usersLastMonth = usersRes.data?.result?.filter((user: any) =>
                dayjs(user.createdAt).month() === lastMonth
            ).length || 0;

            const jobsThisMonth = jobsRes.data?.result?.filter((job: any) =>
                dayjs(job.createdAt).month() === currentMonth
            ).length || 0;
            const jobsLastMonth = jobsRes.data?.result?.filter((job: any) =>
                dayjs(job.createdAt).month() === lastMonth
            ).length || 0;

            const companiesThisMonth = companiesRes.data?.result?.filter((company: any) =>
                dayjs(company.createdAt).month() === currentMonth
            ).length || 0;
            const companiesLastMonth = companiesRes.data?.result?.filter((company: any) =>
                dayjs(company.createdAt).month() === lastMonth
            ).length || 0;

            const resumesThisMonth = resumesRes.data?.result?.filter((resume: any) =>
                dayjs(resume.createdAt).month() === currentMonth
            ).length || 0;
            const resumesLastMonth = resumesRes.data?.result?.filter((resume: any) =>
                dayjs(resume.createdAt).month() === lastMonth
            ).length || 0;

            // Calculate growth percentages
            const userGrowth = usersLastMonth > 0
                ? ((usersThisMonth - usersLastMonth) / usersLastMonth * 100).toFixed(1)
                : 0;
            const jobGrowth = jobsLastMonth > 0
                ? ((jobsThisMonth - jobsLastMonth) / jobsLastMonth * 100).toFixed(1)
                : 0;
            const companyGrowth = companiesLastMonth > 0
                ? ((companiesThisMonth - companiesLastMonth) / companiesLastMonth * 100).toFixed(1)
                : 0;
            const resumeGrowth = resumesLastMonth > 0
                ? ((resumesThisMonth - resumesLastMonth) / resumesLastMonth * 100).toFixed(1)
                : 0;

            setStats({
                totalUsers,
                totalCompanies,
                totalJobs,
                totalResumes,
                userGrowth: Number(userGrowth),
                companyGrowth: Number(companyGrowth),
                jobGrowth: Number(jobGrowth),
                resumeGrowth: Number(resumeGrowth)
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
                    let job = typeof resume.jobId === 'object' ? resume.jobId : null;
                    if (!job) {
                        const jobIdStr = resume.jobId;
                        job = jobs.find((j: any) => j.id == jobIdStr);
                    }

                    return {
                        ...resume,
                        companyId: company ? { id: company.id, name: company.name, logo: company.logo } : { name: 'N/A' },
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
                <h2 style={{ margin: 0 }}>Bảng điều khiển</h2>
                <Button
                    type="primary"
                    icon={<MailOutlined />}
                    loading={isEmailLoading}
                    onClick={() => handleSendEmail()}
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        height: 40,
                        borderRadius: 8,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
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
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white'
                        }}
                    >
                        <Statistic
                            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Tổng người dùng</span>}
                            value={stats.totalUsers}
                            prefix={<UserOutlined />}
                            formatter={formatter}
                            valueStyle={{ color: 'white' }}
                        />
                        <div style={{ marginTop: 8, fontSize: 12 }}>
                            {stats.userGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                            {' '}{stats.userGrowth >= 0 ? '+' : ''}{stats.userGrowth}% so với tháng trước
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            color: 'white'
                        }}
                    >
                        <Statistic
                            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Tổng công ty</span>}
                            value={stats.totalCompanies}
                            prefix={<BankOutlined />}
                            formatter={formatter}
                            valueStyle={{ color: 'white' }}
                        />
                        <div style={{ marginTop: 8, fontSize: 12 }}>
                            {stats.companyGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                            {' '}{stats.companyGrowth >= 0 ? '+' : ''}{stats.companyGrowth}% so với tháng trước
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            color: 'white'
                        }}
                    >
                        <Statistic
                            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Tổng việc làm</span>}
                            value={stats.totalJobs}
                            prefix={<FileTextOutlined />}
                            formatter={formatter}
                            valueStyle={{ color: 'white' }}
                        />
                        <div style={{ marginTop: 8, fontSize: 12 }}>
                            {stats.jobGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                            {' '}{stats.jobGrowth >= 0 ? '+' : ''}{stats.jobGrowth}% so với tháng trước
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card
                        bordered={false}
                        style={{
                            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                            color: 'white'
                        }}
                    >
                        <Statistic
                            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Tổng CV</span>}
                            value={stats.totalResumes}
                            prefix={<FileTextOutlined />}
                            formatter={formatter}
                            valueStyle={{ color: 'white' }}
                        />
                        <div style={{ marginTop: 8, fontSize: 12 }}>
                            {stats.resumeGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                            {' '}{stats.resumeGrowth >= 0 ? '+' : ''}{stats.resumeGrowth}% so với tháng trước
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