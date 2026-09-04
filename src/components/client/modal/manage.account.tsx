import { Button, Col, Form, Modal, Row, Select, Table, Tabs, message, notification, Input } from "antd";
import type { TabsProps } from 'antd';
import { IResume, ISubscribers } from "@/types/backend";
import { useState, useEffect } from 'react';
import { callCreateSubscriber, callFetchAllSkill, callFetchResumeByUser, callGetSubscriberSkills, callUpdateSubscriber, callUpdateUser, callFetchUserById, callUpdatePassword } from "@/config/api";
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { MonitorOutlined } from "@ant-design/icons";
import { SKILLS_LIST } from "@/config/utils";
import { useAppSelector } from "@/redux/hooks";
import { useWebSocket } from "@/context/websocket.context";

interface IProps {
    open: boolean;
    onClose: (v: boolean) => void;
}

const UserResume = (props: any) => {
    const [listCV, setListCV] = useState<IResume[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    const { stompClient } = useWebSocket();

    const fetchResume = async () => {
        setIsFetching(true);
        const res = await callFetchResumeByUser();
        if (res && res.data) {
            setListCV(res.data.result as IResume[])
        }
        setIsFetching(false);
    }

    useEffect(() => {
        fetchResume();
    }, [])

    useEffect(() => {
        if (stompClient && stompClient.connected) {
            const sub = stompClient.subscribe('/topic/resumes', (message: any) => {
                fetchResume();
            });
            return () => sub.unsubscribe();
        }
    }, [stompClient]);

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
            title: '',
            dataIndex: "",
            render(value, record, index) {
                return (
                    <a
                        href={`${record?.url ?? ''}`}
                        target="_blank"
                    >Chi tiết</a>
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
                const res = await callFetchUserById(user.id);
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
        const res = await callUpdateUser({ id: user.id, name, age, gender, address, email: user.email });
        if (res && res.data) {
            message.success("Cập nhật thành công");
        } else {
            notification.error({ message: "Có lỗi xảy ra", description: res.message });
        }
        setIsSubmit(false);
    }

    return (
        <Form onFinish={onFinish} form={form} layout="vertical">
            <Row gutter={[20, 20]}>
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
            <Row gutter={[20, 20]}>
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
                <Row gutter={[20, 20]}>
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
                    body: { padding: '12px 16px' }
                }}
                width="min(1000px, 96vw)"
            >
                <div style={{ minHeight: 350 }}>
                    <Tabs
                        defaultActiveKey="user-resume"
                        items={items}
                        onChange={onChange}
                        size="small"
                        style={{ overflowX: 'auto' }}
                    />
                </div>
            </Modal>
        </>
    )
}

export default ManageAccount;