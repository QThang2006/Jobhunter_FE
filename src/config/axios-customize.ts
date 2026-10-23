import { IBackendRes } from "@/types/backend";
import { Mutex } from "async-mutex";
import axiosClient from "axios";
import { store } from "@/redux/store";
import { setRefreshTokenAction, setLogoutAction } from "@/redux/slice/accountSlide";
import { notification } from "antd";
interface AccessTokenResponse {
    access_token: string;
}

/**
 * Creates an initial 'axios' instance with custom settings.
 */

const instance = axiosClient.create({
    baseURL: import.meta.env.VITE_BACKEND_URL as string,
    withCredentials: true
});

const mutex = new Mutex();
const NO_RETRY_HEADER = 'x-no-retry';

const handleRefreshToken = async (failedAuthorization?: string): Promise<string | null> => {
    return mutex.runExclusive(async () => {
        const currentToken = localStorage.getItem('access_token');
        if (currentToken && failedAuthorization !== `Bearer ${currentToken}`) return currentToken;
        try {
            const res = await instance.get<IBackendRes<AccessTokenResponse>>('/api/v1/auth/refresh', {
                headers: { [NO_RETRY_HEADER]: 'true' }
            });
            const token = res.data?.access_token ?? null;
            if (token) localStorage.setItem('access_token', token);
            return token;
        } catch {
            return null;
        }
    });
};

instance.interceptors.request.use(function (config) {
    if (config.url !== '/api/v1/auth/refresh' && typeof window !== "undefined" && window.localStorage.getItem('access_token')) {
        config.headers.Authorization = 'Bearer ' + window.localStorage.getItem('access_token');
    }

    if (!(config.data instanceof FormData)) {
        config.headers["Content-Type"] = "application/json; charset=utf-8";
    } else {
        // QUAN TRỌNG: Xóa Content-Type để trình duyệt tự thêm 'boundary' cho file
        delete config.headers["Content-Type"];
    }
    return config;
});
/**
 * Handle all responses. It is possible to add handlers
 * for requests, but it is omitted here for brevity.
 */
instance.interceptors.response.use(
    (res) => res.status === 204 ? { statusCode: 204, message: "", data: null } : res.data,
    async (error) => {
        if (error.config && error.response
            && +error.response.status === 401
            && error.config.url !== '/api/v1/auth/login'
            && error.config.url !== '/api/v1/auth/refresh'
            && !error.config.headers[NO_RETRY_HEADER]
        ) {
            const access_token = await handleRefreshToken(error.config.headers?.Authorization);
            error.config.headers[NO_RETRY_HEADER] = 'true'
            if (access_token) {
                error.config.headers['Authorization'] = `Bearer ${access_token}`;
                localStorage.setItem('access_token', access_token)
                return instance.request(error.config);
            } else {
                // Refresh thất bại, gọi logout
                store.dispatch(setLogoutAction({}));
            }
        }

        if (
            error.config && error.response
            && +error.response.status === 400
            && error.config.url === '/api/v1/auth/refresh'
            && location.pathname.startsWith("/admin")
        ) {
            const message = error?.response?.data?.error ?? "Có lỗi xảy ra, vui lòng login.";
            //dispatch redux action
            store.dispatch(setRefreshTokenAction({ status: true, message }));
        }

        if (+error.response?.status === 403) {
            notification.error({
                message: error?.response?.data?.message ?? "",
                description: error?.response?.data?.error ?? ""
            })
        }

        return error?.response?.data ?? Promise.reject(error);
    }
);

/**
 * Replaces main `axios` instance with the custom-one.
 *
 * @param cfg - Axios configuration object.
 * @returns A promise object of a response of the HTTP request with the 'data' object already
 * destructured.
 */
// const axios = <T>(cfg: AxiosRequestConfig) => instance.request<any, T>(cfg);

// export default axios;

export default instance;