import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/redux/hooks';
import { fetchAccount } from '@/redux/slice/accountSlide';
import { message, Spin } from 'antd';

const OAuth2RedirectHandler = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    useEffect(() => {
        const token = searchParams.get('access_token');
        const error = searchParams.get('error');

        if (token) {
            localStorage.setItem('access_token', token);
            dispatch(fetchAccount()).then(() => {
                message.success('Đăng nhập bằng Google thành công!');
                navigate('/');
            }).catch(() => {
                message.error('Lấy thông tin tài khoản thất bại.');
                navigate('/login');
            });
        } else if (error) {
            message.error(`Đăng nhập Google thất bại: ${error}`);
            navigate('/login');
        } else {
            navigate('/login');
        }
    }, [searchParams, dispatch, navigate]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: 16
        }}>
            <Spin size="large" />
            <p style={{ fontSize: 16, color: '#555' }}>Đang xác thực tài khoản Google...</p>
        </div>
    );
};

export default OAuth2RedirectHandler;
