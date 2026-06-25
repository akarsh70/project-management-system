import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { store } from '../store';
import { updateAccessToken, logout } from '../store/slices/authSlice';
import { clearOrganizations } from '../store/slices/organizationSlice';

const API_BASE = '/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach token and org header
apiClient.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.accessToken;
    const orgId = state.organization.currentOrg?.id;

    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (orgId) config.headers['x-organization-id'] = orgId;

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401 + token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken } = store.getState().auth;

      if (!refreshToken) {
        store.dispatch(logout());
        store.dispatch(clearOrganizations());
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const { accessToken } = response.data.data || response.data;

        store.dispatch(updateAccessToken(accessToken));
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        store.dispatch(logout());
        store.dispatch(clearOrganizations());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
