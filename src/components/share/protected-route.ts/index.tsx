import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/redux/hooks";
import NotPermitted from "./not-permitted";
import Loading from "../loading";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isLoading, user } = useAppSelector(state => state.account);
    const { pathname } = useLocation();
    if (isLoading) return <Loading />;
    if (!isAuthenticated) return <Navigate to='/login' replace />;
    if (pathname.startsWith('/admin') && user.role?.name !== 'SUPER_ADMIN'
        && !user.role?.permissions?.length) return <NotPermitted />;
    return <>{children}</>;
};

export default ProtectedRoute;
