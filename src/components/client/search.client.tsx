import { Button, Col, Form, Row, Select, Space, notification } from 'antd';
import { EnvironmentOutlined, SearchOutlined, ShopOutlined } from '@ant-design/icons';
import { LOCATION_LIST } from '@/config/utils';
import { ProForm } from '@ant-design/pro-components';
import { useEffect, useState } from 'react';
import { callFetchAllSkill } from '@/config/api';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styles from '@/styles/client.module.scss';

const SearchClient = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const optionsLocations = LOCATION_LIST;
    const [form] = Form.useForm();
    const [optionsSkills, setOptionsSkills] = useState<{
        label: string;
        value: string;
    }[]>([]);

    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        if (location.search) {
            const queryLocation = searchParams.get("location");
            const querySkills = searchParams.get("skills");
            if (queryLocation) {
                form.setFieldValue("location", queryLocation.split(","));
            }
            if (querySkills) {
                form.setFieldValue("skills", querySkills.split(","));
            }
        }
    }, [location.search]);

    useEffect(() => {
        fetchSkill();
    }, []);

    const fetchSkill = async () => {
        let query = `page=1&size=100&sort=createdAt,desc`;

        const res = await callFetchAllSkill(query);
        if (res && res.data) {
            const arr = res?.data?.result?.map(item => {
                return {
                    label: item.name as string,
                    value: item.id + "" as string
                };
            }) ?? [];
            setOptionsSkills(arr);
        }
    };

    const onFinish = async (values: any) => {
        let query = "";
        if (values?.location?.length) {
            query = `location=${values?.location?.join(",")}`;
        }
        if (values?.skills?.length) {
            query = values.location?.length ? query + `&skills=${values?.skills?.join(",")}`
                :
                `skills=${values?.skills?.join(",")}`;
        }

        if (!query) {
            notification.error({
                message: 'Thông báo',
                description: "Vui lòng chọn kỹ năng/vị trí hoặc khu vực để tìm việc"
            });
            return;
        }
        navigate(`/job?${query}`);
    };

    return (
        <div className={styles["hero-search-wrapper"]}>
            <div className={styles["hero-header"]}>
                <h1 className={styles["hero-title"]}>
                    Tìm Kiếm Việc Làm Ngành Bánh & F&B
                </h1>
                <p className={styles["hero-subtitle"]}>
                    Kết nối thợ bánh, phụ bếp và nhân sự phục vụ với hệ thống tiệm bánh uy tín trên toàn quốc
                </p>
            </div>

            <div className={styles["search-box-card"]}>
                <ProForm
                    form={form}
                    onFinish={onFinish}
                    submitter={{
                        render: () => <></>
                    }}
                >
                    <Row gutter={[12, 12]} align="middle">
                        <Col span={24} md={14}>
                            <ProForm.Item
                                name="skills"
                                style={{ marginBottom: 0 }}
                            >
                                <Select
                                    mode="multiple"
                                    allowClear
                                    maxTagCount="responsive"
                                    suffixIcon={null}
                                    style={{ width: '100%' }}
                                    placeholder={
                                        <Space>
                                            <ShopOutlined style={{ color: '#6b7280' }} />
                                            <span>Vị trí, chuyên môn (Bánh kem, Bánh mì, Phụ bếp, Thu ngân...)</span>
                                        </Space>
                                    }
                                    optionLabelProp="label"
                                    options={optionsSkills}
                                />
                            </ProForm.Item>
                        </Col>
                        <Col span={24} sm={14} md={6}>
                            <ProForm.Item
                                name="location"
                                style={{ marginBottom: 0 }}
                            >
                                <Select
                                    mode="multiple"
                                    allowClear
                                    maxTagCount="responsive"
                                    suffixIcon={null}
                                    style={{ width: '100%' }}
                                    placeholder={
                                        <Space>
                                            <EnvironmentOutlined style={{ color: '#6b7280' }} />
                                            <span>Khu vực, địa điểm...</span>
                                        </Space>
                                    }
                                    optionLabelProp="label"
                                    options={optionsLocations}
                                />
                            </ProForm.Item>
                        </Col>
                        <Col span={24} sm={10} md={4}>
                            <Button
                                type='primary'
                                block
                                icon={<SearchOutlined />}
                                onClick={() => form.submit()}
                                style={{
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    height: '38px',
                                    background: '#2563eb',
                                    borderColor: '#2563eb'
                                }}
                            >
                                Tìm Việc
                            </Button>
                        </Col>
                    </Row>
                </ProForm>
            </div>
        </div>
    );
};

export default SearchClient;