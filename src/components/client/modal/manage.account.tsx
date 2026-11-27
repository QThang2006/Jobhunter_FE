import { Button, Col, Form, Modal, Row, Select, Space, Table, Tabs, message, notification, Input, Alert, Typography } from "antd";
import type { TabsProps } from 'antd';
import { IResume, ISubscribers } from "@/types/backend";
import { useState, useEffect, useCallback } from 'react';
import { callCreateSubscriber, callFetchAllSkill, callFetchResumeByUser, callGetSubscriberSkills, callUpdateSubscriber, callUpdateProfile, callFetchProfile, callUpdatePassword, callGenerateStationCode } from "@/config/api";
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { MonitorOutlined, VideoCameraOutlined, CopyOutlined, LaptopOutlined, ReloadOutlined } from "@ant-design/icons";
import { SKILLS_LIST } from "@/config/utils";
import { useAppSelector } from "@/redux/hooks";
import { useWebSocket } from "@/context/websocket.context";
import UserShiftSchedule from "@/components/client/shift/user.shift";

interface IProps {
    open: boolean;
    onClose: (v: boolean) => void;
}

const UserResume = (props: any) => {
    const [listCV, setListCV] = useState<IResume[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    const { stompClient } = useWebSocket();

    const fetchResume = useCallback(async () => {
        setIsFetching(true);
        const res = await callFetchResumeByUser();
        if (res && res.data) {
            setListCV(res.data.result as IResume[])
        }
        setIsFetching(false);
    }, [])

    useEffect(() => {
        fetchResume();
    }, [fetchResume])

    const user = useAppSelector(state => state.account.user);

    useEffect(() => {
        if (!stompClient || !stompClient.connected || !user?.id) return;
        // Subscribe riêng theo userId — chỉ nhận sự kiện của chính mình
        const sub = stompClient.subscribe(`/topic/resumes/${user.id}`, () => {
            fetchResume();
        });
        return () => sub.unsubscribe();
    }, [stompClient, user?.id, fetchResume]);

    const columns: ColumnsType<IResume> = [
        {
            title: 'STT',
            key: 'index',
            width: 50,
            align: "center",
            render: (text, record, index) => {
                return (
                    <>
                        {(index + 1)}
                    </>)
            }
        },
        {
            title: 'Công Ty',
            dataIndex: "companyName",

        },
        {
            title: 'Job title',
            dataIndex: ["job", "name"],

        },
        {
            title: 'Trạng thái',
            dataIndex: "status",
        },
        {
            title: 'Ngày rải CV',
            dataIndex: "createdAt",
            render(value, record, index) {
                return (
                    <>{dayjs(record.createdAt).format('DD-MM-YYYY HH:mm:ss')}</>
                )
            },
        },
        {
            title: 'Thao tác',
            dataIndex: "",
            render(value, record, index) {
                const getFileUrl = (url?: string) => {
                    if (!url) return '#';
                    if (url.startsWith('http://') || url.startsWith('https://')) return url;
                    return `${import.meta.env.VITE_BACKEND_URL}/storage/resume/${url}`;
                };
                return (
                    <Space size={10}>
                        <a
                            href={getFileUrl(record?.url)}
                            target="_blank"
                            rel="noreferrer"
                        >Xem CV</a>
                        {record?.id && (
                            <Button
                                size="small"
                                type="primary"
                                ghost
                                icon={<VideoCameraOutlined />}
                                onClick={() => window.open(`/interview/${record.id}`, '_blank')}
                            >
                                Phòng P2P
                            </Button>
                        )}
                    </Space>
                )
            },
        },
    ];

    return (
        <div style={{ overflowX: 'auto' }}>
            <Table<IResume>
                columns={columns}
                dataSource={listCV}
                loading={isFetching}
                pagination={false}
                scroll={{ x: 600 }}
            />
        </div>
    )
}

const UserUpdateInfo = (props: any) => {
    const user = useAppSelector(state => state.account.user);
    const [form] = Form.useForm();
    const [isSubmit, setIsSubmit] = useState(false);

    useEffect(() => {
        // Fill data from Redux first (Name, Email)
        if (user) {
            form.setFieldsValue({
                email: user.email,
                name: user.name,
                // age, gender, address will wait for API or be user input
            });
        }

        const init = async () => {
            if (user?.id) {
                const res = await callFetchProfile();
                if (res && res.data) {
                    form.setFieldsValue({
                        ...res.data,
                        email: user.email // Ensure email is consistent
                    });
                }
            }
        }
        init();
    }, [user])

    const onFinish = async (values: any) => {
        const { name, age, gender, address } = values;
        setIsSubmit(true);
        const res = await callUpdateProfile({ id: user.id, name, age, gender, address, email: user.email });
        if (res && res.data) {
            message.success("Cập nhật thành công");
        } else {
            notification.error({ message: "Có lỗi xảy ra", description: res.message });
        }
        setIsSubmit(false);
    }

    return (
        <Form onFinish={onFinish} form={form} layout="vertical">
            <Row gutter={[20, 20]} style={{ margin: 0 }}>
                <Col span={24}>
                    <Form.Item label="Email" name="email" initialValue={user?.email}>
                        <Input disabled />
                    </Form.Item>
                </Col>
                <Col span={24}>
                    <Form.Item label="Tên hiển thị" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
                        <Input />
                    </Form.Item>
                    {/* Note: Actually better to use Input, but Select mode tags allows typing text easily if we want, 
                        BUT standard Input is better. Let's use standard imports if available, but Input is not imported from antd yet.
                        Wait, imports at line 1 has Select, but not Input. I should add Input to imports or just use available components. 
                        Let's check imports. */}
                </Col>
                <Col span={12}>
                    <Form.Item label="Tuổi" name="age" rules={[{ required: true, message: 'Vui lòng nhập tuổi!' }]}>
                        <Input type="number" />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Giới tính" name="gender" rules={[{ required: true, message: 'Vui lòng chọn giới tính!' }]}>
                        <Select>
                            <Select.Option value="MALE">Nam</Select.Option>
                            <Select.Option value="FEMALE">Nữ</Select.Option>
                            <Select.Option value="OTHER">Khác</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={24}>
                    <Form.Item label="Địa chỉ" name="address" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}>
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={24}>
                    <Button onClick={() => form.submit()} loading={isSubmit}>Cập nhật</Button>
                </Col>
            </Row>
        </Form>
    )
}

