import { useAppSelector } from "@/redux/hooks";
import { IJob } from "@/types/backend";
import { Button, Col, ConfigProvider, Divider, Form, Input, Modal, Row, Upload, message, notification, Tag, Alert } from "antd";
import { useNavigate } from "react-router-dom";
import viVN from 'antd/lib/locale/vi_VN';
import { UploadOutlined, CheckCircleOutlined, ShopOutlined, EnvironmentOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { callCreateResume, callUploadSingleFile } from "@/config/api";
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
    const [urlCV, setUrlCV] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const getDisplayFileName = (url: string) => {
        if (!url) return '';
        try {
            const rawName = decodeURIComponent(url.split('/').pop() || '');
            return rawName.replace(/^[0-9a-fA-F-]{36}-/, '') || rawName;
        } catch {
            return url.split('/').pop() || url;
        }
    };

    const navigate = useNavigate();

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

        if (!isAuthenticated) {
            setIsModalOpen(false);
            navigate(`/login?callback=${window.location.href}`);
            return;
        }

        if (!urlCV) {
            message.error("Vui lòng tải lên file CV của bạn trước khi nộp đơn!");
            return;
        }

        setIsSubmitting(true);
        try {
            if (jobDetail) {
                const res = await callCreateResume(urlCV, jobDetail?.id, user.email, user.id);
                if (res.data) {
                    message.success("Nộp đơn ứng tuyển thành công! Tiệm bánh sẽ liên hệ bạn sớm nhất.");
                    setIsModalOpen(false);
                    setUrlCV("");
                } else {
                    notification.error({
                        message: 'Có lỗi xảy ra',
                        description: res.message
                    });
                }
            }
        } catch (error: any) {
            notification.error({
                message: 'Lỗi nộp hồ sơ',
                description: error?.message || 'Vui lòng thử lại sau.'
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
                    Ứng Tuyển Vị Trí: {jobDetail?.name}
                </div>
            }
            open={isModalOpen}
            onOk={() => handleOkButton()}
            onCancel={() => {
                setIsModalOpen(false);
                setUrlCV("");
            }}
            maskClosable={false}
            okText={isAuthenticated ? "Nộp Đơn Ứng Tuyển" : "Đăng Nhập Ngay"}
            cancelText="Hủy"
            okButtonProps={{
                style: {
                    borderRadius: 6,
                    fontWeight: 500
                }
            }}
            confirmLoading={isSubmitting}
            destroyOnClose={true}
            width={540}
            styles={{
                body: { overflowX: 'hidden' }
            }}
        >
            <Divider style={{ margin: '12px 0 16px 0', borderColor: '#f0f0f0' }} />
            {isAuthenticated ? (
                <ConfigProvider locale={viVN}>
                    {/* Thẻ tóm tắt thông tin: trắng xám nhạt tinh tế */}
                    <div style={{
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '20px',
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

                    <Form layout="vertical">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label={<span style={{ fontWeight: 500, color: '#374151' }}>Tên Ứng Viên</span>}
                                    style={{ marginBottom: 16 }}
                                >
                                    <Input
                                        value={user?.name || ''}
                                        disabled
                                        style={{
                                            background: '#f3f4f6',
                                            color: '#374151',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: 6
                                        }}
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
                                        style={{
                                            background: '#f3f4f6',
                                            color: '#374151',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: 6
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            label={<span style={{ fontWeight: 500, color: '#374151' }}>File CV Ứng Tuyển:</span>}
                            required
                            style={{ marginBottom: 16 }}
                            extra={<span style={{ color: '#6b7280', fontSize: 12 }}>Định dạng hỗ trợ: .pdf, .doc, .docx (Dung lượng &lt; 10MB)</span>}
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
            ) : (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                    <Alert
                        message="Yêu cầu đăng nhập"
                        description="Bạn cần đăng nhập tài khoản để có thể nộp hồ sơ ứng tuyển vào vị trí này."
                        type="info"
                        showIcon
                    />
                </div>
            )}
            <Divider style={{ margin: '16px 0 0 0', borderColor: '#f0f0f0' }} />
        </Modal>
    );
};

export default ApplyModal;
