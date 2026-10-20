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
    };

    return (
        <Modal
            title={
                <div style={{ color: '#4a2c11', fontSize: '17px', fontWeight: 700 }}>
                    🥐 Ứng Tuyển Vị Trí: {jobDetail?.name}
                </div>
            }
            open={isModalOpen}
            onOk={() => handleOkButton()}
            onCancel={() => setIsModalOpen(false)}
            maskClosable={false}
            okText={isAuthenticated ? "Nộp Đơn Ứng Tuyển" : "Đăng Nhập Ngay"}
            cancelText="Hủy"
            okButtonProps={{
                style: {
                    background: '#d46b08',
                    borderColor: '#d46b08',
                    fontWeight: 600,
                    borderRadius: 6
                }
            }}
            confirmLoading={isSubmitting}
            destroyOnClose={true}
            width={560}
        >
            <Divider style={{ margin: '12px 0 16px 0' }} />
            {isAuthenticated ? (
                <ConfigProvider locale={viVN}>
                    {/* Thông tin tiệm bánh & vị trí */}
                    <div style={{
                        background: '#fffaf5',
                        border: '1px solid #ebd9c8',
                        borderRadius: '8px',
                        padding: '14px 16px',
                        marginBottom: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}>
                        <div style={{ fontSize: '14px', color: '#4a2c11' }}>
                            <ShopOutlined style={{ color: '#d46b08', marginRight: 6 }} />
                            Ứng tuyển tại: <strong style={{ color: '#d46b08' }}>{jobDetail?.company?.name || 'Tiệm Bánh'}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#7a6b61' }}>
                            <EnvironmentOutlined style={{ color: '#d46b08', marginRight: 6 }} />
                            Địa điểm làm việc: <strong>{jobDetail?.location || 'Chưa cập nhật'}</strong>
                        </div>
                    </div>

                    <Form layout="vertical">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="Tên Ứng Viên" style={{ marginBottom: 16 }}>
                                    <Input
                                        value={user?.name || ''}
                                        disabled
                                        style={{
                                            background: '#f9f6f0',
                                            color: '#4a2c11',
                                            borderRadius: 6
                                        }}
                                    />
                                </Form.Item>
                            </Col>

                            <Col span={12}>
                                <Form.Item label="Email Liên Hệ" style={{ marginBottom: 16 }}>
                                    <Input
                                        value={user?.email || ''}
                                        disabled
                                        style={{
                                            background: '#f9f6f0',
                                            color: '#4a2c11',
                                            borderRadius: 6
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            label={
                                <span>
                                    <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>
                                    File CV Ứng Tuyển:
                                </span>
                            }
                            required
                            style={{ marginBottom: 16 }}
                            extra="Định dạng hỗ trợ: .pdf, .doc, .docx (Dung lượng < 10MB)"
                        >
                            <Upload {...propsUpload}>
                                <Button
                                    icon={<UploadOutlined />}
                                    style={{
                                        borderColor: '#d46b08',
                                        color: '#d46b08',
                                        borderRadius: 6
                                    }}
                                >
                                    Tải Lên File CV
                                </Button>
                            </Upload>

                            {urlCV && (
                                <div style={{ marginTop: '10px' }}>
                                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '4px 10px', fontSize: 13 }}>
                                        File đã chọn: {urlCV}
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
                        description="Bạn cần đăng nhập tài khoản để có thể nộp hồ sơ ứng tuyển vào tiệm bánh này."
                        type="info"
                        showIcon
                    />
                </div>
            )}
            <Divider style={{ margin: '16px 0 0 0' }} />
        </Modal>
    );
};

export default ApplyModal;
