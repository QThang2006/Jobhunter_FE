import { callUpdateResumeStatus, callSendApprovalEmail } from "@/config/api";
import { IResume } from "@/types/backend";
import { Badge, Button, Descriptions, Drawer, Form, Select, message, notification, Modal, DatePicker, TimePicker } from "antd";
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
const { Option } = Select;

interface IProps {
    onClose: (v: boolean) => void;
    open: boolean;
    dataInit: IResume | null | any;
    setDataInit: (v: any) => void;
    reloadTable: () => void;
}
const ViewDetailResume = (props: IProps) => {
    const [isSubmit, setIsSubmit] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [interviewForm] = Form.useForm();
    const { onClose, open, dataInit, setDataInit, reloadTable } = props;
    const [form] = Form.useForm();

    const handleChangeStatus = async () => {
        const status = form.getFieldValue('status');

        // Nếu chọn APPROVED → Hiện modal nhập lịch PV TRƯỚC (chưa update)
        if (status === 'APPROVED') {
            setIsModalOpen(true);
            return;
        }

        // Các status khác (PENDING, REVIEWING, REJECTED) → Update trực tiếp
        setIsSubmit(true);
        const res = await callUpdateResumeStatus(dataInit?.id, status);

        if (res.data) {
            message.success("Update Resume status thành công!");
            setDataInit(null);
            onClose(false);
            reloadTable();
        } else {
            notification.error({
                message: 'Có lỗi xảy ra',
                description: res.message
            });
        }

        setIsSubmit(false);
    }


    const handleInterviewSubmit = async () => {
        try {
            const values = await interviewForm.validateFields();
            const interviewDate = dayjs(values.interviewDate).format('DD/MM/YYYY');
            const interviewTime = dayjs(values.interviewTime).format('HH:mm');

            setIsModalOpen(false);
            interviewForm.resetFields();
            setIsSubmit(true);

            // Bước 1: Update status thành APPROVED
            const statusRes = await callUpdateResumeStatus(dataInit?.id, 'APPROVED');

            if (statusRes.data) {
                // Bước 2: Gửi email thông báo lịch phỏng vấn
                const emailRes = await callSendApprovalEmail(
                    dataInit?.id,
                    interviewDate,
                    interviewTime
                );

                // Check statusCode thay vì data (vì backend không trả null)
                if (emailRes.statusCode === 200 || emailRes.statusCode === 201) {
                    message.success(`✅ Resume đã được APPROVED!\n📧 Email thông báo đã gửi đến ứng viên\n📅 Lịch phỏng vấn: ${interviewDate} lúc ${interviewTime}`);
                } else {
                    // Status đã update nhưng email failed
                    notification.warning({
                        message: 'Resume đã được APPROVED',
                        description: 'Tuy nhiên không thể gửi email thông báo: ' + (emailRes.message || 'Lỗi không xác định')
                    });
                }

                setDataInit(null);
                onClose(false);
                reloadTable();
            } else {
                notification.error({
                    message: 'Lỗi cập nhật status',
                    description: statusRes.message
                });
            }

            setIsSubmit(false);
        } catch (error) {
            console.log('Validation failed:', error);
            setIsSubmit(false);
        }
    }

    useEffect(() => {
        if (dataInit) {
            form.setFieldValue("status", dataInit.status)
        }
        return () => form.resetFields();
    }, [dataInit])

    return (
        <>
            <Drawer
                title="Thông Tin Resume"
                placement="right"
                onClose={() => { onClose(false); setDataInit(null) }}
                open={open}
                width={"40vw"}
                maskClosable={false}
                destroyOnClose
                extra={

                    <Button loading={isSubmit} type="primary" onClick={handleChangeStatus}>
                        Change Status
                    </Button>

                }
            >
                <Descriptions title="" bordered column={2} layout="vertical">
                    <Descriptions.Item label="Email">{dataInit?.email}</Descriptions.Item>
                    <Descriptions.Item label="Trạng thái">
                        <Form
                            form={form}
                        >
                            <Form.Item name={"status"}>
                                <Select
                                    style={{ width: "100%" }}
                                    defaultValue={dataInit?.status}
                                >
                                    <Option value="PENDING">PENDING</Option>
                                    <Option value="REVIEWING">REVIEWING</Option>
                                    <Option value="APPROVED">APPROVED</Option>
                                    <Option value="REJECTED">REJECTED</Option>
                                </Select>
                            </Form.Item>
                        </Form>

                    </Descriptions.Item>
                    <Descriptions.Item label="Tên Job">
                        {dataInit?.job?.name}

                    </Descriptions.Item>
                    <Descriptions.Item label="Tên Công Ty">
                        {dataInit?.companyName}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày tạo">{dataInit && dataInit.createdAt ? dayjs(dataInit.createdAt).format('DD-MM-YYYY HH:mm:ss') : ""}</Descriptions.Item>
                    <Descriptions.Item label="Ngày sửa">{dataInit && dataInit.updatedAt ? dayjs(dataInit.updatedAt).format('DD-MM-YYYY HH:mm:ss') : ""}</Descriptions.Item>

                </Descriptions>
            </Drawer>

            {/* Modal nhập lịch phỏng vấn */}
            <Modal
                title="📅 Đặt lịch phỏng vấn"
                open={isModalOpen}
                onOk={handleInterviewSubmit}
                onCancel={() => {
                    setIsModalOpen(false);
                    interviewForm.resetFields();
                }}
                okText="Xác nhận"
                cancelText="Hủy"
                width={500}
            >
                <Form
                    form={interviewForm}
                    layout="vertical"
                    style={{ marginTop: 20 }}
                >
                    <Form.Item
                        label="Ngày phỏng vấn"
                        name="interviewDate"
                        rules={[{ required: true, message: 'Vui lòng chọn ngày phỏng vấn!' }]}
                    >
                        <DatePicker
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            placeholder="Chọn ngày"
                            disabledDate={(current) => {
                                // Không cho chọn ngày trong quá khứ
                                return current && current < dayjs().startOf('day');
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Giờ phỏng vấn"
                        name="interviewTime"
                        rules={[{ required: true, message: 'Vui lòng chọn giờ phỏng vấn!' }]}
                    >
                        <TimePicker
                            style={{ width: '100%' }}
                            format="HH:mm"
                            placeholder="Chọn giờ"
                            minuteStep={15}
                        />
                    </Form.Item>

                    <div style={{
                        padding: '12px',
                        background: '#f0f5ff',
                        borderRadius: '8px',
                        border: '1px solid #d6e4ff'
                    }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                            💡 <strong>Lưu ý:</strong> Email thông báo sẽ được gửi tự động đến ứng viên với thông tin lịch phỏng vấn.
                        </p>
                    </div>
                </Form>
            </Modal>
        </>
    )
}

export default ViewDetailResume;