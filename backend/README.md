backend/src/
├── routes/          # 路由层 - 只负责路由定义和基础验证
├── controllers/     # 控制器层 - 处理HTTP请求/响应
├── services/        # 业务逻辑层 - 核心业务逻辑
├── models/          # 数据模型层 - 数据库操作
├── middleware/      # 中间件
├── utils/           # 工具函数
└── validators/      # 参数验证



# 服务器配置
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173

# 时区和语言配置
DEFAULT_TIMEZONE=Asia/Jakarta
DEFAULT_LOCALE=id-ID

# JWT配置
JWT_SECRET=88b3a44c73161f9484bf1e9bbc2af7825e69b9423b37b69a73144aaf805eb9b2
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=5272c37c7ccb5f3e1d4d4c230a0a78f50960098d1845499d554ab3baa160f161
JWT_REFRESH_EXPIRES_IN=7d

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=xspace
DB_USER=postgres
DB_PASSWORD=xiaotao4vip

# 数据库连接URL（优先使用）
DATABASE_URL=postgresql://postgres:xiaotao4vip@localhost:5432/xspace