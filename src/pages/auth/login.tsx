import { Button, Divider, Form, Input, message, notification } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { callLogin, callForgotPassword, callVerifyOTP, callResetPassword } from 'config/api';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setUserLoginInfo } from '@/redux/slice/accountSlide';
import { Modal, Steps } from 'antd';
import styles from 'styles/auth.module.scss';
import { useAppSelector } from '@/redux/hooks';

const LoginPage = () => {
    const navigate = useNavigate();
    const [isSubmit, setIsSubmit] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0); // 0: Email, 1: OTP, 2: New Password
    const [forgotEmail, setForgotEmail] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isForgotSubmit, setIsForgotSubmit] = useState(false);
    const dispatch = useDispatch();
    const isAuthenticated = useAppSelector(state => state.account.isAuthenticated);

    let location = useLocation();
    let params = new URLSearchParams(location.search);
    const callback = params?.get("callback");

    useEffect(() => {
        //đã login => redirect to '/'
        if (isAuthenticated) {
            navigate('/');
        }
    }, [])

    const onFinish = async (values: any) => {
        const { username, password } = values;
        setIsSubmit(true);
        const res = await callLogin(username, password);
        setIsSubmit(false);

        if (res?.data) {
            localStorage.setItem('access_token', res.data.access_token);
            dispatch(setUserLoginInfo(res.data.user))
            message.success('Đăng nhập tài khoản thành công!');
            navigate(callback ? callback : '/');
        } else {
            notification.error({
                message: "Có lỗi xảy ra",
                description:
                    res.message && Array.isArray(res.message) ? res.message[0] : res.message,
                duration: 5
            })
        }
    };

    const handleSendOTP = async () => {
        if (!forgotEmail) {
            message.error("Vui lòng nhập email!");
            return;
        }
        setIsForgotSubmit(true);
        const res = await callForgotPassword(forgotEmail);
        setIsForgotSubmit(false);
        if (res.statusCode==200) {
            message.success("Mã OTP đã được gửi về email của bạn.");
            setCurrentStep(1);
        } else {
            notification.error({
                message: "Lỗi gửi OTP",
                description: res.message || "Không thể gửi OTP."
            });
        }
    }

    const handleVerifyOTP = async () => {
        if (!otpCode) {
            message.error("Vui lòng nhập mã OTP!");
            return;
        }
        setIsForgotSubmit(true);
        const res = await callVerifyOTP(forgotEmail, otpCode);
        setIsForgotSubmit(false);
        if (res.statusCode==200) {
            message.success("Mã OTP chính xác!");
            setCurrentStep(2);
        } else {
            notification.error({
                message: "Lỗi xác thực",
                description: res.message || "Mã OTP không đúng hoặc đã hết hạn."
            });
        }
    }

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            message.error("Vui lòng nhập đầy đủ thông tin mật khẩu!");
            return;
        }
        if (newPassword !== confirmPassword) {
            message.error("Mật khẩu xác nhận không khớp!");
            return;
        }
        setIsForgotSubmit(true);
        const res = await callResetPassword(forgotEmail, otpCode, newPassword);
        setIsForgotSubmit(false);
        if (res.statusCode==200
        
        ) {
            message.success("Đổi mật khẩu thành công! Hãy đăng nhập lại.");
            setIsModalVisible(false);
            resetForgotStates();
        } else {
            notification.error({
                message: "Lỗi đổi mật khẩu",
                description: res.message || "Không thể đổi mật khẩu mới."
            });
        }
    }

    const resetForgotStates = () => {
        setCurrentStep(0);
        setForgotEmail("");
        setOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
    }


    return (
        <div className={styles["login-page"]}>
            <main className={styles.main}>
                <div className={styles.container}>
                    <section className={styles.wrapper}>
                        <div className={styles.heading}>
                            <h2 className={`${styles.text} ${styles["text-large"]}`}>Đăng Nhập</h2>
                            <Divider />

                        </div>
                        <Form
                            name="basic"
                            // style={{ maxWidth: 600, margin: '0 auto' }}
                            onFinish={onFinish}
                            autoComplete="off"
                        >
                            <Form.Item
                                labelCol={{ span: 24 }} //whole column
                                label="Email"
                                name="username"
                                rules={[{ required: true, message: 'Email không được để trống!' }]}
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item
                                labelCol={{ span: 24 }} //whole column
                                label="Mật khẩu"
                                name="password"
                                rules={[{ required: true, message: 'Mật khẩu không được để trống!' }]}
                            >
                                <Input.Password />
                            </Form.Item>

                            <Form.Item
                            // wrapperCol={{ offset: 6, span: 16 }}
                            >
                                <Button type="primary" htmlType="submit" loading={isSubmit}>
                                    Đăng nhập
                                </Button>
                                <span style={{ float: 'right' }}>
                                    <a onClick={() => setIsModalVisible(true)}>Quên mật khẩu?</a>
                                </span>
                            </Form.Item>
                            <Divider>Or</Divider>
                            <p className="text text-normal">Chưa có tài khoản ?
                                <span>
                                    <Link to='/register' > Đăng Ký </Link>
                                </span>
                            </p>
                        </Form>
                    </section>
                </div>
            </main>

            <Modal
                title="Khôi phục mật khẩu"
                open={isModalVisible}
                onOk={
                    currentStep === 0 ? handleSendOTP :
                        currentStep === 1 ? handleVerifyOTP :
                            handleResetPassword
                }
                onCancel={() => {
                    setIsModalVisible(false);
                    resetForgotStates();
                }}
                confirmLoading={isForgotSubmit}
                okText={
                    currentStep === 0 ? "Gửi OTP" :
                        currentStep === 1 ? "Xác nhận OTP" :
                            "Đổi mật khẩu"
                }
                cancelText="Hủy"
                maskClosable={false}
            >
                <div style={{ marginTop: 20 }}>
                    <Steps
                        size="small"
                        current={currentStep}
                        items={[
                            { title: 'Email' },
                            { title: 'OTP' },
                            { title: 'Đổi mật khẩu' },
                        ]}
                    />

                    <div style={{ marginTop: 30 }}>
                        {currentStep === 0 && (
                            <>
                                <p>Nhập email để nhận mã xác thực (OTP):</p>
                                <Input
                                    placeholder="example@gmail.com"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                />
                            </>
                        )}

                        {currentStep === 1 && (
                            <>
                                <p>Nhập mã OTP đã được gửi về email <b>{forgotEmail}</b>:</p>
                                <Input
                                    placeholder="Nhập 6 số"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                />
                            </>
                        )}

                        {currentStep === 2 && (
                            <>
                                <p>Nhập mật khẩu mới cho tài khoản của bạn:</p>
                                <Input.Password
                                    placeholder="Mật khẩu mới"
                                    value={newPassword}
                                    style={{ marginBottom: 15 }}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <Input.Password
                                    placeholder="Xác nhận mật khẩu mới"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default LoginPage;