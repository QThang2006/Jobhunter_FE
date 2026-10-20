import { callUpdateResumeStatus, callSendApprovalEmail } from "@/config/api";
import { IResume } from "@/types/backend";
import { Button, Descriptions, Drawer, Form, Select, message, notification, Modal, DatePicker, TimePicker, Radio, Input, Space, Tag } from "antd";
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { FileTextOutlined, VideoCameraOutlined, ShopOutlined, CopyOutlined, LinkOutlined } from '@ant-design/icons';
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
    const [interviewType, setInterviewType] = useState<'ONLINE_MEET' | 'OFFLINE'>('ONLINE_MEET');

    const handleChangeStatus = async () => {
        const status = form.getFieldValue('status');

        // Nếu chọn APPROVED → Hiện modal xếp lịch phỏng vấn / thử việc
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
            const type = values.interviewType || 'ONLINE_MEET';
            const note = values.note || '';

            setIsModalOpen(false);
            interviewForm.resetFields();
            setIsSubmit(true);

            // Bước 1: Update status thành APPROVED
            const statusRes = await callUpdateResumeStatus(dataInit?.id, 'APPROVED');

            if (statusRes.data) {
                // Bước 2: Gửi thông báo & kích hoạt n8n nếu chọn Google Meet
                const emailRes = await callSendApprovalEmail(
                    dataInit?.id,
                    interviewDate,
                    interviewTime,
                    type,
                    note
                );

                const meetLink = emailRes?.data?.meetLink;

                if (type === 'ONLINE_MEET') {
                    if (meetLink) {
                        Modal.success({
                            title: 'Tạo Lịch Phỏng Vấn Google Meet Thành Công!',
                            width: 520,
                            content: (
                                <div style={{ marginTop: 12 }}>
                                    <p>Hồ sơ đã được <strong>DUYỆT</strong>. Workflow n8n đã tự động lên lịch Google Calendar và gửi email mời phỏng vấn đến ứng viên <strong>{dataInit?.email}</strong>.</p>
                                    <p style={{ margin: '8px 0' }}>
                                        <strong>Thời gian:</strong> {interviewTime} ngày {interviewDate}
                                    </p>
                                    <div style={{
                                        marginTop: 14,
                                        padding: '12px 14px',
                                        background: '#f0f7ff',
                                        borderRadius: 8,
                                        border: '1px solid #bae0ff'
                                    }}>
                                        <div style={{ fontSize: 13, color: '#0958d9', fontWeight: 600, marginBottom: 6 }}>
                                            <VideoCameraOutlined style={{ marginRight: 6 }} />
                                            Link phòng họp Google Meet:
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <a href={meetLink} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: '#1677ff', wordBreak: 'break-all', flex: 1 }}>
                                                {meetLink}
                                            </a>
                                            <Button
                                                size="small"
                                                icon={<CopyOutlined />}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(meetLink);
                                                    message.success("Đã sao chép link Google Meet!");
                                                }}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ),
                            okText: 'Hoàn tất'
                        });
                    } else {
                        message.success(`✅ Hồ sơ đã được DUYỆT!\n📧 Thư mời phỏng vấn trực tuyến đã được gửi đến ứng viên (${interviewDate} lúc ${interviewTime})`);
                    }
                } else {
                    message.success(`✅ Hồ sơ đã được DUYỆT!\n📧 Thư mời thử việc tại tiệm đã được gửi đến ứng viên\n📅 Lịch hẹn: ${interviewDate} lúc ${interviewTime}`);
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
                    <Button loading={isSubmit} type="primary" onClick={handleChangeStatus} style={{ borderRadius: 6 }}>
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
                                    <Option value="APPROVED">APPROVED (Hẹn phỏng vấn / Thử việc)</Option>
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

                    {dataInit?.meetLink && (
                        <Descriptions.Item label="Link Phỏng Vấn (Google Meet)" span={2}>
                            <Space wrap>
                                <a href={dataInit.meetLink} target="_blank" rel="noopener noreferrer">
                                    <Button type="primary" icon={<VideoCameraOutlined />} size="small" style={{ borderRadius: 6 }}>
                                        Vào Google Meet
                                    </Button>
                                </a>
                                <span style={{ color: '#1677ff', fontSize: 13 }}>{dataInit.meetLink}</span>
                            </Space>
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </Drawer>

            {/* Modal xếp lịch phỏng vấn / thử việc */}
            <Modal
                title={<span style={{ color: '#111827', fontWeight: 600 }}>Xếp Lịch Phỏng Vấn / Thử Việc</span>}
                open={isModalOpen}
                onOk={handleInterviewSubmit}
                onCancel={() => {
                    setIsModalOpen(false);
                    interviewForm.resetFields();
                }}
                okText="Xác Nhận & Gửi Thư Mời"
                cancelText="Hủy"
                okButtonProps={{ style: { borderRadius: 6 } }}
                width={540}
                destroyOnClose
            >
                <Form
                    form={interviewForm}
                    layout="vertical"
                    initialValues={{
                        interviewType: 'ONLINE_MEET'
                    }}
                    style={{ marginTop: 15 }}
                >
                    <Form.Item
                        label={<span style={{ fontWeight: 500 }}>Hình Thức Phỏng Vấn</span>}
                        name="interviewType"
                        rules={[{ required: true }]}
                    >
                        <Radio.Group
                            buttonStyle="solid"
                            style={{ width: '100%', display: 'flex' }}
                            onChange={(e) => setInterviewType(e.target.value)}
                        >
                            <Radio.Button value="ONLINE_MEET" style={{ flex: 1, textAlign: 'center' }}>
                                <VideoCameraOutlined style={{ marginRight: 6 }} />
                                Online (Google Meet)
                            </Radio.Button>
                            <Radio.Button value="OFFLINE" style={{ flex: 1, textAlign: 'center' }}>
                                <ShopOutlined style={{ marginRight: 6 }} />
                                Trực tiếp tại tiệm
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    {interviewType === 'ONLINE_MEET' ? (
                        <div style={{
                            padding: '12px 16px',
                            background: '#f0f7ff',
                            borderRadius: '8px',
                            border: '1px solid #bae0ff',
                            marginBottom: 16
                        }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#0958d9', lineHeight: 1.5 }}>
                                ⚡ <strong>Tự động hóa n8n:</strong> Hệ thống sẽ kích hoạt <strong>n8n Workflow</strong> để tạo phòng họp <strong>Google Meet</strong> trên Google Calendar và tự động gửi email thư mời kèm link Meet đến ứng viên <strong>{dataInit?.email}</strong>.
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            padding: '12px 16px',
                            background: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            marginBottom: 16
                        }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: 1.5 }}>
                                💡 <strong>Thử việc tại tiệm:</strong> Hệ thống sẽ gửi email thư mời ứng viên đến địa chỉ tiệm bánh kèm dặn dò tác phong bếp (tạp dề, giày chống trượt).
                            </p>
                        </div>
                    )}

                    <Form.Item
                        label="Ngày hẹn phỏng vấn / thử việc"
                        name="interviewDate"
                        rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}
                    >
                        <DatePicker
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            placeholder="Chọn ngày phỏng vấn"
                            disabledDate={(current) => current && current < dayjs().startOf('day')}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Giờ hẹn"
                        name="interviewTime"
                        rules={[{ required: true, message: 'Vui lòng chọn giờ!' }]}
                    >
                        <TimePicker
                            style={{ width: '100%' }}
                            format="HH:mm"
                            placeholder="Chọn giờ (VD: 09:00)"
                            minuteStep={15}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Ghi chú thêm cho ứng viên"
                        name="note"
                    >
                        <Input.TextArea
                            rows={2}
                            placeholder="VD: Chuẩn bị portfolio hoặc trao đổi thêm về kỹ năng làm bánh mì châu Âu..."
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default ViewDetailResume;
