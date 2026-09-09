import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from 'react';
import { IJob } from "@/types/backend";
import { callFetchJobById } from "@/config/api";
import styles from 'styles/client.module.scss';
import parse from 'html-react-parser';
import { Col, Divider, Row, Skeleton, Tag } from "antd";
import { DollarOutlined, EnvironmentOutlined, HistoryOutlined } from "@ant-design/icons";
import { getLocationName } from "@/config/utils";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ApplyModal from "@/components/client/modal/apply.modal";
import { useWebSocket } from "@/context/websocket.context";
dayjs.extend(relativeTime)


const ClientJobDetailPage = (props: any) => {
    const [jobDetail, setJobDetail] = useState<IJob | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    let location = useLocation();
    let params = new URLSearchParams(location.search);
    const id = params?.get("id"); // job id

    // -- WebSocket Section --
    const { stompClient } = useWebSocket();

    // Hàm fetch data tách ra để tái sử dụng
    const fetchJobDetail = async (isSilent = false) => {
        if (id) {
            if (!isSilent) setIsLoading(true);
            const res = await callFetchJobById(id);
            if (res?.data) {
                setJobDetail(res.data)
            }
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (stompClient && stompClient.connected) {
            const sub = stompClient.subscribe('/topic/jobs', (message) => {
                if (message.body) {
                    // Refetch ngầm mượt mà không hiện Skeleton spinner
                    fetchJobDetail(true);
                }
            });
            return () => sub.unsubscribe();
        }
    }, [stompClient, id]);
    // -----------------------

    useEffect(() => {
        fetchJobDetail();
    }, [id]);

    return (
        <div className={`${styles["container"]} ${styles["detail-job-section"]}`}>
            {isLoading ?
                <Skeleton />
                :
                <Row gutter={[20, 20]}>
                    {jobDetail && jobDetail.id &&
                        <>
                            <Col span={24} md={16}>
                                <div className={styles["header"]}>
                                    {jobDetail.name}
                                </div>
                                <div>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className={styles["btn-apply"]}
                                        disabled={
                                            (jobDetail?.endDate && dayjs(jobDetail.endDate).isBefore(dayjs(), 'day')) ||
                                            (jobDetail?.startDate && dayjs(jobDetail.startDate).isAfter(dayjs(), 'day'))
                                        }
                                        style={
                                            (jobDetail?.endDate && dayjs(jobDetail.endDate).isBefore(dayjs(), 'day')) ||
                                                (jobDetail?.startDate && dayjs(jobDetail.startDate).isAfter(dayjs(), 'day'))
                                                ? { background: "#ccc", cursor: "not-allowed" } : {}
                                        }
                                    >
                                        {jobDetail?.endDate && dayjs(jobDetail.endDate).isBefore(dayjs(), 'day')
                                            ? "Đã hết hạn"
                                            : (jobDetail?.startDate && dayjs(jobDetail.startDate).isAfter(dayjs(), 'day')
                                                ? "Chưa mở tuyển"
                                                : "Apply Now")
                                        }
                                    </button>
                                </div>
                                <Divider />
                                <div className={styles["skills"]}>
                                    {jobDetail?.skills?.map((item, index) => {
                                        return (
                                            <Tag key={`${index}-key`} color="gold" >
                                                {item.name}
                                            </Tag>
                                        )
                                    })}
                                </div>
                                <div className={styles["salary"]}>
                                    <DollarOutlined />
                                    <span>&nbsp;{(jobDetail.salary + "")?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} đ</span>
                                </div>
                                <div className={styles["location"]}>
                                    <EnvironmentOutlined style={{ color: '#58aaab' }} />&nbsp;{getLocationName(jobDetail.location)}
                                </div>
                                <div>
                                    <HistoryOutlined /> Thời gian tuyển dụng: {dayjs(jobDetail.startDate).format('DD/MM/YYYY')} - {dayjs(jobDetail.endDate).format('DD/MM/YYYY')}
                                </div>
                                <Divider />
                                {parse(jobDetail.description)}
                            </Col>

                            <Col span={24} md={8}>
                                <div className={styles["company"]}>
                                    <div>
                                        <img
                                            style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                                            alt="example"
                                            src={`${jobDetail.company?.logo}`}
                                        />
                                    </div>
                                    <div>
                                        {jobDetail.company?.name}
                                    </div>
                                </div>
                            </Col>
                        </>
                    }
                </Row>
            }
            <ApplyModal
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                jobDetail={jobDetail}
            />
        </div>
    )
}
export default ClientJobDetailPage;