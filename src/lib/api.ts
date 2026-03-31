export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, options);
  return response;
};
