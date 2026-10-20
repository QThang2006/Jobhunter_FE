import { callFetchCompany } from '@/config/api';
import { convertSlug } from '@/config/utils';
import { ICompany } from '@/types/backend';
import { Card, Col, Empty, Pagination, Row, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from 'styles/client.module.scss';

interface IProps {
    showPagination?: boolean;
}

const CompanyCard = (props: IProps) => {
    const { showPagination = false } = props;

    const [displayCompany, setDisplayCompany] = useState<ICompany[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [current, setCurrent] = useState(1);
    const [pageSize, setPageSize] = useState(showPagination ? 8 : 4);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState("");
    const [sortQuery, setSortQuery] = useState("sort=updatedAt,desc");
    const navigate = useNavigate();

    useEffect(() => {
        fetchCompany();
    }, [current, pageSize, filter, sortQuery]);

    const fetchCompany = async () => {
        setIsLoading(true);
        let query = `page=${current}&size=${pageSize}`;
        if (filter) {
            query += `&${filter}`;
        }
        if (sortQuery) {
            query += `&${sortQuery}`;
        }

        const res = await callFetchCompany(query);
        if (res && res.data) {
            setDisplayCompany(res.data.result);
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

    const handleViewDetailJob = (item: ICompany) => {
        if (item.name) {
            const slug = convertSlug(item.name);
            navigate(`/company/${slug}?id=${item.id}`);
        }
    };

    return (
        <div className={styles["company-section"]}>
            <div className={styles["company-content"]}>
                <Spin spinning={isLoading} tip="Loading...">
                    <Row gutter={[20, 20]}>
                        <Col span={24}>
                            <div className={styles["dflex-header"]}>
                                <span className={styles["title"]}>
                                    {showPagination ? "Hệ Thống Tiệm Bánh & Đối Tác" : "Hệ Thống Tiệm Bánh Nổi Bật"}
                                </span>
                                {!showPagination && (
                                    <Link to="company">Xem tất cả</Link>
                                )}
                            </div>
                        </Col>

                        {displayCompany?.map(item => {
                            return (
                                <Col span={24} sm={12} md={6} key={item.id}>
                                    <Card
                                        onClick={() => handleViewDetailJob(item)}
                                        hoverable
                                        className={styles["company-card-item"]}
                                        cover={
                                            <div className={styles["card-customize"]}>
                                                <img
                                                    alt={item?.name || "Logo"}
                                                    src={`${item?.logo}`}
                                                />
                                            </div>
                                        }
                                    >
                                        <h3 className={styles["company-card-name"]}>{item.name}</h3>
                                        {item.address && (
                                            <div className={styles["company-card-address"]}>
                                                <EnvironmentOutlined style={{ color: '#6b7280', marginRight: 4 }} />
                                                <span>{item.address}</span>
                                            </div>
                                        )}
                                    </Card>
                                </Col>
                            );
                        })}

                        {(!displayCompany || (displayCompany && displayCompany.length === 0))
                            && !isLoading && (
                            <div className={styles["empty"]}>
                                <Empty description="Không có dữ liệu" />
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

export default CompanyCard;