const UserPassword = (props: any) => {
    const user = useAppSelector(state => state.account.user);
    const [form] = Form.useForm();
    const [isSubmit, setIsSubmit] = useState(false);

    const onFinish = async (values: any) => {
        const { email, oldpass, newpass } = values;
        setIsSubmit(true);
        const res = await callUpdatePassword(user.email, oldpass, newpass);
        if (res.statusCode === 200) {
            message.success("Đổi mật khẩu thành công");
            form.resetFields();
        } else {
            notification.error({
                message: 'Có lỗi xảy ra',
                description: res.message
            });
        }
        setIsSubmit(false);
    }

    return (
        <Form onFinish={onFinish} form={form} layout="vertical">
            <Row gutter={[20, 20]} style={{ margin: 0 }}>
                <Col span={24}>
                    <Form.Item label="Email" name="email" initialValue={user?.email}>
                        <Input disabled />
                    </Form.Item>
                </Col>
                <Col span={24}>
                    {/* Text field for passwords. Since I don't have Input imported, I'll add it in first chunk */}
                    <Form.Item label="Mật khẩu cũ" name="oldpass" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ!' }]}>
                        <Input.Password />
                    </Form.Item>
                </Col>
                <Col span={24}>
                    <Form.Item label="Mật khẩu mới" name="newpass" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới!' }]}>
                        <Input.Password />
                    </Form.Item>
                </Col>
                <Col span={24}>
                    <Button onClick={() => form.submit()} loading={isSubmit}>Đổi mật khẩu</Button>
                </Col>
            </Row>
        </Form>
    )
}

