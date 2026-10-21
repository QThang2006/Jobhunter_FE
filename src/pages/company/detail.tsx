import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from 'react';
import { ICompany, IJob } from "@/types/backend";
import { callFetchCompanyById, callFetchJob } from "@/config/api";
import styles from 'styles/client.module.scss';
import parse from 'html-react-parser';
import { Col, Divider, Row, Skeleton, Card, Empty, Button, Spin, Tag } from "antd";
import { EnvironmentOutlined, ThunderboltOutlined, ArrowRightOutlined, ShopOutlined } from "@ant-design/icons";
import { convertSlug, getLocationName } from '@/config/utils';
import dayjs from 'dayjs';

const ClientCompanyDetailPage = () => {
    const [companyDetail, setCompanyDetail] = useState<ICompany | null>(null);
    const [companyJobs, setCompanyJobs] = useState<IJob[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isJobsLoading, setIsJobsLoading] = useState<boolean>(false);

    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const id = params?.get("id");

    useEffect(() => {
        const init = async () => {
            if (id) {
                setIsLoading(true);
                const res = await callFetchCompanyById(id);
                if (res?.data) {
                    setCompanyDetail(res.data);
                }
                setIsLoading(false);

                // Tải danh sách các việc làm thuộc tiệm bánh / công ty này
                setIsJobsLoading(true);
                try {
                    const resJob = await callFetchJob(`page=1&size=50&filter=${encodeURIComponent(`company.id : ${id}`)}&sort=startDate,desc`);
                    if (resJob?.data?.result) {
                        setCompanyJobs(resJob.data.result);
                    }
                } catch (err) {
                    console.error("Lỗi khi tải việc làm của công ty:", err);
                } finally {
                    setIsJobsLoading(false);
                }
            }
        };
        init();
    }, [id]);

    const handleViewDetailJob = (job: IJob) => {
        const slug = convertSlug(job.name);
        navigate(`/job/${slug}?id=${job.id}`);
    };

    return (
        <div className={`${styles["container"]} ${styles["detail-job-section"]}`}>
            {isLoading ? (
                <Skeleton active />
            ) : (
                <div className={styles["detail-card-wrapper"]}>
                    {companyDetail && companyDetail.id && (
                        <Row gutter={[28, 24]}>
                            <Col span={24} md={16}>
                                <h1 className={styles["header"]}>
                                    {companyDetail.name}
                                </h1>

                                <div className={styles["location"]}>
                                    <EnvironmentOutlined style={{ color: '#6b7280', marginRight: 6 }} />
                                    <span>{companyDetail?.address || 'Chưa cập nhật địa chỉ'}</span>
                                </div>

                                <Divider style={{ borderColor: '#e5e7eb', margin: '18px 0' }} />
                                <div className={styles["section-title"]}>Giới thiệu tiệm bánh</div>
                                <div className={styles["job-desc-content"]}>
                                    {companyDetail?.description ? parse(companyDetail.description) : 'Chưa có thông tin mô tả chi tiết.'}
                                </div>

                                {/* Danh sách việc làm thuộc công ty */}
                                <Divider style={{ borderColor: '#e5e7eb', margin: '28px 0 20px' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div className={styles["section-title"]} style={{ margin: 0 }}>
                                        Vị trí đang tuyển dụng ({companyJobs.length})
                                    </div>
                                    {companyJobs.length > 0 && (
                                        <Tag color="blue" style={{ borderRadius: 12, padding: '2px 10px', fontSize: 13 }}>
                                            {companyJobs.length} vị trí mở
                                        </Tag>
                                    )}
                                </div>

                                <div className={styles["card-job-section"]}>
                                    <Spin spinning={isJobsLoading} tip="Đang tải danh sách việc làm...">
                                        {companyJobs.length > 0 ? (
                                            <Row gutter={[16, 16]}>
                                                {companyJobs.map(job => (
                                                    <Col span={24} sm={12} key={job.id}>
                                                        <Card
                                                            size="small"
                                                            hoverable
                                                            className={styles["job-card-item"]}
                                                            onClick={() => handleViewDetailJob(job)}
                                                            style={{ height: '100%', borderColor: '#e5e7eb', borderRadius: 8 }}
                                                        >
                                                            <div className={styles["card-job-content"]}>
                                                                <div className={styles["card-job-left"]}>
                                                                    <img
                                                                        alt={job.name || "Logo"}
                                                                        src={`${companyDetail.logo}`}
                                                                    />
                                                                </div>
                                                                <div className={styles["card-job-right"]}>
                                                                    <div className={styles["job-title"]}>
                                                                        {job.level ? `[${job.level}] ` : ''}{job.name}
                                                                    </div>
                                                                    <div className={styles["job-location"]}>
                                                                        <EnvironmentOutlined style={{ color: '#6b7280', marginRight: 4 }} />
                                                                        <span>{getLocationName(job.location)}</span>
                                                                    </div>
                                                                    <div className={styles["job-salary"]}>
                                                                        <ThunderboltOutlined style={{ color: '#059669', marginRight: 4 }} />
                                                                        <span>{(job.salary + "")?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} đ</span>
                                                                    </div>
                                                                    <div className={styles["job-updatedAt"]}>
                                                                        Hạn nộp: {dayjs(job.endDate).format('DD/MM/YYYY')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    </Col>
                                                ))}
                                            </Row>
                                        ) : (
                                            !isJobsLoading && (
                                                <div style={{ padding: '32px 16px', textAlign: 'center', background: '#f9fafb', borderRadius: 8, border: '1px dashed #e5e7eb' }}>
                                                    <Empty description="Hiện tại tiệm bánh chưa có vị trí nào đang tuyển dụng." />
                                                </div>
                                            )
                                        )}
                                    </Spin>
                                </div>
                            </Col>

                            <Col span={24} md={8}>
                                <div className={styles["company-sidebar-card"]}>
                                    <img
                                        className={styles["company-logo-img"]}
                                        alt={companyDetail?.name || "Logo công ty"}
                                        src={`${companyDetail?.logo}`}
                                    />
                                    <div className={styles["company-title"]}>
                                        {companyDetail?.name}
                                    </div>
                                    {companyDetail?.address && (
                                        <div className={styles["company-address"]}>
                                            <EnvironmentOutlined style={{ color: '#6b7280', marginRight: 4 }} />
                                            {companyDetail.address}
                                        </div>
                                    )}

                                    <Button
                                        type="primary"
                                        block
                                        icon={<ArrowRightOutlined />}
                                        style={{ marginTop: 20, height: 40, borderRadius: 6, fontWeight: 500 }}
                                        onClick={() => navigate(`/job?company=${encodeURIComponent(companyDetail?.name || '')}`)}
                                    >
                                        Xem trên trang Việc Làm
                                    </Button>
                                </div>
                            </Col>
                        </Row>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClientCompanyDetailPage;
