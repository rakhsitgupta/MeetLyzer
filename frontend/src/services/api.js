import axios from 'axios';
import { API_CONFIG } from '../config/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add retry logic
api.interceptors.response.use(null, async (error) => {
  const { config } = error;
  if (!config || !config.retry) {
    return Promise.reject(error);
  }
  
  config.retryCount = config.retryCount || 0;
  
  if (config.retryCount >= API_CONFIG.maxRetries) {
    return Promise.reject(error);
  }
  
  config.retryCount += 1;
  return api(config);
});

// API methods
export const generateSummary = async (meetingData) => {
  try {
    const response = await api.post(API_CONFIG.endpoints.generateSummary, meetingData);
    return response.data;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};

export const transcribeAudio = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(API_CONFIG.endpoints.transcribe, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

export const suggestActions = async (text) => {
  try {
    const response = await api.post(API_CONFIG.endpoints.suggestActions, { text });
    return response.data;
  } catch (error) {
    console.error('Error suggesting actions:', error);
    throw error;
  }
};

export default api; 