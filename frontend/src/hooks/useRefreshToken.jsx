import axios from '../api/axios.jsx';
import useAuth from './useAuth';

const useRefreshToken = () => {
    const { setAuth } = useAuth();
    
    const REFRESH_TOKEN_URL = "/api/auth/refresh-token"; 

    const refresh = async () => {
        const response = await axios.post(
            REFRESH_TOKEN_URL,
            {},
            { withCredentials: true }
        );
        
        setAuth(prev => {
            return {
                ...prev,
                user: response.data.user,
                accessToken: response.data.accessToken
            };
        });
        
        return response.data.accessToken;
    };
    return refresh;
};

export default useRefreshToken;