module.exports = {
  apps: [{
    name: 'xspace-backend',
    script: 'src/app.js',
    cwd: '/var/www/xspace/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      CORS_ORIGIN: 'http://8.215.34.35'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      CORS_ORIGIN: 'http://8.215.34.35'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}; 