import axios from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import { storage } from '@/utils/storage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const cookie = storage.get<string>('cookie');
    if (cookie) {
      config.params = { ...config.params, cookie };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data.code === 301) {
      // 未登录
      console.warn('需要登录');
    }
    return data;
  },
  (error) => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export default api;
