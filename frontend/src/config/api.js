// API Configuration
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000,
  maxRetries: parseInt(process.env.REACT_APP_API_MAX_RETRIES) || 3,
  endpoints: {
    generateSummary: '/api/generate-summary',
    transcribe: '/api/transcribe',
    suggestActions: '/api/suggestions',
    suggestSummary: '/api/suggestions/summary'
  }
};

// Feature Flags
const FEATURE_FLAGS = {
  enableAudioTranscription: process.env.REACT_APP_ENABLE_AUDIO_TRANSCRIPTION === 'true',
  enablePdfExport: process.env.REACT_APP_ENABLE_PDF_EXPORT === 'true',
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true'
};

// File Upload Configuration
const UPLOAD_CONFIG = {
  maxFileSize: parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 10485760, // 10MB
  supportedFormats: (process.env.REACT_APP_SUPPORTED_AUDIO_FORMATS || 'mp3,wav,m4a').split(','),
  maxFiles: parseInt(process.env.REACT_APP_MAX_FILES) || 1
};

export { API_CONFIG, FEATURE_FLAGS, UPLOAD_CONFIG }; 