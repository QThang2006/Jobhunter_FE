import { callFetchJob } from '@/config/api';
import { convertSlug, getLocationName, nonAccentVietnamese, getLevelLabel, getSalaryLabel } from '@/config/utils';
import { IJob } from '@/types/backend';
import { EnvironmentOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Card, Col, Empty, Pagination, Row, Spin, Tag, Button } from 'antd';
import { useState, useEffect } from 'react';
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
    const [searchParams] = useSearchParams();
    const location = useLocation();

    const queryCompany = searchParams.get("company");
    const queryCompanyId = searchParams.get("companyId");
    const queryKeyword = searchParams.get("keyword") || searchParams.get("search");
    const queryLocation = searchParams.get("location");
    const queryLevel = searchParams.get("level");
    const querySalary = searchParams.get("salary");
    const querySkills = searchParams.get("skills");

    // -- WebSocket - Auto Refresh Jobs --
    const { stompClient } = useWebSocket();
    useEffect(() => {
        if (stompClient && stompClient.connected) {
            const sub = stompClient.subscribe('/topic/jobs', (message) => {
                if (message.body) {
                    fetchJob(true);
                }
            });
            return () => sub.unsubscribe();
        }
    }, [stompClient]);
    // -----------------------------------

    useEffect(() => {
        fetchJob();
    }, [current, pageSize, filter, sortQuery, location.search]);

    const fetchJob = async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        let query = `page=${current}&size=${pageSize}`;
        if (filter) {
            query += `&${filter}`;
        }
        if (sortQuery) {
            query += `&${sortQuery}`;
        }

        const filterClauses: string[] = [];

        // 1. Tiêu chí Tên tiệm bánh / Công ty
        if (queryCompanyId && queryCompanyId.trim()) {
            filterClauses.push(`company.id : ${queryCompanyId.trim()}`);
        } else if (queryCompany && queryCompany.trim()) {
            const comp = queryCompany.trim();
            const unaccentComp = nonAccentVietnamese(comp);
            if (unaccentComp !== comp && unaccentComp.length > 1) {
                filterClauses.push(`(company.name ~ '%${comp}%' or company.name ~ '%${unaccentComp}%' or name ~ '%${comp}%')`);
            } else {
                filterClauses.push(`(company.name ~ '%${comp}%' or name ~ '%${comp}%')`);
            }
        } else if (queryKeyword && queryKeyword.trim()) {
            const kw = queryKeyword.trim();
            const unaccentKw = nonAccentVietnamese(kw);
            if (unaccentKw !== kw && unaccentKw.length > 1) {
                filterClauses.push(`(name ~ '%${kw}%' or name ~ '%${unaccentKw}%' or skills.name ~ '%${kw}%' or company.name ~ '%${kw}%')`);
            } else {
                filterClauses.push(`(name ~ '%${kw}%' or skills.name ~ '%${kw}%' or company.name ~ '%${kw}%')`);
            }
        }

        // 2. Tiêu chí Địa chỉ / Khu vực
        if (queryLocation && queryLocation.trim() && queryLocation !== 'ALL') {
            const loc = queryLocation.trim();
            if (loc === 'Đà Nẵng' || loc === 'DANANG') {
                filterClauses.push(`(location ~ '%Đà Nẵng%' or location ~ '%Da Nang%')`);
            } else if (loc === 'Hồ Chí Minh' || loc === 'HOCHIMINH') {
                filterClauses.push(`(location ~ '%Hồ Chí Minh%' or location ~ '%Ho Chi Minh%' or location ~ '%HCM%' or location ~ '%Sài Gòn%')`);
            } else if (loc === 'Hà Nội' || loc === 'HANOI') {
                filterClauses.push(`(location ~ '%Hà Nội%' or location ~ '%Ha Noi%')`);
            } else if (loc !== 'Khác') {
                filterClauses.push(`location ~ '%${loc}%'`);
            }
        }

        // 3. Tiêu chí Trình độ
        if (queryLevel && queryLevel.trim() && queryLevel !== 'ALL') {
            filterClauses.push(`level : '${queryLevel.trim()}'`);
        }

        // 4. Tiêu chí Mức lương
        if (querySalary && querySalary.trim() && querySalary !== 'ALL') {
            if (querySalary === 'UNDER_8') {
                filterClauses.push(`salary < 8000000`);
            } else if (querySalary === '8_15') {
                filterClauses.push(`(salary >= 8000000 and salary <= 15000000)`);
            } else if (querySalary === '15_25') {
                filterClauses.push(`(salary >= 15000000 and salary <= 25000000)`);
            } else if (querySalary === 'ABOVE_25') {
                filterClauses.push(`salary > 25000000`);
            }
        }

        // Kỹ năng (nếu có từ các liên kết khác)
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
            setTotal(res.data.meta.total);
        }
        setIsLoading(false);
    };

    const handleOnchangePage = (pagination: { current: number, pageSize: number }) => {
        if (pagination && pagination.current !== current) {
            setCurrent(pagination.current);
        }
        if (pagination && pagination.pageSize !== pageSize) {
            setPageSize(pagination.pageSize);
            setCurrent(1);
        }
    };

    const handleViewDetailJob = (item: IJob) => {
        const slug = convertSlug(item.name);
        navigate(`/job/${slug}?id=${item.id}`);
    };

    const hasAnyFilter = !!(
        queryCompany ||
        queryCompanyId ||
        queryKeyword ||
        (queryLocation && queryLocation !== 'ALL') ||
        (queryLevel && queryLevel !== 'ALL') ||
        (querySalary && querySalary !== 'ALL')
    );

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
                                    {hasAnyFilter && (
                                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 13, color: '#6b7280' }}>
                                                Bộ lọc đang áp dụng:
                                            </span>
                                            {queryCompany && (
                                                <Tag
                                                    closable
                                                    onClose={() => {
                                                        const next = new URLSearchParams(searchParams);
                                                        next.delete("company");
                                                        navigate(next.toString() ? `/job?${next.toString()}` : '/job');
                                                    }}
                                                    style={{ background: '#f0f5ff', border: '1px solid #d6e4ff', color: '#1677ff', borderRadius: 4 }}
                                                >
                                                    Tiệm bánh: <strong>{queryCompany}</strong>
                                                </Tag>
                                            )}
                                            {queryKeyword && !queryCompany && (
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
                                            {queryLevel && queryLevel !== 'ALL' && (
                                                <Tag
                                                    closable
                                                    onClose={() => {
                                                        const next = new URLSearchParams(searchParams);
                                                        next.delete("level");
                                                        navigate(next.toString() ? `/job?${next.toString()}` : '/job');
                                                    }}
                                                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 4 }}
                                                >
                                                    Trình độ: <strong>{getLevelLabel(queryLevel)}</strong>
                                                </Tag>
                                            )}
                                            {querySalary && querySalary !== 'ALL' && (
                                                <Tag
                                                    closable
                                                    onClose={() => {
                                                        const next = new URLSearchParams(searchParams);
                                                        next.delete("salary");
                                                        navigate(next.toString() ? `/job?${next.toString()}` : '/job');
                                                    }}
                                                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 4 }}
                                                >
                                                    Mức lương: <strong>{getSalaryLabel(querySalary)}</strong>
                                                </Tag>
                                            )}
                                            <Button
                                                type="link"
                                                size="small"
                                                style={{ padding: 0, fontSize: 12, color: '#ef4444' }}
                                                onClick={() => navigate('/job')}
                                            >
                                                Xóa tất cả bộ lọc
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {!showPagination && (
                                    <Link to="job">Xem tất cả</Link>
                                )}
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
                                                <div className={styles["job-title"]}>
                                                    {item.level ? `[${item.level}] ` : ''}{item.name}
                                                </div>
                                                <div className={styles["job-location"]}>
                                                    <EnvironmentOutlined style={{ color: '#6b7280', marginRight: 4 }} />
                                                    <span>{getLocationName(item.location)}</span>
                                                </div>
                                                <div className={styles["job-salary"]}>
                                                    <ThunderboltOutlined style={{ color: '#059669', marginRight: 4 }} />
                                                    <span>{(item.salary + "")?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} đ</span>
                                                </div>
                                                <div className={styles["job-updatedAt"]}>
                                                    Hạn nộp: {dayjs(item.endDate).format('DD/MM/YYYY')}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Col>
                            );
                        })}

                        {(!displayJob || (displayJob && displayJob.length === 0))
                            && !isLoading && (
                            <div className={styles["empty"]}>
                                <Empty description="Không tìm thấy việc làm phù hợp" />
                            </div>
                        )}
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
    );
};

export default JobCard;
