import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from 'react';
import { IJob } from "@/types/backend";
import { callFetchJobById } from "@/config/api";
import styles from 'styles/client.module.scss';
import parse from 'html-react-parser';
import { Button, Col, Divider, Row, Skeleton, Tag } from "antd";
import { DollarOutlined, EnvironmentOutlined, HistoryOutlined, ShopOutlined } from "@ant-design/icons";
import { convertSlug, getLocationName } from "@/config/utils";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ApplyModal from "@/components/client/modal/apply.modal";
import { useWebSocket } from "@/context/websocket.context";
dayjs.extend(relativeTime);

const ClientJobDetailPage = (props: any) => {
    const [jobDetail, setJobDetail] = useState<IJob | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const id = params?.get("id"); // job id

    // -- WebSocket Section --
    const { stompClient } = useWebSocket();

    const fetchJobDetail = async (isSilent = false) => {
        if (id) {
            if (!isSilent) setIsLoading(true);
            const res = await callFetchJobById(id);
            if (res?.data) {
                setJobDetail(res.data);
            }
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (stompClient && stompClient.connected) {
            const sub = stompClient.subscribe('/topic/jobs', (message) => {
                if (message.body) {
                    fetchJobDetail(true);
                }
            });
            return () => sub.unsubscribe();
        }
    }, [stompClient, id]);

    useEffect(() => {
        fetchJobDetail();
    }, [id]);

    const isExpired = jobDetail?.endDate && dayjs(jobDetail.endDate).isBefore(dayjs(), 'day');
    const isNotStarted = jobDetail?.startDate && dayjs(jobDetail.startDate).isAfter(dayjs(), 'day');
    const isApplyParam = params?.get("apply") === "true";

    useEffect(() => {
        if (jobDetail && isApplyParam && !isExpired && !isNotStarted) {
            setIsModalOpen(true);
        }
    }, [jobDetail, isApplyParam]);

    return (
        <div className={`${styles["container"]} ${styles["detail-job-section"]}`}>
            {isLoading ? (
                <Skeleton active />
            ) : (
                <div className={styles["detail-card-wrapper"]}>
                    {jobDetail && jobDetail.id && (
                        <Row gutter={[28, 24]}>
                            <Col span={24} md={16}>
                                <h1 className={styles["header"]}>
                                    {jobDetail.name}
                                </h1>

                                <div style={{ marginBottom: 16 }}>
                                    <Button
                                        type="primary"
                                        size="large"
                                        onClick={() => setIsModalOpen(true)}
                                        disabled={Boolean(isExpired || isNotStarted)}
                                        style={{
                                            width: "100%",
                                            maxWidth: 320,
                                            height: 42,
                                            fontSize: 15,
                                            fontWeight: 500,
                                            borderRadius: 6
                                        }}
                                    >
                                        {isExpired
                                            ? "Đã hết hạn tuyển"
                                            : isNotStarted
                                                ? "Chưa mở tuyển"
                                                : "Ứng Tuyển Ca Này"}
                                    </Button>
                                </div>

                                <div className={styles["skills"]}>
                                    {jobDetail?.skills?.map((item, index) => (
                                        <Tag key={`${index}-key`}>
                                            {item.name}
                                        </Tag>
                                    ))}
                                </div>

                                <div className={styles["salary"]}>
                                    <DollarOutlined style={{ marginRight: 6 }} />
                                    <span>{(jobDetail.salary + "")?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} đ</span>
                                </div>

                                <div className={styles["location"]}>
                                    <EnvironmentOutlined style={{ color: '#6b7280', marginRight: 6 }} />
                                    <span>{getLocationName(jobDetail.location)}</span>
                                </div>

                                <div className={styles["time-meta"]}>
                                    <HistoryOutlined style={{ marginRight: 6 }} />
                                    <span>Thời gian tuyển dụng: {dayjs(jobDetail.startDate).format('DD/MM/YYYY')} - {dayjs(jobDetail.endDate).format('DD/MM/YYYY')}</span>
                                </div>

                                <Divider style={{ margin: "20px 0 16px" }} />

                                <h3 className={styles["section-title"]}>
                                    Mô tả công việc & Yêu cầu
                                </h3>

                                <div className={styles["job-desc-content"]}>
                                    {jobDetail.description ? (
                                        parse(jobDetail.description)
                                    ) : (
                                        <p style={{ color: '#8c7b70' }}>Chưa có nội dung mô tả chi tiết.</p>
                                    )}
                                </div>
                            </Col>

                            <Col span={24} md={8}>
                                <div className={styles["company-sidebar-card"]}>
                                    {jobDetail.company?.logo && (
                                        <img
                                            className={styles["company-logo-img"]}
                                            alt={jobDetail.company?.name || "logo"}
                                            src={`${jobDetail.company?.logo}`}
                                        />
                                    )}
                                    <h3 className={styles["company-title"]}>
                                        {jobDetail.company?.name}
                                    </h3>
                                    {jobDetail.company?.address && (
                                        <div className={styles["company-address"]}>
                                            <EnvironmentOutlined style={{ color: '#6b7280', marginRight: 4 }} />
                                            {jobDetail.company?.address}
                                        </div>
                                    )}
                                    {jobDetail.company?.id && (
                                        <Button
                                            type="default"
                                            icon={<ShopOutlined />}
                                            onClick={() => {
                                                const slug = convertSlug(jobDetail.company?.name ?? '');
                                                navigate(`/company/${slug}?id=${jobDetail.company?.id}`);
                                            }}
                                            style={{
                                                marginTop: 8,
                                                borderRadius: 6,
                                            }}
                                        >
                                            Xem Tiệm Bánh
                                        </Button>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    )}
                </div>
            )}
            <ApplyModal
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                jobDetail={jobDetail}
            />
        </div>
    );
};

export default ClientJobDetailPage;