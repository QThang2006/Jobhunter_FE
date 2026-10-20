import { callUpdateResumeStatus, callSendApprovalEmail } from "@/config/api";
import { IResume } from "@/types/backend";
import { Button, Descriptions, Drawer, Form, Select, message, notification, Modal, DatePicker, TimePicker } from "antd";
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { FileTextOutlined } from '@ant-design/icons';
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

        // Nếu chọn APPROVED → Hiện modal nhập lịch thử việc TRƯỚC (chưa update)
        if (status === 'APPROVED') {
            setIsModalOpen(true);
            return;
        }

        // Các status khác (PENDING, REVIEWING, REJECTED) → Update trực tiếp
        setIsSubmit(true);
        const res = await callUpdateResumeStatus(dataInit?.id, status);

        if (res.data) {
            message.success("Cập nhật trạng thái hồ sơ thành công!");
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
    };

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
                // Bước 2: Gửi email thông báo thư mời thử việc
                const emailRes = await callSendApprovalEmail(
                    dataInit?.id,
                    interviewDate,
                    interviewTime
                );

                if (emailRes.statusCode === 200 || emailRes.statusCode === 201) {
                    message.success(`✅ Hồ sơ đã được DUYỆT!\n📧 Thư mời thử việc đã được tự động gửi đến ứng viên\n📅 Lịch thử việc: ${interviewDate} lúc ${interviewTime}`);
                } else {
                    notification.warning({
                        message: 'Hồ sơ đã được duyệt',
                        description: 'Tuy nhiên không thể gửi email thông báo: ' + (emailRes.message || 'Lỗi gửi mail')
                    });
                }

                setDataInit(null);
                onClose(false);
                reloadTable();
            } else {
                notification.error({
                    message: 'Lỗi cập nhật trạng thái',
                    description: statusRes.message
                });
            }

            setIsSubmit(false);
        } catch (error) {
            console.log('Validation failed:', error);
            setIsSubmit(false);
        }
    };

    useEffect(() => {
        if (dataInit) {
            form.setFieldValue("status", dataInit.status);
        }
        return () => form.resetFields();
    }, [dataInit]);

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    let fileName = dataInit?.url || '';
    if (fileName.startsWith('{')) {
        try {
            const parsed = JSON.parse(fileName);
            fileName = parsed?.file || '';
        } catch (e) {
            // keep raw
        }
    }
    const fileUrl = fileName ? `${backendUrl}/storage/resume/${fileName}` : '';

    return (
        <>
            <Drawer
                title={<span style={{ color: '#111827', fontWeight: 600 }}>Chi Tiết Đơn Ứng Tuyển</span>}
                placement="right"
                onClose={() => { onClose(false); setDataInit(null); }}
                open={open}
                width={"45vw"}
                maskClosable={false}
                destroyOnClose
                extra={
                    <Button loading={isSubmit} type="primary" onClick={handleChangeStatus} style={{ background: '#1f2937', borderColor: '#1f2937' }}>
                        Cập Nhật Trạng Thái
                    </Button>
                }
            >
                <Descriptions title="Thông tin hồ sơ ứng tuyển" bordered column={2} layout="vertical">
                    <Descriptions.Item label="Email Ứng Viên">{dataInit?.email}</Descriptions.Item>
                    <Descriptions.Item label="Trạng thái xử lý">
                        <Form form={form}>
                            <Form.Item name={"status"} style={{ margin: 0 }}>
                                <Select style={{ width: "100%" }} defaultValue={dataInit?.status}>
                                    <Option value="PENDING">PENDING (Chờ xem)</Option>
                                    <Option value="REVIEWING">REVIEWING (Đang xem xét)</Option>
                                    <Option value="APPROVED">APPROVED (Hẹn thử việc)</Option>
                                    <Option value="REJECTED">REJECTED (Từ chối)</Option>
                                </Select>
                            </Form.Item>
                        </Form>
                    </Descriptions.Item>

                    <Descriptions.Item label="Vị trí ứng tuyển">
                        <strong style={{ color: '#111827' }}>{dataInit?.job?.name}</strong>
                    </Descriptions.Item>

                    <Descriptions.Item label="Tiệm bánh / Chi nhánh">
                        {dataInit?.companyName || dataInit?.company?.name || 'Tiệm Bánh'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Ngày nộp hồ sơ">
                        {dataInit && dataInit.createdAt ? dayjs(dataInit.createdAt).format('DD/MM/YYYY HH:mm') : ""}
                    </Descriptions.Item>

                    <Descriptions.Item label="File CV Đính Kèm">
                        {fileUrl ? (
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                <Button icon={<FileTextOutlined />} type="dashed">
                                    Xem / Tải File CV ({fileName})
                                </Button>
                            </a>
                        ) : (
                            <span style={{ color: '#999' }}>Không đính kèm file</span>
                        )}
                    </Descriptions.Item>
                </Descriptions>
            </Drawer>

            {/* Modal xếp lịch thử việc */}
            <Modal
                title={<span style={{ color: '#111827', fontWeight: 600 }}>Xếp Lịch Thử Việc / Phỏng Vấn</span>}
                open={isModalOpen}
                onOk={handleInterviewSubmit}
                onCancel={() => {
                    setIsModalOpen(false);
                    interviewForm.resetFields();
                }}
                okText="Xác nhận & Gửi Thư Mời Thử Việc"
                cancelText="Hủy"
                width={520}
            >
                <Form
                    form={interviewForm}
                    layout="vertical"
                    style={{ marginTop: 15 }}
                >
                    <Form.Item
                        label="Ngày hẹn thử việc tại tiệm"
                        name="interviewDate"
                        rules={[{ required: true, message: 'Vui lòng chọn ngày thử việc!' }]}
                    >
                        <DatePicker
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            placeholder="Chọn ngày thử việc"
                            disabledDate={(current) => current && current < dayjs().startOf('day')}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Giờ nhận ca thử việc"
                        name="interviewTime"
                        rules={[{ required: true, message: 'Vui lòng chọn giờ thử việc!' }]}
                    >
                        <TimePicker
                            style={{ width: '100%' }}
                            format="HH:mm"
                            placeholder="Chọn giờ nhận ca (VD: 08:00)"
                            minuteStep={15}
                        />
                    </Form.Item>

                    <div style={{
                        padding: '12px 16px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>
                            <strong>Thông báo:</strong> Hệ thống sẽ tự động gửi <strong>Email Thư Mời Thử Việc</strong> đến ứng viên với thông tin ngày giờ và địa chỉ làm việc.
                        </p>
                    </div>
                </Form>
            </Modal>
        </>
    );
};

export default ViewDetailResume;
