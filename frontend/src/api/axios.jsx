import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
// const BASE_URL = 'http://192.168.0.113:5000';

// Public Axios instance (for login, register, refresh-token)
export default axios.create({
  baseURL: BASE_URL,
});

// Private Axios instance (for requests that need authentication)
export const axiosPrivate = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
