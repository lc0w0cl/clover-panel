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

export async function login(username: string, password: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await axios.post('/api/login', { username, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      return { success: true, message: '登录成功' };
    } else {
      return { success: false, message: response.data.message || '登录失败' };
    }
  } catch (error) {
    console.error('Login error:', error);
    if (axios.isAxiosError(error) && error.response) {
      return { success: false, message: error.response.data.message || '登录失败' };
    }
    return { success: false, message: '网络错误，请稍后重试' };
  }
}

export function logout() {
  localStorage.removeItem('token');
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}
