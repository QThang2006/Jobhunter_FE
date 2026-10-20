import { useAppSelector } from "@/redux/hooks";
import { IJob } from "@/types/backend";
import { ProForm, ProFormText, ProFormTextArea } from "@ant-design/pro-components";
import { Button, Checkbox, Col, ConfigProvider, Divider, Modal, Row, Upload, message, notification, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import viVN from 'antd/lib/locale/vi_VN';
import { UploadOutlined, PhoneOutlined, ClockCircleOutlined, CalendarOutlined, PictureOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { callCreateResume, callUploadSingleFile } from "@/config/api";
import { useState } from 'react';
import dayjs from 'dayjs';

interface IProps {
    isModalOpen: boolean;
    setIsModalOpen: (v: boolean) => void;
    jobDetail: IJob | null;
}

const SHIFT_OPTIONS = [
    { label: "Ca sáng (06:00 - 12:00)", value: "Ca sáng (06:00 - 12:00)" },
    { label: "Ca chiều (12:00 - 18:00)", value: "Ca chiều (12:00 - 18:00)" },
    { label: "Ca tối (18:00 - 22:30)", value: "Ca tối (18:00 - 22:30)" },
    { label: "Ca linh hoạt / Xoay ca", value: "Ca linh hoạt / Xoay ca" }
];

const DAY_OPTIONS = [
    { label: "Thứ 2", value: "T2" },
    { label: "Thứ 3", value: "T3" },
    { label: "Thứ 4", value: "T4" },
    { label: "Thứ 5", value: "T5" },
    { label: "Thứ 6", value: "T6" },
    { label: "Thứ 7", value: "T7" },
    { label: "Chủ Nhật", value: "CN" }
];

const ApplyModal = (props: IProps) => {
    const { isModalOpen, setIsModalOpen, jobDetail } = props;
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);
    const user = useAppSelector(state => state.account.user);
    const [urlCV, setUrlCV] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [note, setNote] = useState<string>("");
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

        if (!phone.trim()) {
            message.error("Vui lòng nhập số điện thoại hoặc Zalo liên hệ!");
            return;
        }

        if (selectedShifts.length === 0) {
            message.error("Vui lòng chọn ít nhất một ca làm việc bạn có thể nhận!");
            return;
        }

        setIsSubmitting(true);
        try {
            if (jobDetail) {
                // Đóng gói thông tin ca rảnh, sđt và ảnh/CV thành chuỗi payload JSON
                const resumePayload = {
                    file: urlCV || "",
                    phone: phone.trim(),
                    shifts: selectedShifts,
                    days: selectedDays,
                    note: note.trim()
                };

                const finalPayloadString = JSON.stringify(resumePayload);

                const res = await callCreateResume(finalPayloadString, jobDetail?.id, user.email, user.id);
                if (res.data) {
                    message.success("Nộp đơn ứng tuyển thành công! Tiệm bánh sẽ liên hệ bạn sớm nhất.");
                    setIsModalOpen(false);
                    // Reset form
                    setUrlCV("");
                    setSelectedShifts([]);
                    setSelectedDays([]);
                    setNote("");
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
        accept: "application/pdf,application/msword, .doc, .docx, image/*",
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
                <div style={{ color: '#873800', fontSize: '18px', fontWeight: 600 }}>
                    🥐 Ứng Tuyển Vị Trí: {jobDetail?.name}
                </div>
            }
            open={isModalOpen}
            onOk={() => handleOkButton()}
            onCancel={() => setIsModalOpen(false)}
            maskClosable={false}
            okText={isAuthenticated ? "Nộp Đơn Ứng Tuyển" : "Đăng Nhập Ngay"}
            confirmLoading={isSubmitting}
            destroyOnClose={true}
            width={650}
        >
            <Divider style={{ margin: '12px 0' }} />
            {isAuthenticated ? (
                <div>
                    <ConfigProvider locale={viVN}>
                        <div style={{
                            background: '#fffbe6',
                            border: '1px solid #ffe58f',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            marginBottom: '16px'
                        }}>
                            <div>Ứng tuyển tại: <strong style={{ color: '#873800' }}>{jobDetail?.company?.name}</strong></div>
                            <div>Địa điểm làm việc: <strong>{jobDetail?.location}</strong></div>
                        </div>

                        <Row gutter={[12, 14]}>
                            <Col span={12}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                                    Email liên hệ:
                                </label>
                                <input
                                    type="text"
                                    value={user?.email || ''}
                                    disabled
                                    style={{
                                        width: '100%',
                                        padding: '7px 11px',
                                        background: '#f5f5f5',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '6px'
                                    }}
                                />
                            </Col>

                            <Col span={12}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                                    <span style={{ color: '#ff4d4f' }}>* </span>
                                    <PhoneOutlined /> Số điện thoại / Zalo:
                                </label>
                                <input
                                    type="text"
                                    placeholder="VD: 0905123456"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '7px 11px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '6px'
                                    }}
                                />
                            </Col>

                            <Col span={24}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                                    <span style={{ color: '#ff4d4f' }}>* </span>
                                    <ClockCircleOutlined /> Ca làm việc bạn có thể nhận:
                                </label>
                                <Checkbox.Group
                                    options={SHIFT_OPTIONS}
                                    value={selectedShifts}
                                    onChange={(checked) => setSelectedShifts(checked as string[])}
                                />
                            </Col>

                            <Col span={24}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                                    <CalendarOutlined /> Các ngày trong tuần bạn có thể đi làm:
                                </label>
                                <Checkbox.Group
                                    options={DAY_OPTIONS}
                                    value={selectedDays}
                                    onChange={(checked) => setSelectedDays(checked as string[])}
                                />
                            </Col>

                            <Col span={24}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                                    <PictureOutlined /> Đính kèm CV hoặc Ảnh sản phẩm bánh tự làm (nếu có):
                                </label>
                                <Upload {...propsUpload}>
                                    <Button icon={<UploadOutlined />}>
                                        Tải lên file (*.pdf, *.docx, ảnh *.png, *.jpg &lt; 10MB)
                                    </Button>
                                </Upload>
                                {urlCV && (
                                    <div style={{ marginTop: '6px' }}>
                                        <Tag color="success">Đã tải lên: {urlCV}</Tag>
                                    </div>
                                )}
                            </Col>

                            <Col span={24}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                                    Ghi chú thêm (Kinh nghiệm, thời gian có thể bắt đầu đi làm...):
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="VD: Em từng có 6 tháng làm phụ bếp bánh mì, có thể bắt đầu đi làm ngay..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '7px 11px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '6px',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </Col>
                        </Row>
                    </ConfigProvider>
                </div>
            ) : (
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <p style={{ fontSize: '15px', color: '#666' }}>
                        Bạn cần đăng nhập tài khoản Ứng viên để có thể nộp đơn xin việc tại tiệm bánh.
                    </p>
                </div>
            )}
            <Divider style={{ margin: '14px 0 6px 0' }} />
        </Modal>
    );
};

export default ApplyModal;
