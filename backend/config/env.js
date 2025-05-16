const { cleanEnv, str, port } = require('envalid');

const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
    PORT: port({ default: 5000 }),
    CO_API_KEY: str(),
    ASSEMBLY_API_KEY: str(),
    CORS_ORIGIN: str({ default: 'http://localhost:3000' }),
    RATE_LIMIT_WINDOW_MS: str({ default: '900000' }), // 15 minutes
    RATE_LIMIT_MAX: str({ default: '100' }), // 100 requests per window
  });
};

module.exports = validateEnv; 