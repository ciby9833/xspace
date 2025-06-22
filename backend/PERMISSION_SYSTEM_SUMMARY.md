# 权限系统架构总结

## 🎯 系统设计理念

### 核心原则
1. **层级只控制数据范围**：平台级 > 公司级 > 门店级
2. **权限只控制功能访问**：无继承关系，直接检查分配的权限
3. **功能入口权限检查**：在路由层使用中间件检查权限
4. **功能内部免检查**：通过权限检查后，内部操作不再重复检查其他权限
5. **完全数据库驱动**：所有权限配置存储在数据库中，支持动态管理

## 🏗️ 数据库架构

### 权限相关表结构

#### 1. permission_modules (权限模块表)
```sql
CREATE TABLE permission_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,           -- 模块名称 (system, company, user...)
  display_name VARCHAR(100) NOT NULL,          -- 显示名称 (系统管理, 公司管理...)
  description TEXT,                            -- 模块描述
  sort_order INTEGER DEFAULT 0,               -- 排序
  is_active BOOLEAN DEFAULT true,             -- 是否启用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. permissions (权限项表)
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES permission_modules(id),
  name VARCHAR(100) NOT NULL,                 -- 权限名称 (view, create, edit...)
  display_name VARCHAR(100) NOT NULL,         -- 显示名称 (查看, 创建, 编辑...)
  description TEXT,                           -- 权限描述
  permission_key VARCHAR(100) NOT NULL UNIQUE, -- 权限键 (system.view, user.create...)
  sort_order INTEGER DEFAULT 0,              -- 排序
  is_active BOOLEAN DEFAULT true,            -- 是否启用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. roles (角色表)
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company(id),     -- 归属公司 (NULL=平台级角色)
  name VARCHAR(100) NOT NULL,                 -- 角色名称
  display_name VARCHAR(100) NOT NULL,         -- 显示名称
  description TEXT,                           -- 角色描述
  role_level VARCHAR(20) DEFAULT 'store',     -- 角色层级 (platform/company/store)
  is_system_role BOOLEAN DEFAULT false,       -- 是否系统角色
  is_active BOOLEAN DEFAULT true,            -- 是否启用
  created_by UUID REFERENCES users(id),      -- 创建者
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, role_level, name)       -- 同公司同层级角色名唯一
);
```

#### 4. role_permission_assignments (角色权限分配表)
```sql
CREATE TABLE role_permission_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id),
  granted BOOLEAN DEFAULT true,              -- 是否授予权限
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)            -- 同角色同权限唯一
);
```

## 🔧 权限检查机制

### 1. 功能权限检查 (PermissionChecker)

#### 核心方法
- `hasPermission(user, permission)`: 检查用户是否有特定功能权限
- `getUserPermissions(user)`: 获取用户的所有功能权限
- `canAccessData(user, targetData)`: 检查数据访问权限（基于层级）

#### 权限获取流程
```sql
-- 获取用户权限的SQL查询
SELECT DISTINCT p.permission_key
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permission_assignments rpa ON r.id = rpa.role_id
JOIN permissions p ON rpa.permission_id = p.id
WHERE u.id = $1 AND rpa.granted = true 
  AND u.is_active = true AND r.is_active = true 
  AND p.is_active = true
```

### 2. 数据访问权限 (基于账户层级)

#### 层级访问规则
- **平台级 (platform)**: 可访问所有数据
- **公司级 (company)**: 只能访问本公司数据
- **门店级 (store)**: 只能访问本门店数据

#### 实现逻辑
```javascript
static async canAccessData(user, targetData) {
  const accountLevel = this.getAccountLevel(user);
  
  switch (accountLevel) {
    case 'platform':
      return true; // 平台级可访问所有数据
    case 'company':
      return targetData.company_id === user.company_id;
    case 'store':
      return targetData.store_id === user.store_id || 
             targetData.company_id === user.company_id;
    default:
      return false;
  }
}
```

## 🚀 API 接口架构

### 权限管理API (/api/permissions)

