import axios from "../api/axios";
import useAuth from "./useAuth";
import { useNavigate } from "react-router-dom";
import useAxiosPrivate from "./useAxiosPrivate";

const useLogout = () => {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();

  const logout = async () => {
    try {
      const LOGOUT_URL = "/api/auth/logout";
      // The server should clear the httpOnly refresh token cookie   
      await axiosPrivate.post(LOGOUT_URL, {}, { withCredentials: true });      
    } catch (err) {
      console.error("Server logout failed:", err);
    } finally {
      setAuth({
        accessToken: null,
        user: null,
      });
      navigate("/");
    }
  };

  return logout;
};

export default useLogout;
