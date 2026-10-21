import { callFetchJob } from '@/config/api';
import { convertSlug, getLocationName, nonAccentVietnamese } from '@/config/utils';
import { IJob } from '@/types/backend';
import { EnvironmentOutlined, ThunderboltOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Card, Col, Empty, Pagination, Row, Spin, Tag, Button, Space } from 'antd';
import { useState, useEffect } from 'react';
import { isMobile } from 'react-device-detect';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styles from 'styles/client.module.scss';
import { useWebSocket } from '@/context/websocket.context';
import { sfIn } from "spring-filter-query-builder";

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);


interface IProps {
    showPagination?: boolean;
}

const JobCard = (props: IProps) => {
    const { showPagination = false } = props;

    const [displayJob, setDisplayJob] = useState<IJob[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [current, setCurrent] = useState(1);
    const [pageSize, setPageSize] = useState(showPagination ? 8 : 6);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState("");
    const [sortQuery, setSortQuery] = useState("sort=startDate,desc");
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    const queryKeyword = searchParams.get("keyword") || searchParams.get("search");
    const queryLocation = searchParams.get("location");

    // -- WebSocket - Auto Refresh Jobs --
    const { stompClient } = useWebSocket();
    useEffect(() => {
        if (stompClient && stompClient.connected) {
            const sub = stompClient.subscribe('/topic/jobs', (message) => {
                if (message.body) {
                    // Refetch ngầm không bật Skeleton spinner làm gián đoạn người dùng
                    fetchJob(true);
                }
            });
            return () => sub.unsubscribe();
        }
    }, [stompClient]);
    // -----------------------------------

    useEffect(() => {
        fetchJob();
    }, [current, pageSize, filter, sortQuery, location]);

    const fetchJob = async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        let query = `page=${current}&size=${pageSize}`;
        if (filter) {
            query += `&${filter}`;
        }
        if (sortQuery) {
            query += `&${sortQuery}`;
        }

        // check query string (Hỗ trợ tìm kiếm từ khóa thông minh & địa chỉ thực tế)
        const queryKeyword = searchParams.get("keyword") || searchParams.get("search");
        const queryLocation = searchParams.get("location");
        const querySkills = searchParams.get("skills");

        const filterClauses: string[] = [];

        // 1. Tìm theo từ khóa (khớp tên việc làm hoặc kỹ năng)
        if (queryKeyword && queryKeyword.trim()) {
            const kw = queryKeyword.trim();
            const unaccentKw = nonAccentVietnamese(kw);
            if (unaccentKw !== kw && unaccentKw.length > 1) {
                filterClauses.push(`(name ~ '%${kw}%' or name ~ '%${unaccentKw}%' or skills.name ~ '%${kw}%')`);
            } else {
                filterClauses.push(`(name ~ '%${kw}%' or skills.name ~ '%${kw}%')`);
            }
        }

        // 2. Tìm theo địa điểm (khớp chuỗi địa chỉ chi tiết trong DB)
        if (queryLocation && queryLocation.trim() && queryLocation !== 'ALL') {
            const loc = queryLocation.trim();
            if (loc === 'Đà Nẵng' || loc === 'DANANG') {
                filterClauses.push(`(location ~ '%Đà Nẵng%' or location ~ '%Da Nang%')`);
            } else if (loc === 'Hồ Chí Minh' || loc === 'HOCHIMINH') {
                filterClauses.push(`(location ~ '%Hồ Chí Minh%' or location ~ '%Ho Chi Minh%' or location ~ '%HCM%' or location ~ '%Sài Gòn%')`);
            } else if (loc === 'Hà Nội' || loc === 'HANOI') {
                filterClauses.push(`(location ~ '%Hà Nội%' or location ~ '%Ha Noi%')`);
            } else {
                filterClauses.push(`location ~ '%${loc}%'`);
            }
        }

        // 3. Hỗ trợ query theo skill IDs nếu có
        if (querySkills && querySkills.trim()) {
            filterClauses.push(sfIn("skills", querySkills.split(",")).toString());
        }

        if (filterClauses.length > 0) {
            const q = filterClauses.join(" and ");
            query += `&filter=${encodeURIComponent(q)}`;
        }

        const res = await callFetchJob(query);
        if (res && res.data) {
            setDisplayJob(res.data.result);
            setTotal(res.data.meta.total)
        }
        setIsLoading(false);
    }



    const handleOnchangePage = (pagination: { current: number, pageSize: number }) => {
        if (pagination && pagination.current !== current) {
            setCurrent(pagination.current)
        }
        if (pagination && pagination.pageSize !== pageSize) {
            setPageSize(pagination.pageSize)
            setCurrent(1);
        }
    }

    const handleViewDetailJob = (item: IJob) => {
        const slug = convertSlug(item.name);
        navigate(`/job/${slug}?id=${item.id}`)
    }

    return (
        <div className={`${styles["card-job-section"]}`}>
            <div className={`${styles["job-content"]}`}>
                <Spin spinning={isLoading} tip="Loading...">
                    <Row gutter={[20, 20]}>
                        <Col span={24}>
                            <div className={styles["dflex-header"]}>
                                <div>
                                    <span className={styles["title"]}>
                                        {showPagination ? "Danh Sách Việc Làm Ngành Bánh" : "Việc Làm Tiệm Bánh Mới Nhất"}
                                    </span>
                                    {(queryKeyword || (queryLocation && queryLocation !== 'ALL')) && (
                                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 13, color: '#6b7280' }}>
                                                Kết quả lọc:
                                            </span>
                                            {queryKeyword && (
                                                <Tag
                                                    closable
                                                    onClose={() => {
                                                        const next = new URLSearchParams(searchParams);
                                                        next.delete("keyword");
                                                        next.delete("search");
                                                        navigate(next.toString() ? `/job?${next.toString()}` : '/job');
                                                    }}
                                                    style={{ background: '#f0f5ff', border: '1px solid #d6e4ff', color: '#1677ff', borderRadius: 4 }}
                                                >
                                                    Từ khóa: <strong>{queryKeyword}</strong>
                                                </Tag>
                                            )}
                                            {queryLocation && queryLocation !== 'ALL' && (
                                                <Tag
                                                    closable
                                                    onClose={() => {
                                                        const next = new URLSearchParams(searchParams);
                                                        next.delete("location");
                                                        navigate(next.toString() ? `/job?${next.toString()}` : '/job');
                                                    }}
                                                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 4 }}
                                                >
                                                    Khu vực: <strong>{queryLocation}</strong>
                                                </Tag>
                                            )}
                                            <Button
                                                type="link"
                                                size="small"
                                                style={{ padding: 0, fontSize: 12, color: '#ef4444' }}
                                                onClick={() => navigate('/job')}
                                            >
                                                Xóa bộ lọc
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {!showPagination &&
                                    <Link to="job">Xem tất cả</Link>
                                }
                            </div>
                        </Col>

                        {displayJob?.map(item => {
                            return (
                                <Col span={24} md={12} key={item.id}>
                                    <Card
                                        size="small"
                                        title={null}
                                        hoverable
                                        className={styles["job-card-item"]}
                                        onClick={() => handleViewDetailJob(item)}
                                    >
                                        <div className={styles["card-job-content"]}>
                                            <div className={styles["card-job-left"]}>
                                                <img
                                                    alt={item?.name || "Logo"}
                                                    src={`${item?.company?.logo}`}
                                                />
                                            </div>
                                            <div className={styles["card-job-right"]}>
                                                <div className={styles["job-title"]}>{item.level ? `[${item.level}] ` : ''}{item.name}</div>
                                                <div className={styles["job-location"]}>
                                                    <EnvironmentOutlined style={{ color: '#6b7280', marginRight: 4 }} />
                                                    <span>{getLocationName(item.location)}</span>
                                                </div>
                                                <div className={styles["job-salary"]}>
                                                    <ThunderboltOutlined style={{ color: '#059669', marginRight: 4 }} />
                                                    <span>{(item.salary + "")?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} đ</span>
                                                </div>
                                                <div className={styles["job-updatedAt"]}>Hạn nộp: {dayjs(item.endDate).format('DD/MM/YYYY')}</div>
                                            </div>
                                        </div>
                                    </Card>
                                </Col>
                            )
                        })}

                        {(!displayJob || displayJob && displayJob.length === 0)
                            && !isLoading &&
                            <div className={styles["empty"]}>
                                <Empty description="Không có dữ liệu" />
                            </div>
                        }
                    </Row>
                    {showPagination && (
                        <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
                            <Pagination
                                current={current}
                                total={total}
                                pageSize={pageSize}
                                responsive
                                onChange={(p: number, s: number) => handleOnchangePage({ current: p, pageSize: s })}
                            />
                        </div>
                    )}
                </Spin>
            </div>
        </div>
    )
}

export default JobCard;