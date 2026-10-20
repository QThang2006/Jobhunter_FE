import { useLocation } from "react-router-dom";
import { useState, useEffect } from 'react';
import { ICompany } from "@/types/backend";
import { callFetchCompanyById } from "@/config/api";
import styles from 'styles/client.module.scss';
import parse from 'html-react-parser';
import { Col, Divider, Row, Skeleton } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";

const ClientCompanyDetailPage = () => {
    const [companyDetail, setCompanyDetail] = useState<ICompany | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    let location = useLocation();
    let params = new URLSearchParams(location.search);
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
            }
        };
        init();
    }, [id]);

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
                                    <span>{companyDetail?.address}</span>
                                </div>

                                <Divider style={{ borderColor: '#e5e7eb', margin: '18px 0' }} />
                                <div className={styles["section-title"]}>Giới thiệu công ty</div>
                                <div className={styles["job-desc-content"]}>
                                    {parse(companyDetail?.description ?? "")}
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