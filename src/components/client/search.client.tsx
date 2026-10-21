import { Button, Col, Form, Row, Select, AutoComplete } from 'antd';
import { EnvironmentOutlined, SearchOutlined, ShopOutlined, ReadOutlined, DollarOutlined } from '@ant-design/icons';
import { LOCATION_LIST, LEVEL_LIST, SALARY_LIST } from '@/config/utils';
import { ProForm } from '@ant-design/pro-components';
import { useEffect, useState } from 'react';
import { callFetchCompany } from '@/config/api';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styles from '@/styles/client.module.scss';

const SearchClient = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [form] = Form.useForm();
    const [searchParams] = useSearchParams();

    const [companyOptions, setCompanyOptions] = useState<{ label: string; value: string }[]>([]);

    // Đồng bộ giá trị tìm kiếm từ URL params lên form
    useEffect(() => {
        const qCompany = searchParams.get("company") || searchParams.get("keyword") || searchParams.get("search");
        const qLocation = searchParams.get("location");
        const qLevel = searchParams.get("level");
        const qSalary = searchParams.get("salary");

        form.setFieldsValue({
            company: qCompany || undefined,
            location: qLocation && qLocation !== 'ALL' ? qLocation : undefined,
            level: qLevel && qLevel !== 'ALL' ? qLevel : undefined,
            salary: qSalary && qSalary !== 'ALL' ? qSalary : undefined
        });
    }, [location.search]);

    // Tải danh sách tiệm bánh từ backend để hỗ trợ gợi ý khi nhập tên tiệm
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await callFetchCompany('page=1&size=100&sort=name,asc');
                if (res && res.data && res.data.result) {
                    const opts = res.data.result
                        .filter(c => c.name)
                        .map(c => ({
                            label: c.name as string,
                            value: c.name as string
                        }));
                    setCompanyOptions(opts);
                }
            } catch (e) {
                // fallback
            }
        };
        fetchCompanies();
    }, []);

    const onFinish = async (values: any) => {
        const params = new URLSearchParams();

        if (values?.company && values.company.trim()) {
            params.set("company", values.company.trim());
        }

        if (values?.location && values.location !== 'ALL' && values.location.trim()) {
            params.set("location", values.location.trim());
        }

        if (values?.level && values.level !== 'ALL' && values.level.trim()) {
            params.set("level", values.level.trim());
        }

        if (values?.salary && values.salary !== 'ALL' && values.salary.trim()) {
            params.set("salary", values.salary.trim());
        }

        const queryString = params.toString();
        navigate(queryString ? `/job?${queryString}` : '/job');
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
                        {/* Tiêu chí 1: Tên tiệm bánh */}
                        <Col span={24} sm={12} lg={6}>
                            <ProForm.Item
                                name="company"
                                style={{ marginBottom: 0 }}
                            >
                                <AutoComplete
                                    size="large"
                                    options={companyOptions}
                                    allowClear
                                    style={{ width: '100%' }}
                                    placeholder={
                                        <span style={{ color: '#6b7280' }}>
                                            <ShopOutlined style={{ marginRight: 6 }} />
                                            Tên tiệm bánh...
                                        </span>
                                    }
                                    filterOption={(inputValue, option) =>
                                        option?.value?.toString().toLowerCase().includes(inputValue.toLowerCase()) ?? false
                                    }
                                    onSelect={() => form.submit()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            form.submit();
                                        }
                                    }}
                                />
                            </ProForm.Item>
                        </Col>

                        {/* Tiêu chí 2: Địa chỉ / Khu vực */}
                        <Col span={24} sm={12} lg={5}>
                            <ProForm.Item
                                name="location"
                                style={{ marginBottom: 0 }}
                            >
                                <Select
                                    size="large"
                                    allowClear
                                    style={{ width: '100%' }}
                                    placeholder={
                                        <span style={{ color: '#6b7280' }}>
                                            <EnvironmentOutlined style={{ marginRight: 6 }} />
                                            Địa chỉ / Khu vực
                                        </span>
                                    }
                                    options={LOCATION_LIST}
                                    onChange={() => form.submit()}
                                />
                            </ProForm.Item>
                        </Col>

                        {/* Tiêu chí 3: Trình độ */}
                        <Col span={24} sm={12} lg={5}>
                            <ProForm.Item
                                name="level"
                                style={{ marginBottom: 0 }}
                            >
                                <Select
                                    size="large"
                                    allowClear
                                    style={{ width: '100%' }}
                                    placeholder={
                                        <span style={{ color: '#6b7280' }}>
                                            <ReadOutlined style={{ marginRight: 6 }} />
                                            Trình độ
                                        </span>
                                    }
                                    options={LEVEL_LIST}
                                    onChange={() => form.submit()}
                                />
                            </ProForm.Item>
                        </Col>

                        {/* Tiêu chí 4: Mức lương */}
                        <Col span={24} sm={12} lg={5}>
                            <ProForm.Item
                                name="salary"
                                style={{ marginBottom: 0 }}
                            >
                                <Select
                                    size="large"
                                    allowClear
                                    style={{ width: '100%' }}
                                    placeholder={
                                        <span style={{ color: '#6b7280' }}>
                                            <DollarOutlined style={{ marginRight: 6 }} />
                                            Mức lương
                                        </span>
                                    }
                                    options={SALARY_LIST}
                                    onChange={() => form.submit()}
                                />
                            </ProForm.Item>
                        </Col>

                        {/* Nút Tìm Việc */}
                        <Col span={24} sm={24} lg={3}>
                            <Button
                                type="primary"
                                block
                                size="large"
                                icon={<SearchOutlined />}
                                onClick={() => form.submit()}
                                style={{
                                    fontWeight: 600,
                                    borderRadius: 6,
                                    fontSize: 14
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