const JobByEmail = (props: any) => {
    const [form] = Form.useForm();
    const user = useAppSelector(state => state.account.user);
    const [optionsSkills, setOptionsSkills] = useState<{
        label: string;
        value: string;
    }[]>([]);

    const [subscriber, setSubscriber] = useState<ISubscribers | null>(null);

    useEffect(() => {
        const init = async () => {
            await fetchSkill();
            const res = await callGetSubscriberSkills();
            if (res && res.data) {
                setSubscriber(res.data);
                const d = res.data.skills;
                const arr = d.map((item: any) => {
                    return {
                        label: item.name as string,
                        value: item.id + "" as string
                    }
                });
                form.setFieldValue("skills", arr);
            }
        }
        init();
    }, [])

    const fetchSkill = async () => {
        let query = `page=1&size=100&sort=createdAt,desc`;

        const res = await callFetchAllSkill(query);
        if (res && res.data) {
            const arr = res?.data?.result?.map(item => {
                return {
                    label: item.name as string,
                    value: item.id + "" as string
                }
            }) ?? [];
            setOptionsSkills(arr);
        }
    }

    const onFinish = async (values: any) => {
        const { skills } = values;

        const arr = skills?.map((item: any) => {
            if (item?.id) return { id: item.id };
            return { id: item }
        });

        if (!subscriber?.id) {
            //create subscriber
            const data = {
                email: user.email,
                name: user.name,
                skills: arr
            }

            const res = await callCreateSubscriber(data);
            if (res.data) {
                message.success("Cập nhật thông tin thành công");
                setSubscriber(res.data);
            } else {
                notification.error({
                    message: 'Có lỗi xảy ra',
                    description: res.message
                });
            }


        } else {
            //update subscriber
            const res = await callUpdateSubscriber({
                id: subscriber?.id,
                skills: arr
            });
            if (res.data) {
                message.success("Cập nhật thông tin thành công");
                setSubscriber(res.data);
            } else {
                notification.error({
                    message: 'Có lỗi xảy ra',
                    description: res.message
                });
            }
        }


    }

    return (
        <>
            <Form
                onFinish={onFinish}
                form={form}
            >
                <Row gutter={[20, 20]} style={{ margin: 0 }}>
                    <Col span={24}>
                        <Form.Item
                            label={"Kỹ năng"}
                            name={"skills"}
                            rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 skill!' }]}

                        >
                            <Select
                                mode="multiple"
                                allowClear
                                suffixIcon={null}
                                style={{ width: '100%' }}
                                placeholder={
                                    <>
                                        <MonitorOutlined /> Tìm theo kỹ năng...
                                    </>
                                }
                                optionLabelProp="label"
                                options={optionsSkills}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Button onClick={() => form.submit()}>Cập nhật</Button>
                    </Col>
                </Row>
            </Form>
        </>
    )
}

