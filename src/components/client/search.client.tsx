import { Button, Col, Form, Row, Select, Space, AutoComplete, Input } from 'antd';
import { EnvironmentOutlined, SearchOutlined, ShopOutlined, FireOutlined } from '@ant-design/icons';
import { LOCATION_LIST } from '@/config/utils';
import { ProForm } from '@ant-design/pro-components';
import { useEffect, useState } from 'react';
import { callFetchAllSkill } from '@/config/api';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styles from '@/styles/client.module.scss';

// Gợi ý từ khóa tìm kiếm nhanh ngành bánh & F&B
const POPULAR_SUGGESTIONS = [
    { label: '🎂 Bánh kem (Cake Decorator)', value: 'Bánh kem' },
    { label: '🥖 Thợ làm bánh chính (Pastry Baker)', value: 'Thợ làm bánh' },
    { label: '🥐 Bánh mì & Men tự nhiên (Sourdough)', value: 'Bánh mì' },
    { label: '🍰 Bánh lạnh (Mousse, Tiramisu)', value: 'Bánh lạnh' },
    { label: '🧑‍🍳 Phụ bếp tiệm bánh (Assistant Baker)', value: 'Phụ bếp' },
    { label: '💳 Thu ngân & Bán hàng tiệm bánh', value: 'Thu ngân' },
    { label: '☕ Pha chế / Barista cơ bản', value: 'Barista' },
];

const QUICK_TAGS = [
    { label: 'Bánh kem', type: 'keyword', value: 'Bánh kem' },
    { label: 'Thợ làm bánh', type: 'keyword', value: 'Thợ làm bánh' },
    { label: 'Phụ bếp', type: 'keyword', value: 'Phụ bếp' },
    { label: 'Bánh mì', type: 'keyword', value: 'Bánh mì' },
    { label: 'Đà Nẵng', type: 'location', value: 'Đà Nẵng' },
    { label: 'Hồ Chí Minh', type: 'location', value: 'Hồ Chí Minh' },
    { label: 'Hà Nội', type: 'location', value: 'Hà Nội' }
];

const SearchClient = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [form] = Form.useForm();
    const [searchParams] = useSearchParams();

    const [autoCompleteOptions, setAutoCompleteOptions] = useState<{ label: string; value: string }[]>(POPULAR_SUGGESTIONS);

    // Đồng bộ giá trị tìm kiếm từ URL params lên form
    useEffect(() => {
        const queryLocation = searchParams.get("location");
        const queryKeyword = searchParams.get("keyword") || searchParams.get("search");

        if (queryKeyword) {
            form.setFieldValue("keyword", queryKeyword);
        } else {
            form.setFieldValue("keyword", "");
        }

        if (queryLocation) {
            form.setFieldValue("location", queryLocation);
        } else {
            form.setFieldValue("location", undefined);
        }
    }, [location.search]);

    // Tải thêm danh sách kỹ năng thực tế từ backend để làm gợi ý tìm kiếm
    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const res = await callFetchAllSkill('page=1&size=100&sort=name,asc');
                if (res && res.data && res.data.result) {
                    const skillOpts = res.data.result.map(s => ({
                        label: `✨ ${s.name}`,
                        value: s.name as string
                    }));
                    setAutoCompleteOptions([...POPULAR_SUGGESTIONS, ...skillOpts]);
                }
            } catch (e) {
                // Giữ gợi ý mặc định
            }
        };
        fetchSkills();
    }, []);

    const onFinish = async (values: any) => {
        const params = new URLSearchParams();

        if (values?.keyword && values.keyword.trim()) {
            params.set("keyword", values.keyword.trim());
        }

        if (values?.location && values.location !== 'ALL' && values.location.trim()) {
            params.set("location", values.location.trim());
        }

        const queryString = params.toString();
        navigate(queryString ? `/job?${queryString}` : '/job');
    };

    const handleQuickSearch = (item: { label: string; type: string; value: string }) => {
        if (item.type === 'keyword') {
            form.setFieldValue("keyword", item.value);
        } else if (item.type === 'location') {
            form.setFieldValue("location", item.value);
        }
        form.submit();
    };

    return (
        <div className={styles["hero-search-wrapper"]}>
            <div className={styles["search-box-card"]}>
                <ProForm
                    form={form}
                    onFinish={onFinish}
                    submitter={{
                        render: () => <></>
                    }}
                >
                    <Row gutter={[12, 12]} align="middle">
                        {/* Ô 1: Từ khóa / Vị trí / Kỹ năng tự do (AutoComplete) */}
                        <Col span={24} md={14}>
                            <ProForm.Item
                                name="keyword"
                                style={{ marginBottom: 0 }}
                            >
                                <AutoComplete
                                    options={autoCompleteOptions}
                                    style={{ width: '100%' }}
                                    filterOption={(inputValue, option) =>
                                        (option?.value?.toString().toLowerCase().includes(inputValue.toLowerCase()) ||
                                            option?.label?.toString().toLowerCase().includes(inputValue.toLowerCase())) ?? false
                                    }
                                >
                                    <Input
                                        size="large"
                                        allowClear
                                        prefix={<ShopOutlined style={{ color: '#6b7280', fontSize: 16, marginRight: 4 }} />}
                                        placeholder="Vị trí, chuyên môn (Bánh kem, Bánh mì, Phụ bếp, Thu ngân...)"
                                        onPressEnter={() => form.submit()}
                                        style={{
                                            borderRadius: 6,
                                            height: 42,
                                            fontSize: 14
                                        }}
                                    />
                                </AutoComplete>
                            </ProForm.Item>
                        </Col>

                        {/* Ô 2: Địa điểm / Tỉnh thành thực tế */}
                        <Col span={24} sm={14} md={6}>
                            <ProForm.Item
                                name="location"
                                style={{ marginBottom: 0 }}
                            >
                                <Select
                                    size="large"
                                    allowClear
                                    style={{ width: '100%' }}
                                    placeholder={
                                        <Space>
                                            <EnvironmentOutlined style={{ color: '#6b7280', fontSize: 16 }} />
                                            <span>Khu vực, địa điểm...</span>
                                        </Space>
                                    }
                                    options={LOCATION_LIST}
                                    onChange={() => form.submit()}
                                />
                            </ProForm.Item>
                        </Col>

                        {/* Ô 3: Nút Tìm Việc */}
                        <Col span={24} sm={10} md={4}>
                            <Button
                                type="primary"
                                block
                                size="large"
                                icon={<SearchOutlined />}
                                onClick={() => form.submit()}
                                style={{
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    height: 42,
                                    fontSize: 15
                                }}
                            >
                                Tìm Việc
                            </Button>
                        </Col>
                    </Row>
                </ProForm>

                {/* Dòng Gợi Ý Tìm Kiếm Nhanh */}
                <div
                    style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: '1px solid #f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                        fontSize: 13
                    }}
                >
                    <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FireOutlined style={{ color: '#1677ff' }} />
                        Gợi ý:
                    </span>
                    {QUICK_TAGS.map((tag) => (
                        <span
                            key={tag.label}
                            onClick={() => handleQuickSearch(tag)}
                            style={{
                                cursor: 'pointer',
                                padding: '2px 10px',
                                background: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: 14,
                                color: '#374151',
                                fontSize: 12,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#1677ff';
                                e.currentTarget.style.color = '#1677ff';
                                e.currentTarget.style.background = '#f0f7ff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e5e7eb';
                                e.currentTarget.style.color = '#374151';
                                e.currentTarget.style.background = '#f9fafb';
                            }}
                        >
                            {tag.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SearchClient;
