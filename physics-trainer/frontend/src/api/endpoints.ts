import apiClient from './client';
import type { User, Topic, Article, Task, Test, Attempt, StatsSummary } from '../types';

/**
 * Список пользователей. Отдельный клиент без X-User-Id —
 * чтобы гость (без выбранного пользователя) мог открыть приложение и выбрать себя.
 */
export const getUsers = async (): Promise<User[]> => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const res = await fetch(`${base}/api/users`);
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
};

// USERS
export const usersApi = {
  getAll: () => apiClient.get<User[]>('/api/users'),
  create: (data: { name: string; role: 'teacher' | 'student'; color: string }) =>
    apiClient.post<User>('/api/users', data),
  update: (id: number, data: Partial<{ name: string; role: string; color: string }>) =>
    apiClient.patch<User>(`/api/users/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/users/${id}`),
};

// TOPICS
export const topicsApi = {
  getAll: () => apiClient.get<Topic[]>('/api/topics'),
  create: (data: { name: string; parent_id?: number; order_index?: number }) =>
    apiClient.post<Topic>('/api/topics', data),
  update: (id: number, data: Partial<{ name: string; order_index: number }>) =>
    apiClient.patch<Topic>(`/api/topics/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/topics/${id}`),
};

// ARTICLES
export const articlesApi = {
  getAll: (topicId?: number) =>
    apiClient.get<Article[]>('/api/articles', { params: { topic_id: topicId } }),
  getById: (id: number) => apiClient.get<Article>(`/api/articles/${id}`),
  create: (data: { title: string; content_md: string; topic_id?: number }) =>
    apiClient.post<Article>('/api/articles', data),
  update: (id: number, data: Partial<{ title: string; content_md: string; topic_id?: number }>) =>
    apiClient.patch<Article>(`/api/articles/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/articles/${id}`),
};

// TASKS
export const tasksApi = {
  getAll: (params?: { topic_id?: number; difficulty?: string; search?: string; limit?: number; offset?: number }) =>
    apiClient.get<Task[]>('/api/tasks', { params }),
  getById: (id: number) => apiClient.get<Task>(`/api/tasks/${id}`),
  create: (data: any) => apiClient.post<Task>('/api/tasks', data),
  update: (id: number, data: any) => apiClient.patch<Task>(`/api/tasks/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/tasks/${id}`),
  addImage: (taskId: number, url: string, orderIndex: number) =>
    apiClient.post(`/api/tasks/${taskId}/images`, null, { params: { url, order_index: orderIndex } }),
  deleteImage: (taskId: number, imageId: number) =>
    apiClient.delete(`/api/tasks/${taskId}/images/${imageId}`),
  attachArticle: (taskId: number, articleId: number) =>
    apiClient.post(`/api/tasks/${taskId}/articles`, null, { params: { article_id: articleId } }),
  detachArticle: (taskId: number, articleId: number) =>
    apiClient.delete(`/api/tasks/${taskId}/articles/${articleId}`),
  createHint: (taskId: number, data: { tier: number; cost: number; content: string }) =>
    apiClient.post(`/api/tasks/${taskId}/hints`, data),
  deleteHint: (hintId: number) => apiClient.delete(`/api/tasks/hints/${hintId}`),
};

// UPLOADS
export const uploadsApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{ url: string }>('/api/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// TESTS
export const testsApi = {
  getAll: () => apiClient.get<Test[]>('/api/tests'),
  getById: (id: number) => apiClient.get<Test>(`/api/tests/${id}`),
  create: (data: { title: string; description?: string; topic_id?: number; time_limit_sec?: number }) =>
    apiClient.post<Test>('/api/tests', data),
  update: (id: number, data: any) => apiClient.patch<Test>(`/api/tests/${id}`, data),
  delete: (id: number) => apiClient.delete(`/api/tests/${id}`),
  addTask: (testId: number, taskId: number, orderIndex: number) =>
    apiClient.post(`/api/tests/${testId}/tasks`, { task_id: taskId, order_index: orderIndex }),
  removeTask: (testId: number, taskId: number) =>
    apiClient.delete(`/api/tests/${testId}/tasks/${taskId}`),
};

// ATTEMPTS
export const attemptsApi = {
  startPractice: (taskId: number) => apiClient.post<{ attempt_id: number }>('/api/attempts/practice', { task_id: taskId }),
  answerPractice: (attemptId: number, data: { task_id: number; chosen_option_id?: number; given_text?: string; hints_used?: number[] }) =>
    apiClient.post('/api/attempts/practice/{attemptId}/answer'.replace('{attemptId}', attemptId.toString()), data),
  getMyAttempts: (mode?: string, limit?: number) =>
    apiClient.get<Attempt[]>('/api/attempts/my', { params: { mode, limit } }),
};

// STATS
export const statsApi = {
  getMySummary: () => apiClient.get<StatsSummary>('/api/stats/me/summary'),
  getMyTopics: () => apiClient.get<{ topic_id: number; solved: number }[]>('/api/stats/me/topics'),
  getMyErrors: (limit?: number) => apiClient.get<{ task_id: number; task_title: string; answered_at: string }[]>('/api/stats/me/errors', { params: { limit } }),
  getStudents: () => apiClient.get<{ user_id: number; name: string; total_attempts: number; total_points: number }[]>('/api/stats/students'),
  getStudentTopics: (userId: number) =>
    apiClient.get<{ topic_id: number; solved: number }[]>(`/api/stats/students/${userId}/topics`),
};