const StationAppConnect = () => {
    const user = useAppSelector(state => state.account.user);
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState<string>('');
    const [formattedCode, setFormattedCode] = useState<string>('');
    const [secondsLeft, setSecondsLeft] = useState<number>(0);

    useEffect(() => {
        if (secondsLeft <= 0) return;
        const timer = setInterval(() => {
            setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [secondsLeft]);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await callGenerateStationCode();
            if (res?.data?.code) {
                setCode(res.data.code);
                setFormattedCode(res.data.formattedCode || res.data.code);
                setSecondsLeft(res.data.expiresInSeconds || 120);
                message.success("Đã tạo mã đăng nhập 6 số cho App Xưởng Bánh!");
            } else {
                notification.error({
                    message: 'Không thể tạo mã kết nối',
                    description: res?.message || 'Vui lòng thử lại.'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const ss = String(secondsLeft % 60).padStart(2, '0');

    return (
        <div style={{ maxWidth: 560, padding: '8px 4px' }}>
            <Alert
                type="info"
                showIcon
                icon={<LaptopOutlined />}
                message="Đăng nhập nhanh App Desktop Xưởng Bánh (JobCake Station)"
                description={
                    <span>
                        Dành cho tài khoản đăng nhập bằng <strong>Google (Gmail)</strong> hoặc không muốn gõ mật khẩu trên máy quầy bếp.
                        Mã 6 số chỉ dùng <strong>đúng 1 lần</strong> và tự hết hạn sau <strong>2 phút</strong>.
                    </span>
                }
                style={{ marginBottom: 18, borderRadius: 8 }}
            />

            <div style={{
                padding: '20px 24px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                textAlign: 'center'
            }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                    Tài khoản kết nối: <strong>{user?.name}</strong> ({user?.email})
                </div>

                {code && secondsLeft > 0 ? (
                    <>
                        <Typography.Title
                            level={1}
                            style={{
                                margin: '8px 0 4px',
                                letterSpacing: 10,
                                color: '#1677ff',
                                fontFamily: 'monospace',
                                fontSize: 40
                            }}
                        >
                            {formattedCode}
                        </Typography.Title>
                        <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 16 }}>
                            ⏱ Còn hiệu lực: {mm}:{ss} (chỉ dùng 1 lần)
                        </div>
                        <Space wrap>
                            <Button
                                type="primary"
                                icon={<CopyOutlined />}
                                onClick={() => {
                                    navigator.clipboard.writeText(code);
                                    message.success("Đã sao chép mã 6 số!");
                                }}
                            >
                                Sao chép mã
                            </Button>
                            <Button icon={<ReloadOutlined />} loading={loading} onClick={handleGenerate}>
                                Tạo mã mới
                            </Button>
                        </Space>
                    </>
                ) : (
                    <>
                        {code && secondsLeft === 0 && (
                            <div style={{ color: '#d97706', fontSize: 13, marginBottom: 12 }}>
                                Mã trước đó đã hết hạn. Bấm nút bên dưới để lấy mã mới.
                            </div>
                        )}
                        <Button
                            type="primary"
                            size="large"
                            icon={<LaptopOutlined />}
                            loading={loading}
                            onClick={handleGenerate}
                            style={{ borderRadius: 8 }}
                        >
                            Tạo Mã Đăng Nhập App (6 số)
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

const ManageAccount = (props: IProps) => {
    const { open, onClose } = props;

    const onChange = (key: string) => {
        // console.log(key);
    };

    const items: TabsProps['items'] = [
        {
            key: 'user-resume',
            label: `CV của tôi`,
            children: <UserResume />,
        },
        {
            key: 'user-shift',
            label: `Lịch ca làm của tôi`,
            children: <UserShiftSchedule />,
        },
        {
            key: 'station-app-connect',
            label: `Kết nối App Xưởng Bánh`,
            children: <StationAppConnect />,
        },
        {
            key: 'email-by-skills',
            label: `Nhận Job qua Email`,
            children: <JobByEmail />,
        },
        {
            key: 'user-update-info',
            label: `Hồ sơ`,
            children: <UserUpdateInfo />,
        },
        {
            key: 'user-password',
            label: `Mật khẩu`,
            children: <UserPassword />,
        },
    ];


    return (
        <>
            <Modal
                title="Quản lý tài khoản"
                open={open}
                onCancel={() => onClose(false)}
                maskClosable={false}
                footer={null}
                destroyOnClose={true}
                style={{ top: 20 }}
                styles={{
                    body: { padding: '12px 16px', overflowX: 'hidden' }
                }}
                width="min(1000px, 96vw)"
            >
                <div style={{ minHeight: 350, overflowX: 'hidden' }}>
                    <Tabs
                        defaultActiveKey="user-resume"
                        items={items}
                        onChange={onChange}
                        size="small"
                    />
                </div>
            </Modal>
        </>
    )
}

export default ManageAccount;