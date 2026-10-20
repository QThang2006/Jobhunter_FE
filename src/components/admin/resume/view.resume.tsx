import { callUpdateResumeStatus, callSendApprovalEmail } from "@/config/api";
import { IResume } from "@/types/backend";
import { Button, Descriptions, Drawer, Form, Select, message, notification, Modal, DatePicker, TimePicker, Radio, Input, Space, Tag } from "antd";
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import { useState, useEffect } from 'react';
import { FileTextOutlined, VideoCameraOutlined, ShopOutlined, CopyOutlined, CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
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

        // Khi HR chọn "REVIEWING" (Duyệt hồ sơ mời phỏng vấn) → Mở modal xếp lịch phỏng vấn
        if (status === 'REVIEWING') {
            // Điền sẵn dữ liệu cũ nếu đã từng đặt lịch
            if (dataInit?.interviewDate && dataInit?.interviewTime) {
                interviewForm.setFieldsValue({
                    interviewType: dataInit?.interviewType || 'ONLINE_MEET',
                    interviewDate: dayjs(dataInit.interviewDate, 'DD/MM/YYYY'),
                    interviewTime: dayjs(dataInit.interviewTime, 'HH:mm'),
                    note: dataInit?.note || ''
                });
                setInterviewType(dataInit?.interviewType || 'ONLINE_MEET');
            } else {
                interviewForm.setFieldsValue({
                    interviewType: 'ONLINE_MEET',
                    note: ''
                });
                setInterviewType('ONLINE_MEET');
            }
            setIsModalOpen(true);
            return;
        }

        // Khi HR chọn "APPROVED" (Nhận việc chính thức) → Xác nhận tuyển dụng
        if (status === 'APPROVED') {
            Modal.confirm({
                title: 'Xác Nhận Tuyển Dụng Chính Thức',
                icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                content: (
                    <div style={{ marginTop: 8 }}>
                        <p>Ứng viên <strong>{dataInit?.email}</strong> đã hoàn thành phỏng vấn và đạt yêu cầu.</p>
                        <p style={{ margin: 0, color: '#4b5563' }}>
                            Khi chuyển sang trạng thái <strong>APPROVED</strong>, ứng viên sẽ được tiếp nhận chính thức và hệ thống sẽ tự động liên kết tài khoản nhân viên vào chi nhánh tiệm bánh.
                        </p>
                    </div>
                ),
                okText: 'Xác Nhận Nhận Việc',
                cancelText: 'Hủy',
                okButtonProps: { style: { borderRadius: 6 } },
                cancelButtonProps: { style: { borderRadius: 6 } },
                onOk: async () => {
                    setIsSubmit(true);
                    const res = await callUpdateResumeStatus(dataInit?.id, 'APPROVED');
                    if (res.data) {
                        message.success("🎉 Hồ sơ đã được DUYỆT CHÍNH THỨC! Ứng viên đã trúng tuyển.");
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
            });
            return;
        }

        // Các trạng thái khác (PENDING, REJECTED)
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
            setIsSubmit(true);

            // Gửi request lên server: Chuyển trạng thái sang REVIEWING + lưu ngày giờ, hình thức vào DB + kích hoạt n8n / gửi email
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
                        title: 'Đã Lên Lịch Phỏng Vấn Online (Google Meet)!',
                        width: 540,
                        content: (
                            <div style={{ marginTop: 12 }}>
                                <p>Hồ sơ đã được chuyển sang trạng thái <strong>REVIEWING (Đang phỏng vấn)</strong>. Workflow n8n đã tự động tạo lịch trên Google Calendar và gửi thư mời kèm link phòng họp đến <strong>{dataInit?.email}</strong>.</p>
                                <p style={{ margin: '8px 0' }}>
                                    <strong>Thời gian phỏng vấn:</strong> {interviewTime} ngày {interviewDate}
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
                        okText: 'Hoàn tất',
                        okButtonProps: { style: { borderRadius: 6 } }
                    });
                } else {
                    message.success(`✅ Đã chuyển sang phỏng vấn!\n📧 Thư mời phỏng vấn trực tuyến đã được gửi đến ứng viên (${interviewTime} ngày ${interviewDate})`);
                }
            } else {
                message.success(`✅ Đã chuyển sang phỏng vấn trực tiếp!\n📧 Thư mời thử việc tại tiệm đã được gửi đến ứng viên\n📅 Lịch hẹn: ${interviewTime} ngày ${interviewDate}`);
            }

            setDataInit(null);
            onClose(false);
            reloadTable();
            setIsSubmit(false);
        } catch (error) {
            console.log('Validation failed:', error);
            setIsSubmit(false);
        }
    };

    useEffect(() => {
        if (dataInit) {
            form.setFieldValue("status", dataInit.status);
            if (dataInit.interviewType) {
                setInterviewType(dataInit.interviewType);
            }
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
                    <Space>
                        {dataInit?.status === 'REVIEWING' && (
                            <Button
                                icon={<CalendarOutlined />}
                                onClick={() => {
                                    if (dataInit?.interviewDate && dataInit?.interviewTime) {
                                        interviewForm.setFieldsValue({
                                            interviewType: dataInit?.interviewType || 'ONLINE_MEET',
                                            interviewDate: dayjs(dataInit.interviewDate, 'DD/MM/YYYY'),
                                            interviewTime: dayjs(dataInit.interviewTime, 'HH:mm'),
                                            note: dataInit?.note || ''
                                        });
                                        setInterviewType(dataInit?.interviewType || 'ONLINE_MEET');
                                    }
                                    setIsModalOpen(true);
                                }}
                                style={{ borderRadius: 6 }}
                            >
                                Đổi Lịch Phỏng Vấn
                            </Button>
                        )}
                        <Button loading={isSubmit} type="primary" onClick={handleChangeStatus} style={{ borderRadius: 6 }}>
                            Cập Nhật Trạng Thái
                        </Button>
                    </Space>
                }
            >
                <Descriptions title="Thông tin hồ sơ ứng tuyển" bordered column={2} layout="vertical">
                    <Descriptions.Item label="Email Ứng Viên">{dataInit?.email}</Descriptions.Item>
                    <Descriptions.Item label="Trạng thái xử lý">
                        <Form form={form}>
                            <Form.Item name={"status"} style={{ margin: 0 }}>
                                <Select style={{ width: "100%" }} defaultValue={dataInit?.status}>
                                    <Option value="PENDING">PENDING (Chờ xem xét)</Option>
                                    <Option value="REVIEWING">REVIEWING (Duyệt hồ sơ & Lên lịch phỏng vấn)</Option>
                                    <Option value="APPROVED">APPROVED (Trúng tuyển & Tiếp nhận chính thức)</Option>
                                    <Option value="REJECTED">REJECTED (Từ chối hồ sơ)</Option>
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
                                <Button icon={<FileTextOutlined />} type="dashed" style={{ borderRadius: 6 }}>
                                    Xem / Tải File CV ({fileName})
                                </Button>
                            </a>
                        ) : (
                            <span style={{ color: '#999' }}>Không đính kèm file</span>
                        )}
                    </Descriptions.Item>

                    {/* Hiển thị chi tiết thông tin phỏng vấn nếu đã có lịch hẹn */}
                    {dataInit?.interviewDate && (
                        <>
                            <Descriptions.Item label="Lịch hẹn phỏng vấn">
                                <Tag color="geekblue" style={{ fontSize: 13, padding: '4px 8px' }}>
                                    🕒 {dataInit.interviewTime} ngày {dataInit.interviewDate}
                                </Tag>
                            </Descriptions.Item>

                            <Descriptions.Item label="Hình thức phỏng vấn">
                                {dataInit?.interviewType === 'OFFLINE' ? (
                                    <Tag color="orange" icon={<ShopOutlined />} style={{ fontSize: 13, padding: '4px 8px' }}>
                                        Trực tiếp tại tiệm bánh
                                    </Tag>
                                ) : (
                                    <Tag color="blue" icon={<VideoCameraOutlined />} style={{ fontSize: 13, padding: '4px 8px' }}>
                                        Online (Google Meet)
                                    </Tag>
                                )}
                            </Descriptions.Item>

                            {dataInit?.meetLink && (
                                <Descriptions.Item label="Phòng Họp Trực Tuyến (Google Meet)" span={2}>
                                    <Space wrap align="center">
                                        <a href={dataInit.meetLink} target="_blank" rel="noopener noreferrer">
                                            <Button type="primary" icon={<VideoCameraOutlined />} size="small" style={{ borderRadius: 6 }}>
                                                Tham Gia Phỏng Vấn
                                            </Button>
                                        </a>
                                        <Button
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() => {
                                                navigator.clipboard.writeText(dataInit.meetLink);
                                                message.success("Đã sao chép link Google Meet!");
                                            }}
                                            style={{ borderRadius: 6 }}
                                        >
                                            Copy Link
                                        </Button>
                                        <span style={{ color: '#1677ff', fontSize: 13, wordBreak: 'break-all' }}>{dataInit.meetLink}</span>
                                    </Space>
                                </Descriptions.Item>
                            )}

                            {dataInit?.note && (
                                <Descriptions.Item label="Ghi chú phỏng vấn" span={2}>
                                    <div style={{ color: '#4b5563', background: '#f9fafb', padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                        {dataInit.note}
                                    </div>
                                </Descriptions.Item>
                            )}
                        </>
                    )}
                </Descriptions>
            </Drawer>

            {/* Modal xếp lịch phỏng vấn (Online Meet qua n8n hoặc Trực tiếp tại tiệm) */}
            <Modal
                title={<span style={{ color: '#111827', fontWeight: 600 }}>Duyệt Hồ Sơ & Lên Lịch Phỏng Vấn</span>}
                open={isModalOpen}
                onOk={handleInterviewSubmit}
                onCancel={() => {
                    setIsModalOpen(false);
                    interviewForm.resetFields();
                }}
                okText="Xác Nhận & Gửi Thư Mời"
                cancelText="Hủy"
                okButtonProps={{ style: { borderRadius: 6 } }}
                cancelButtonProps={{ style: { borderRadius: 6 } }}
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
                                ⚡ <strong>Tự động hóa n8n:</strong> Hệ thống sẽ chuyển hồ sơ sang <strong>REVIEWING</strong>, kích hoạt <strong>n8n Workflow</strong> để tạo lịch trên Google Calendar, sinh link phòng họp <strong>Google Meet</strong> và tự động gửi email thư mời đến <strong>{dataInit?.email}</strong>.
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
                                💡 <strong>Thử việc trực tiếp:</strong> Hệ thống sẽ chuyển hồ sơ sang <strong>REVIEWING</strong> và gửi email thư mời ứng viên đến địa chỉ tiệm bánh kèm dặn dò tác phong bếp (tạp dề, giày chống trượt).
                            </p>
                        </div>
                    )}

                    <Form.Item
                        label={<span style={{ fontWeight: 500 }}>Ngày hẹn phỏng vấn / thử việc</span>}
                        name="interviewDate"
                        rules={[{ required: true, message: 'Vui lòng chọn ngày phỏng vấn!' }]}
                    >
                        <DatePicker
                            style={{ width: '100%', borderRadius: 6 }}
                            format="DD/MM/YYYY"
                            placeholder="Chọn ngày phỏng vấn"
                            disabledDate={(current) => current && current < dayjs().startOf('day')}
                        />
                    </Form.Item>

                    <Form.Item
                        label={<span style={{ fontWeight: 500 }}>Giờ hẹn</span>}
                        name="interviewTime"
                        rules={[{ required: true, message: 'Vui lòng chọn giờ hẹn!' }]}
                    >
                        <TimePicker
                            style={{ width: '100%', borderRadius: 6 }}
                            format="HH:mm"
                            placeholder="Chọn giờ (VD: 09:00)"
                            minuteStep={15}
                        />
                    </Form.Item>

                    <Form.Item
                        label={<span style={{ fontWeight: 500 }}>Ghi chú thêm cho ứng viên</span>}
                        name="note"
                    >
                        <Input.TextArea
                            rows={2}
                            placeholder="VD: Chuẩn bị portfolio hoặc trao đổi thêm về kỹ năng làm bánh..."
                            style={{ borderRadius: 6 }}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default ViewDetailResume;
