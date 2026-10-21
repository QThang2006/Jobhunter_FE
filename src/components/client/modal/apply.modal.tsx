import { useAppSelector } from "@/redux/hooks";
import { IJob } from "@/types/backend";
import { Button, Col, ConfigProvider, Divider, Form, Input, Modal, Row, Upload, message, notification, Tag, Alert, Result } from "antd";
import { useNavigate } from "react-router-dom";
import viVN from 'antd/lib/locale/vi_VN';
import { UploadOutlined, CheckCircleOutlined, ShopOutlined, EnvironmentOutlined, UserOutlined, MailOutlined, PhoneOutlined, LockOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { callCreateResume, callQuickApplyResume, callUploadSingleFile } from "@/config/api";
import { useState } from 'react';
import dayjs from 'dayjs';

interface IProps {
    isModalOpen: boolean;
    setIsModalOpen: (v: boolean) => void;
    jobDetail: IJob | null;
}

const ApplyModal = (props: IProps) => {
    const { isModalOpen, setIsModalOpen, jobDetail } = props;
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const user = useAppSelector(state => state.account.user);

    // Form inputs for unauthenticated applicants (từ link rải)
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [urlCV, setUrlCV] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isSuccess, setIsSuccess] = useState<boolean>(false);
    const [submittedEmail, setSubmittedEmail] = useState<string>('');

    const navigate = useNavigate();

    const getDisplayFileName = (url: string) => {
        if (!url) return '';
        try {
            const rawName = decodeURIComponent(url.split('/').pop() || '');
            return rawName.replace(/^[0-9a-fA-F-]{36}-/, '') || rawName;
        } catch {
            return url.split('/').pop() || url;
        }
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setIsSuccess(false);
        setUrlCV('');
        setName('');
        setEmail('');
        setPhone('');
        setNote('');
    };

    const handleOkButton = async () => {
        if (jobDetail?.endDate && dayjs(jobDetail.endDate).isBefore(dayjs(), 'day')) {
            notification.error({
                message: "Hết hạn nộp hồ sơ",
                description: "Vị trí tuyển dụng này đã hết hạn nhận hồ sơ!"
            });
            setIsModalOpen(false);
            return;
        }

        if (jobDetail?.startDate && dayjs(jobDetail.startDate).isAfter(dayjs(), 'day')) {
            notification.error({
                message: "Chưa đến thời gian nộp hồ sơ",
                description: "Vị trí này chưa mở nhận hồ sơ, vui lòng quay lại sau!"
            });
            setIsModalOpen(false);
            return;
        }

        if (!urlCV) {
            message.error("Vui lòng tải lên file CV của bạn trước khi nộp đơn!");
            return;
        }

        if (!jobDetail?.id) return;

        setIsSubmitting(true);
        try {
            if (isAuthenticated) {
                // Đã đăng nhập: nộp thông qua API chuẩn
                const res = await callCreateResume(urlCV, jobDetail.id, user.email, user.id);
                if (res?.data) {
                    message.success("Nộp đơn ứng tuyển thành công! Tiệm bánh sẽ liên hệ bạn sớm nhất.");
                    handleClose();
                } else {
                    notification.error({
                        message: 'Có lỗi xảy ra',
                        description: res.message
                    });
                }
            } else {
                // Chưa đăng nhập (vào từ link rải): nộp nhanh tự động cấp tài khoản
                if (!name.trim()) {
                    message.error("Vui lòng nhập Họ và tên của bạn!");
                    setIsSubmitting(false);
                    return;
                }
                if (!email.trim() || !email.includes('@')) {
                    message.error("Vui lòng nhập Email hợp lệ để nhận thông tin tài khoản và kết quả!");
                    setIsSubmitting(false);
                    return;
                }

                const res = await callQuickApplyResume({
                    jobId: jobDetail.id,
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    phone: phone.trim(),
                    urlCV: urlCV,
                    note: note.trim()
                });

                if (res?.data) {
                    setSubmittedEmail(email.trim().toLowerCase());
                    setIsSuccess(true);
                } else {
                    notification.error({
                        message: 'Nộp hồ sơ thất bại',
                        description: res.message || 'Vui lòng kiểm tra lại thông tin.'
                    });
                }
            }
        } catch (error: any) {
            notification.error({
                message: 'Lỗi nộp hồ sơ',
                description: error?.response?.data?.message || error?.message || 'Vui lòng thử lại sau.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const propsUpload: UploadProps = {
        maxCount: 1,
        multiple: false,
        accept: "application/pdf,application/msword, .doc, .docx",
        async customRequest({ file, onSuccess, onError }: any) {
            const res = await callUploadSingleFile(file, "resume");
            if (res && res.data) {
                setUrlCV(res.data.fileName);
                if (onSuccess) onSuccess('ok');
            } else {
                if (onError) {
                    setUrlCV("");
                    const error = new Error(res.message);
                    onError({ event: error });
                }
            }
        },
        onChange(info) {
            if (info.file.status === 'done') {
                message.success(`${info.file.name} đã tải lên thành công!`);
            } else if (info.file.status === 'error') {
                message.error(info?.file?.error?.event?.message ?? "Đã có lỗi xảy ra khi upload file.");
            }
        },
        onRemove() {
            setUrlCV("");
        }
    };

    return (
        <Modal
            title={
                <div style={{ color: '#111827', fontSize: '17px', fontWeight: 600 }}>
                    {isSuccess ? 'Xác Nhận Ứng Tuyển' : `Ứng Tuyển Vị Trí: ${jobDetail?.name}`}
                </div>
            }
            open={isModalOpen}
            onOk={isSuccess ? handleClose : handleOkButton}
            onCancel={handleClose}
            maskClosable={false}
            okText={isSuccess ? "Hoàn tất" : "Nộp Đơn Ứng Tuyển"}
            cancelText="Hủy"
            cancelButtonProps={{ style: { display: isSuccess ? 'none' : undefined } }}
            okButtonProps={{
                style: {
                    borderRadius: 6,
                    fontWeight: 500,
                    background: isSuccess ? '#52c41a' : undefined
                }
            }}
            confirmLoading={isSubmitting}
            destroyOnClose={true}
            width={560}
            styles={{
                body: { overflowX: 'hidden' }
            }}
        >
            <Divider style={{ margin: '12px 0 16px 0', borderColor: '#f0f0f0' }} />

            {isSuccess ? (
                <Result
                    status="success"
                    title={<span style={{ fontSize: 18, fontWeight: 600 }}>Nộp Hồ Sơ Thành Công!</span>}
                    subTitle={
                        <div style={{ textAlign: 'left', background: '#f8fafc', padding: 16, borderRadius: 8, marginTop: 12 }}>
                            <p style={{ margin: '0 0 8px 0', color: '#1e293b' }}>
                                🎉 Hồ sơ của bạn đã được chuyển tới bộ phận nhân sự của <strong>{jobDetail?.company?.name || 'tiệm bánh'}</strong>.
                            </p>
                            <p style={{ margin: '0 0 8px 0', color: '#475569', fontSize: 13 }}>
                                📧 Hệ thống đã tự động tạo tài khoản và gửi thông tin đăng nhập vào email: <strong style={{ color: '#2563eb' }}>{submittedEmail}</strong>.
                            </p>
                            <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>
                                * Bạn có thể đăng nhập vào hệ thống bất cứ lúc nào bằng tài khoản trên để theo dõi kết quả phỏng vấn và lịch ca làm việc.
                            </p>
                        </div>
                    }
                    extra={[
                        <Button
                            type="primary"
                            key="login"
                            onClick={() => {
                                handleClose();
                                navigate('/login');
                            }}
                        >
                            Đăng nhập theo dõi hồ sơ
                        </Button>,
                        <Button key="close" onClick={handleClose}>
                            Đóng
                        </Button>
                    ]}
                />
            ) : (
                <ConfigProvider locale={viVN}>
                    {/* Thẻ tóm tắt thông tin: tiệm bánh & địa điểm */}
                    <div style={{
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px'
                    }}>
                        <div style={{ fontSize: '14px', color: '#374151' }}>
                            <ShopOutlined style={{ color: '#6b7280', marginRight: 8 }} />
                            Đơn vị tuyển dụng: <strong style={{ color: '#111827' }}>{jobDetail?.company?.name || 'Chưa cập nhật'}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            <EnvironmentOutlined style={{ color: '#6b7280', marginRight: 8 }} />
                            Địa điểm làm việc: <span>{jobDetail?.location || 'Chưa cập nhật'}</span>
                        </div>
                    </div>

                    {!isAuthenticated && (
                        <Alert
                            type="info"
                            showIcon
                            message="Ứng tuyển nhanh không cần đăng nhập"
                            description="Bạn có thể nộp đơn trực tiếp ngay bây giờ. Hệ thống sẽ tự động cấp tài khoản theo dõi hồ sơ qua email của bạn."
                            style={{ marginBottom: 16, fontSize: 13 }}
                        />
                    )}

                    <Form layout="vertical">
                        {isAuthenticated ? (
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 500, color: '#374151' }}>Tên Ứng Viên</span>}
                                        style={{ marginBottom: 16 }}
                                    >
                                        <Input
                                            value={user?.name || ''}
                                            disabled
                                            prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                                            style={{ background: '#f3f4f6', color: '#374151', borderRadius: 6 }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label={<span style={{ fontWeight: 500, color: '#374151' }}>Email Liên Hệ</span>}
                                        style={{ marginBottom: 16 }}
                                    >
                                        <Input
                                            value={user?.email || ''}
                                            disabled
                                            prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                                            style={{ background: '#f3f4f6', color: '#374151', borderRadius: 6 }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        ) : (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item
                                            label={<span style={{ fontWeight: 500, color: '#374151' }}>Họ và tên của bạn</span>}
                                            required
                                            style={{ marginBottom: 14 }}
                                        >
                                            <Input
                                                placeholder="VD: Nguyễn Văn A"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                                                style={{ borderRadius: 6 }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item
                                            label={<span style={{ fontWeight: 500, color: '#374151' }}>Số điện thoại</span>}
                                            style={{ marginBottom: 14 }}
                                        >
                                            <Input
                                                placeholder="VD: 0987654321"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />}
                                                style={{ borderRadius: 6 }}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item
                                    label={<span style={{ fontWeight: 500, color: '#374151' }}>Email nhận kết quả & thông tin tài khoản</span>}
                                    required
                                    style={{ marginBottom: 14 }}
                                    extra={<span style={{ color: '#6b7280', fontSize: 12 }}>Mật khẩu tài khoản sẽ được gửi tự động về email này</span>}
                                >
                                    <Input
                                        placeholder="VD: nguyenvana@gmail.com"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                                        style={{ borderRadius: 6 }}
                                    />
                                </Form.Item>

                                <Form.Item
                                    label={<span style={{ fontWeight: 500, color: '#374151' }}>Lời nhắn / Tóm tắt kinh nghiệm làm bánh</span>}
                                    style={{ marginBottom: 14 }}
                                >
                                    <Input.TextArea
                                        rows={2}
                                        placeholder="VD: Có 1 năm kinh nghiệm làm bánh mì Artisan, biết tạo hình bánh..."
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        style={{ borderRadius: 6 }}
                                    />
                                </Form.Item>
                            </>
                        )}

                        <Form.Item
                            label={<span style={{ fontWeight: 500, color: '#374151' }}>Tải lên file CV ứng tuyển:</span>}
                            required
                            style={{ marginBottom: 14 }}
                            extra={<span style={{ color: '#6b7280', fontSize: 12 }}>Định dạng hỗ trợ: .pdf, .doc, .docx, ảnh (Dung lượng &lt; 10MB)</span>}
                        >
                            <Upload {...propsUpload}>
                                <Button
                                    icon={<UploadOutlined style={{ color: '#6b7280' }} />}
                                    style={{
                                        background: '#ffffff',
                                        borderColor: '#d1d5db',
                                        color: '#374151',
                                        borderRadius: 6,
                                        fontWeight: 500
                                    }}
                                >
                                    Chọn File CV Đính Kèm
                                </Button>
                            </Upload>

                            {urlCV && (
                                <div style={{ marginTop: '10px', maxWidth: '100%', overflow: 'hidden' }}>
                                    <Tag
                                        icon={<CheckCircleOutlined style={{ color: '#059669' }} />}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: 13,
                                            background: '#f0fdf4',
                                            border: '1px solid #bbf7d0',
                                            color: '#166534',
                                            borderRadius: 4,
                                            maxWidth: '100%',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <span style={{ marginRight: 6, flexShrink: 0 }}>Đã tải lên:</span>
                                        <a
                                            href={urlCV}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                color: '#166534',
                                                textDecoration: 'underline',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                maxWidth: 280,
                                                display: 'inline-block'
                                            }}
                                            title={`Xem trước: ${getDisplayFileName(urlCV)}`}
                                        >
                                            {getDisplayFileName(urlCV)}
                                        </a>
                                    </Tag>
                                </div>
                            )}
                        </Form.Item>
                    </Form>
                </ConfigProvider>
            )}
            <Divider style={{ margin: '16px 0 0 0', borderColor: '#f0f0f0' }} />
        </Modal>
    );
};

export default ApplyModal;
