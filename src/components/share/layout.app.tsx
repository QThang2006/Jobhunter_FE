import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setRefreshTokenAction } from "@/redux/slice/accountSlide";
import { message } from "antd";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "@/context/websocket.context";
import { fetchAccount } from "@/redux/slice/accountSlide";

interface IProps {
    children: React.ReactNode
}

const LayoutApp = (props: IProps) => {
    const isRefreshToken = useAppSelector(state => state.account.isRefreshToken);
    const errorRefreshToken = useAppSelector(state => state.account.errorRefreshToken);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    //handle refresh token error
    useEffect(() => {
        if (isRefreshToken === true) {
            localStorage.removeItem('access_token')
            message.error(errorRefreshToken);
            dispatch(setRefreshTokenAction({ status: false, message: "" }))
            navigate('/login');
        }
    }, [isRefreshToken]);

    // -- WebSocket Listener for User Roles / Permissions --
    const { stompClient } = useWebSocket();
    const user = useAppSelector(state => state.account.user);

    useEffect(() => {
        if (stompClient && stompClient.connected) {
            const onReceive = (msg: any) => {
                if (msg.body) {
                    dispatch(fetchAccount()); // Reload user info & permissions completely
                }
            }
            const subRoles = stompClient.subscribe('/topic/roles', onReceive);
            const subPermissions = stompClient.subscribe('/topic/permissions', onReceive);
            let subUser: any = null;
            if (user?.id) {
                subUser = stompClient.subscribe(`/topic/users/${user.id}`, onReceive);
            }

            return () => {
                subRoles.unsubscribe();
                subPermissions.unsubscribe();
                if (subUser) subUser.unsubscribe();
            }
        }
    }, [stompClient, user?.id, dispatch]);
    // ----------------------------------------------

    return (
        <>
            {props.children}
        </>
    )
}

export default LayoutApp;