#### 核心接口
- `GET /structure` - 获取权限结构（模块和权限）
- `GET /roles` - 获取角色列表
- `POST /roles` - 创建角色
- `PUT /roles/:id` - 更新角色
- `DELETE /roles/:id` - 删除角色
- `POST /roles/:id/permissions` - 分配权限给角色
- `GET /companies/for-role` - 获取公司列表（用于角色归属）
- `GET /role-levels/creatable` - 获取可创建的角色层级

#### 权限中间件
```javascript
// 单权限检查
router.get('/roles', 
  authenticateToken, 
  checkPermission('system.role'),
  permissionController.getCompanyRoles
);

// 多权限检查（任意一个满足）
router.get('/data', 
  authenticateToken, 
  requireAnyPermissionMiddleware(['data.view', 'data.manage']),
  dataController.getData
);
```

## 📊 权限数据初始化

### 模块和权限配置

#### 权限模块 (10个核心模块)
1. **system** - 系统管理
2. **company** - 公司管理
3. **user** - 用户管理
4. **store** - 门店管理
5. **script** - 剧本管理
6. **escape_room** - 密室管理
7. **room** - 房间管理
8. **order** - 订单管理
9. **game_host** - Game Host管理
10. **permission** - 权限管理

#### 权限操作类型 (每个模块5-6个权限)
- `view` - 查看
- `create` - 创建
- `edit` - 编辑
- `delete` - 删除
- `manage` - 管理（包含所有操作）
- 特殊权限（如 `game_host.start`, `game_host.complete`）

### 数据初始化脚本
```bash
# 运行权限数据初始化
node init-permission-data.js
```

## 🔄 权限系统工作流程

### 1. 用户登录
1. 验证用户凭据
2. 查询用户角色和权限
3. 生成包含权限列表的JWT Token
4. 返回用户信息和权限

### 2. 权限检查
1. 解析JWT Token获取用户权限
2. 在路由中间件检查功能权限
3. 在业务逻辑中检查数据访问权限
4. 允许/拒绝操作

### 3. 权限管理
1. 管理员创建/编辑角色
2. 为角色分配权限
3. 将角色分配给用户
4. 权限立即生效（下次登录或刷新token）

## ✅ 解决的问题

### 1. 硬编码问题
- ❌ **之前**: 超级管理员权限硬编码在代码中
- ✅ **现在**: 所有权限完全存储在数据库中，支持动态管理

### 2. 权限继承复杂性
- ❌ **之前**: 复杂的权限继承和扩展机制
- ✅ **现在**: 纯功能权限检查，无继承关系

### 3. 层级与权限混淆
- ❌ **之前**: 层级和权限概念混淆
- ✅ **现在**: 清晰分离：层级控制数据范围，权限控制功能访问

### 4. 数据访问控制
- ❌ **之前**: 数据访问权限不够精确
- ✅ **现在**: 基于账户层级的精确数据访问控制

## 🎉 系统优势

1. **完全数据库驱动**: 支持动态权限配置
2. **清晰的职责分离**: 层级 vs 权限
3. **灵活的角色管理**: 支持跨层级角色创建
4. **精确的访问控制**: 功能权限 + 数据权限
5. **易于扩展**: 新增模块和权限只需数据库操作
6. **高性能**: 权限信息缓存在JWT中，减少数据库查询

## 📝 使用示例

### 创建新角色
```javascript
// 平台管理员为某公司创建公司管理员角色
const roleData = {
  name: 'company_admin',
  display_name: '公司管理员',
  description: '管理本公司所有业务',
  role_level: 'company',
  company_id: 'company-uuid'
};

await permissionService.createRole(roleData, currentUser);
```

### 权限检查
```javascript
// 检查用户是否有创建订单权限
const canCreateOrder = await PermissionChecker.hasPermission(user, 'order.create');

// 检查用户是否可以访问特定公司数据
const canAccessCompany = PermissionChecker.canAccessCompany(user, companyId);
```

### 路由权限保护
```javascript
// 保护需要特定权限的路由
router.post('/orders', 
  authenticateToken,
  checkPermission('order.create'),
  orderController.createOrder
);
```

这个权限系统现在完全基于数据库配置，支持灵活的权限管理，同时保持了清晰的架构设计和高性能。 