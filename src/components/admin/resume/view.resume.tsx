import { callUpdateResumeStatus, callSendApprovalEmail } from "@/config/api";
import { IResume } from "@/types/backend";
import { Badge, Button, Descriptions, Drawer, Form, Select, message, notification, Modal, DatePicker, TimePicker, Tag, Image, Space } from "antd";
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { PhoneOutlined, ClockCircleOutlined, CalendarOutlined, FileTextOutlined, PictureOutlined } from '@ant-design/icons';
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

    // Phân tích dữ liệu trong cột `url` (có thể là chuỗi file name hoặc JSON thông tin ca rảnh)
    let payload: any = null;
    let fileName = dataInit?.url || '';
    if (dataInit?.url && dataInit.url.startsWith('{')) {
        try {
            payload = JSON.parse(dataInit.url);
            fileName = payload?.file || '';
        } catch (e) {
            payload = null;
        }
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const fileUrl = fileName ? `${backendUrl}/storage/resume/${fileName}` : '';
    const isImageFile = fileName ? /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName) : false;

    return (
        <>
            <Drawer
                title={<span style={{ color: '#873800', fontWeight: 600 }}>🥐 Chi Tiết Đơn Ứng Tuyển Tiệm Bánh</span>}
                placement="right"
                onClose={() => { onClose(false); setDataInit(null); }}
                open={open}
                width={"45vw"}
                maskClosable={false}
                destroyOnClose
                extra={
                    <Button loading={isSubmit} type="primary" onClick={handleChangeStatus} style={{ background: '#d46b08' }}>
                        Cập Nhật Trạng Thái
                    </Button>
                }
            >
                <Descriptions title="Thông tin cơ bản" bordered column={2} layout="vertical">
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
                        <strong style={{ color: '#873800' }}>{dataInit?.job?.name}</strong>
                    </Descriptions.Item>

                    <Descriptions.Item label="Tiệm bánh / Chi nhánh">
                        {dataInit?.companyName || dataInit?.company?.name || 'Tiệm Bánh'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Số điện thoại / Zalo">
                        {payload?.phone ? (
                            <span style={{ color: '#0958d9', fontWeight: 600 }}>
                                <PhoneOutlined /> {payload.phone}
                            </span>
                        ) : 'Chưa cập nhật'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Ngày nộp hồ sơ">
                        {dataInit && dataInit.createdAt ? dayjs(dataInit.createdAt).format('DD/MM/YYYY HH:mm') : ""}
                    </Descriptions.Item>
                </Descriptions>

                {/* Khung thông tin Ca làm việc rảnh & Portfolio ảnh bánh */}
                <div style={{ marginTop: '20px' }}>
                    <Descriptions title="Lịch rảnh & Kỹ năng làm bánh" bordered column={1} layout="vertical">
                        <Descriptions.Item label={<span><ClockCircleOutlined /> Ca làm việc ứng viên có thể nhận:</span>}>
                            {payload?.shifts && payload.shifts.length > 0 ? (
                                <Space wrap>
                                    {payload.shifts.map((s: string, idx: number) => (
                                        <Tag color="orange" key={idx} style={{ fontSize: '13px', padding: '3px 8px' }}>
                                            {s}
                                        </Tag>
                                    ))}
                                </Space>
                            ) : (
                                <span style={{ color: '#999' }}>Chưa đăng ký ca cố định (Linh hoạt)</span>
                            )}
                        </Descriptions.Item>

                        <Descriptions.Item label={<span><CalendarOutlined /> Các ngày trong tuần có thể đi làm:</span>}>
                            {payload?.days && payload.days.length > 0 ? (
                                <Space wrap>
                                    {payload.days.map((d: string, idx: number) => (
                                        <Tag color="cyan" key={idx} style={{ fontWeight: 600 }}>{d}</Tag>
                                    ))}
                                </Space>
                            ) : (
                                <span style={{ color: '#999' }}>Tất cả các ngày</span>
                            )}
                        </Descriptions.Item>

                        {payload?.note && (
                            <Descriptions.Item label="Ghi chú kinh nghiệm từ ứng viên:">
                                <div style={{ background: '#fafafa', padding: '8px 12px', borderRadius: '6px', fontStyle: 'italic' }}>
                                    "{payload.note}"
                                </div>
                            </Descriptions.Item>
                        )}

                        <Descriptions.Item label={<span><PictureOutlined /> Ảnh mẫu bánh / File CV đính kèm:</span>}>
                            {fileUrl ? (
                                <div>
                                    {isImageFile ? (
                                        <div>
                                            <div style={{ marginBottom: '8px', color: '#52c41a', fontWeight: 500 }}>
                                                📷 Ảnh tác phẩm bánh do thợ bánh tự làm:
                                            </div>
                                            <Image
                                                src={fileUrl}
                                                alt="Mẫu bánh"
                                                style={{ maxHeight: 200, borderRadius: 8, objectFit: 'cover' }}
                                                fallback="https://via.placeholder.com/200?text=Banh+Mau"
                                            />
                                        </div>
                                    ) : (
                                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                            <Button icon={<FileTextOutlined />} type="dashed">
                                                Xem File CV Đính Kèm ({fileName})
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <span style={{ color: '#999' }}>Không đính kèm file</span>
                            )}
                        </Descriptions.Item>
                    </Descriptions>
                </div>
            </Drawer>

            {/* Modal xếp lịch thử việc */}
            <Modal
                title={<span style={{ color: '#873800' }}>🥐 Xếp Lịch Thử Việc Tại Tiệm Bánh (Trial Shift)</span>}
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
                        background: '#fffbe6',
                        borderRadius: '8px',
                        border: '1px solid #ffe58f'
                    }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#873800', lineHeight: 1.5 }}>
                            💡 <strong>Tự động hóa:</strong> Hệ thống sẽ tự động gửi <strong>Email Thư Mời Thử Việc</strong> đến ứng viên với đầy đủ ngày giờ, địa chỉ tiệm bánh và dặn dò tác phong bếp (tạp dề, giày chống trượt, vệ sinh ATTP).
                        </p>
                    </div>
                </Form>
            </Modal>
        </>
    );
};

export default ViewDetailResume;
