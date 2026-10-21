import { useState } from 'react';
import { Modal, Button, Input, Space, Tag, QRCode, Typography, message, Divider, Alert, Tooltip } from 'antd';
import {
    CopyOutlined,
    DownloadOutlined,
    ExportOutlined,
    QrcodeOutlined,
    ShareAltOutlined,
    ShopOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import { IJob } from '@/types/backend';
import { convertSlug } from '@/config/utils';
import dayjs from 'dayjs';

const { Text, Paragraph } = Typography;

interface IProps {
    open: boolean;
    onClose: () => void;
    job: IJob | null;
}

const ShareJobModal = (props: IProps) => {
    const { open, onClose, job } = props;
    const [copied, setCopied] = useState<boolean>(false);

    if (!job) return null;

    // Sinh đường link rải chính xác kèm slug và id của job
    const slug = convertSlug(job.name || 'viec-lam');
    const shareUrl = `${window.location.origin}/job/${slug}?id=${job.id}&apply=true`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        message.success('Đã sao chép đường link rải thành công!');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleDownloadQR = () => {
        const canvas = document.getElementById('job-qr-code')?.querySelector<HTMLCanvasElement>('canvas');
        if (canvas) {
            const url = canvas.toDataURL();
            const a = document.createElement('a');
            a.download = `QR-BakeJobs-${job.id}-${slug}.png`;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            message.success('Đã tải mã QR Code thành công');
        }
    };

    const handleOpenPreview = () => {
        window.open(shareUrl, '_blank');
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    Đóng
                </Button>,
                <Button
                    key="preview"
                    icon={<ExportOutlined />}
                    onClick={handleOpenPreview}
                >
                    Mở thử trang tuyển dụng
                </Button>,
                <Button
                    key="copy"
                    type="primary"
                    icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                    onClick={handleCopy}
                    style={{ background: copied ? '#52c41a' : undefined }}
                >
                    {copied ? 'Đã sao chép!' : 'Sao chép link rải'}
                </Button>
            ]}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
                    <ShareAltOutlined style={{ color: '#1677ff' }} />
                    <span>Sinh Link Rải Tuyển Dụng</span>
                </div>
            }
            width={620}
        >
            <div style={{ marginTop: 12 }}>
                {/* Thông tin Job tóm tắt */}
                <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 16
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                            {job.name}
                        </Text>
                        <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
                            Mã Job: #{job.id}
                        </Tag>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#64748b' }}>
                        {job.company?.name && (
                            <span>
                                <ShopOutlined style={{ marginRight: 4 }} />
                                Tiệm bánh: <strong style={{ color: '#334155' }}>{job.company.name}</strong>
                            </span>
                        )}
                        {job.salary && (
                            <span>
                                Lương: <strong style={{ color: '#059669' }}>{(job.salary + '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')} đ</strong>
                            </span>
                        )}
                        {job.endDate && (
                            <span>
                                Hạn nộp: <strong style={{ color: '#d97706' }}>{dayjs(job.endDate).format('DD/MM/YYYY')}</strong>
                            </span>
                        )}
                    </div>
                </div>

                {/* Ô link rải */}
                <div style={{ marginBottom: 20 }}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>
                        🔗 Đường link ứng tuyển trực tiếp (Dành cho HR đem đi rải):
                    </Text>
                    <Input.Group compact style={{ display: 'flex' }}>
                        <Input
                            value={shareUrl}
                            readOnly
                            style={{
                                flex: 1,
                                background: '#ffffff',
                                color: '#1e293b',
                                fontWeight: 500,
                                cursor: 'text'
                            }}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <Button
                            type="primary"
                            icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                            onClick={handleCopy}
                            style={{ background: copied ? '#52c41a' : undefined }}
                        >
                            {copied ? 'Đã chép' : 'Sao chép'}
                        </Button>
                    </Input.Group>
                </div>

                {/* Mã QR Code để rải offline / dán tại quầy */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 16
                }}>
                    <div id="job-qr-code" style={{ flexShrink: 0 }}>
                        <QRCode
                            value={shareUrl}
                            size={130}
                            bordered={false}
                        />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
                            <QrcodeOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                            Mã QR Tuyển Dụng
                        </Text>
                        <Paragraph style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                            Quét mã bằng camera điện thoại để mở ngay form ứng tuyển. Bạn có thể tải mã này về để in poster, standee hoặc dán tại quầy tiệm bánh.
                        </Paragraph>
                        <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={handleDownloadQR}
                        >
                            Tải ảnh QR Code
                        </Button>
                    </div>
                </div>

                {/* Hướng dẫn nghiệp vụ */}
                <Alert
                    type="info"
                    showIcon
                    message="Quy trình Ứng tuyển Nhanh:"
                    description="Ứng viên mở link rải này KHÔNG CẦN có tài khoản trước. Họ chỉ cần điền Họ tên, SĐT, Email và đính kèm CV. Hệ thống sẽ tự động tạo tài khoản ngầm, nộp hồ sơ vào tiệm bánh và gửi email xác nhận kèm mật khẩu đăng nhập cho ứng viên."
                    style={{ fontSize: 13 }}
                />
            </div>
        </Modal>
    );
};

export default ShareJobModal;
