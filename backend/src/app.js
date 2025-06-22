const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // 允许跨域资源访问
}));

// 🆕 更详细的 CORS 配置
app.use(cors({
  origin: [
    'http://localhost:5173', // Vite 开发服务器
    'http://localhost:3000', // 本地后端
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    process.env.CORS_ORIGIN
  ].filter(Boolean), // 过滤掉 undefined 值
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 🆕 静态文件服务 - 提供上传的图片访问，添加 CORS 头
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// 统一导入路由
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // 处理文件上传错误
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制(5MB)' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: '文件数量超过限制(10张)' });
    }
  }
  
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📊 环境模式: ${process.env.NODE_ENV}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/api/health`);
});

module.exports = app; 