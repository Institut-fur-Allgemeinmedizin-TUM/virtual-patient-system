import { API_BASE_URL, getAccessToken } from '../lib/auth';
import { Api } from '../services/api';

export const apiClient = new Api({
  baseURL: API_BASE_URL,
  withCredentials: true,
  secure: true,
  securityWorker: async () => {
    const token = await getAccessToken();
    if (!token) return {};
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  },
});
