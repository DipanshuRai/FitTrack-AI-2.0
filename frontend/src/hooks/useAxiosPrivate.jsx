// Goal:
// 1. Automatically include the user's access token in every API request.
// 2. Detect when the access token has expired (401 error).
// 3. Automatically get a new access token using the refresh token.
// 4. Retry the original request with the new access token.

import { axiosPrivate } from "../api/axios";
import { useEffect } from "react";
import useRefreshToken from "./useRefreshToken";
import useAuth from "./useAuth";

const useAxiosPrivate = () => {
    const refresh = useRefreshToken();
    const { auth } = useAuth();

    useEffect(() => {
        // Add Token to Every Request
        const requestIntercept = axiosPrivate.interceptors.request.use(
            config => {
                if (!config.headers['Authorization']) {
                    config.headers['Authorization'] = `Bearer ${auth?.accessToken}`;
                }
                return config;
            }, (error) => Promise.reject(error)
        );

        // Response interceptor to handle token expiration
        const responseIntercept = axiosPrivate.interceptors.response.use(
            response => response,
            async (error) => {
                const prevRequest = error?.config;
                
                if (error?.response?.status === 401 && !prevRequest?.sent) {
                    prevRequest.sent = true; // Mark as retried
                    try {
                        const newAccessToken = await refresh(); // Get a new token
                        console.log(newAccessToken);
                        
                        prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                        return axiosPrivate(prevRequest); // Retry the original request
                    } catch (refreshError) {
                        // If refresh fails, reject the promise
                        return Promise.reject(refreshError);
                    }
                }
                return Promise.reject(error);
            }
        );

        // Cleanup function to eject interceptors when the component unmounts
        return () => {
            axiosPrivate.interceptors.request.eject(requestIntercept);
            axiosPrivate.interceptors.response.eject(responseIntercept);
        }
    }, [auth, refresh])

    return axiosPrivate;
}

export default useAxiosPrivate;