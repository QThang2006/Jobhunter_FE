import { Button, Col, Form, Row, Select, Space, Tag, notification } from 'antd';
import { EnvironmentOutlined, SearchOutlined, ShopOutlined } from '@ant-design/icons';
import { LOCATION_LIST } from '@/config/utils';
import { ProForm } from '@ant-design/pro-components';
import { useEffect, useState } from 'react';
import { callFetchAllSkill } from '@/config/api';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styles from '@/styles/client.module.scss';

const QUICK_TAGS = [
    "Bánh kem",
    "Bánh mì",
    "Phụ bếp",
    "Thu ngân",
    "Bán hàng",
    "Pha chế"
];

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

    const handleQuickTagClick = (tag: string) => {
        const matched = optionsSkills.find(s => s.label.toLowerCase().includes(tag.toLowerCase()));
        if (matched) {
            form.setFieldValue("skills", [matched.value]);
            navigate(`/job?skills=${matched.value}`);
        } else {
            navigate(`/job`);
        }
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
                                            <ShopOutlined style={{ color: '#d46b08' }} />
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
                                            <EnvironmentOutlined style={{ color: '#d46b08' }} />
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
                                    background: '#d46b08',
                                    borderColor: '#d46b08'
                                }}
                            >
                                Tìm Việc
                            </Button>
                        </Col>
                    </Row>
                </ProForm>

                <div className={styles["search-quick-tags"]}>
                    <span className={styles["tags-label"]}>Gợi ý nhanh:</span>
                    {QUICK_TAGS.map((tag) => (
                        <Tag
                            key={tag}
                            className={styles["quick-tag-item"]}
                            onClick={() => handleQuickTagClick(tag)}
                        >
                            {tag}
                        </Tag>
                    ))}
                </div>
            </div>

            <div className={styles["hero-features"]}>
                <div className={styles["feature-item"]}>
                    <span className={styles["feature-dot"]}></span>
                    <span>Hệ thống tiệm bánh & chuỗi F&B xác thực</span>
                </div>
                <div className={styles["feature-item"]}>
                    <span className={styles["feature-dot"]}></span>
                    <span>Xếp lịch làm việc theo ca linh hoạt (Sáng / Chiều / Tối)</span>
                </div>
                <div className={styles["feature-item"]}>
                    <span className={styles["feature-dot"]}></span>
                    <span>Đính kèm hình ảnh bánh & đăng ký thử việc trực tiếp</span>
                </div>
            </div>
        </div>
    );
};

export default SearchClient;