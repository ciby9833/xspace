frontend/src/
├── main.js                 # 应用入口
├── App.vue                # 根组件
├── router/                # 路由配置
│   └── index.js
├── stores/                # Pinia状态管理
│   ├── auth.js            # 认证状态
│   └── user.js            # 用户状态
├── views/                 # 页面组件
│   ├── LoginView.vue      # 登录页
│   ├── DashboardView.vue  # 主控台
│   ├── CompanyView.vue    # 公司管理
│   └── UserView.vue       # 用户管理
├── components/            # 通用组件
│   ├── layout/            # 布局组件
│   └── common/            # 通用组件
├── utils/                 # 工具函数
│   ├── request.js         # HTTP请求封装
│   ├── auth.js            # 认证工具
│   └── permission.js      # 权限工具
└── assets/               # 静态资源


api/          (4个) - API服务层  
├── auth.js
├── company.js  
├── user.js
└── system.js

stores/       (1个) - 状态管理
└── auth.js

utils/        (1个) - 工具层
└── request.js

router/       (1个) - 路由
└── index.js

views/        (4个) - 页面组件
├── LoginView.vue
├── DashboardView.vue  
├── CompanyView.vue
└── UserView.vue

components/   (2个) - 通用组件
├── layout/
└── common/