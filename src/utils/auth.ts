import axios from 'axios';
import router from '../router';  // 假设你使用 Vue Router

// 移除这行,因为 Vite 已经处理了代理
// axios.defaults.baseURL = 'http://localhost:3000';  // 替换为你的 API 地址

// 添加请求拦截器
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 添加响应拦截器
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Token 无效或过期
      localStorage.removeItem('token');
      router.push('/login');
    }
    return Promise.reject(error);
  }
);

export const login = async (username: string, password: string) => {
  try {
    const response = await axios.post('/api/login', { username, password });
    const { token } = response.data;
    localStorage.setItem('token', token);
    return true;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  router.push('/login');
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
