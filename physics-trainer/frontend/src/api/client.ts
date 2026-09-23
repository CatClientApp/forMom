import axios from 'axios';
import { getUserStore } from '../store/userStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем X-User-Id к каждому запросу
apiClient.interceptors.request.use((config) => {
  const userId = getUserStore().currentUserId;
  if (userId) {
    config.headers['X-User-Id'] = userId.toString();
  }
  return config;
});

// Обработка 401 - пользователь не найден
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Можно очистить стейт или показать уведомление
      console.warn('User not found, please select a user');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
