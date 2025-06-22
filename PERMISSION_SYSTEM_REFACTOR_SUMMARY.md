# 权限系统改造总结

## 改造概述

本次改造将权限系统彻底重构，实现了**权限只负责功能访问控制，数据范围完全由账户层级决定**的设计理念。

## 核心设计原则

### 1. 权限与数据范围完全分离 ✅

**权限系统职责**：
- 控制用户能否访问某个功能模块
- 控制用户能否执行某个操作（增删改查）
- 与数据范围无关

**账户层级职责**：
- 自动确定数据访问范围
- 平台级：访问所有数据
- 公司级：只访问本公司数据  
- 门店级：只访问本门店数据

### 2. 角色只绑定功能权限 ✅

角色配置只包含功能权限，不再包含数据范围相关的配置：

```javascript
// 示例：客服角色只配置功能权限
'service': {
  permissions: [
    'order.view',      // 可以查看订单
    'order.create',    // 可以创建订单
    'order.edit',      // 可以编辑订单
    'script.view'      // 可以查看剧本
  ]
}
```

数据范围由用户的`account_level`自动决定，无需在角色中配置。

## 改造内容

### 1. 权限检查器重构 ✅

**文件**: `backend/src/utils/permissions.js`

**主要变更**:
- 明确分离功能权限检查和数据访问权限检查
- 简化权限获取逻辑，直接从角色配置读取
- 移除权限刷新等复杂逻辑
- 数据访问权限完全基于账户层级

**核心方法**:
```javascript
// 纯功能权限检查
static async hasPermission(user, permission)

// 纯数据访问权限检查（基于账户层级）
static async canAccessData(user, targetData)

// 账户层级管理权限检查
static canCreateAccount(user, targetAccountLevel)
```

### 2. 权限服务简化 ✅

**文件**: `backend/src/services/permissionService.js`

**主要变更**:
- 移除复杂的权限初始化逻辑
- 简化权限管理流程
- 权限检查只关注功能访问
- 数据访问权限由账户层级自动处理

**移除的功能**:
- `initializeCompanyRoles()` - 公司角色初始化
- `getDefaultRolePermissions()` - 默认角色权限配置
- 复杂的权限继承逻辑

### 3. 权限控制器简化 ✅

**文件**: `backend/src/controllers/permissionController.js`

**主要变更**:
- 移除初始化相关的控制器方法
- 简化错误处理逻辑
- 专注于基本的CRUD操作

### 4. 权限路由简化 ✅

**文件**: `backend/src/routes/permission.js`

**主要变更**:
- 移除 `/initialize` 路由
- 保留核心的权限管理路由

### 5. 认证中间件优化 ✅

**文件**: `backend/src/utils/auth.js`

**主要变更**:
- 移除权限刷新中间件
- 移除公司访问权限检查中间件
- 简化JWT token处理
- 数据权限检查基于账户层级

## 权限配置结构

### 功能权限模块

```javascript
const PERMISSION_MODULES = {
  system: {
    name: '系统管理',
    permissions: ['system.view', 'system.manage', 'system.permission']
  },
  user: {
    name: '用户管理', 
    permissions: ['user.view', 'user.create', 'user.edit', 'user.delete', 'user.manage']
  },
  // ... 其他模块
};
```

### 角色权限配置

```javascript
const ROLE_PERMISSIONS = {
  'superadmin': {
    permissions: ['system.*', 'company.*', 'user.*', 'store.*', 'script.*', 'order.*']
  },
  'admin': {
    permissions: ['user.manage', 'store.manage', 'script.manage', 'order.manage']
  },
  'service': {
    permissions: ['order.view', 'order.create', 'order.edit', 'script.view']
  }
  // ... 其他角色
};
```

## 数据访问控制

### 自动数据范围映射

```javascript
const LEVEL_DATA_SCOPE_MAP = {
  'platform': 'all',      // 平台级：所有数据
  'company': 'company',    // 公司级：本公司数据
  'store': 'store'        // 门店级：本门店数据
};
```

### 数据访问检查逻辑

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
  }
}
```

## 权限检查流程

### 用户操作权限检查

1. **功能权限检查**: 用户是否有执行该操作的权限
2. **数据访问权限检查**: 用户是否能访问目标数据
3. **账户层级权限检查**: 用户是否能管理目标账户层级

### 示例：删除用户操作

```javascript
static async canDeleteUser(currentUser, targetUser) {
  // 1. 检查功能权限
  const hasPermission = await this.hasPermission(currentUser, 'user.manage');
  if (!hasPermission) return false;

  // 2. 检查账户层级权限
  const currentLevel = this.getAccountLevel(currentUser);
  const targetLevel = this.getAccountLevel(targetUser);
  if (!this.canManageAccountLevel(currentLevel, targetLevel)) return false;

  // 3. 检查数据访问权限
  return await this.canAccessData(currentUser, targetUser);
}
```

## 测试验证

### 自动化测试 ✅

运行 `backend/test-account-level-system.js` 测试结果：

```
✅ 账户级别权限检查 - 通过
✅ 用户创建层级概念 - 通过  
✅ 数据范围控制 - 通过
✅ 门店用户公司挂靠 - 通过
```

## 系统优势

### 1. 清晰的职责分离
- 权限系统只管功能访问
- 账户层级只管数据范围
- 角色只绑定功能权限

### 2. 简化的配置管理
- 不再需要复杂的权限初始化
- 角色配置更加简洁
- 数据范围自动确定

### 3. 更好的可维护性
- 逻辑清晰，易于理解
- 减少了代码复杂度
- 降低了出错概率

### 4. 灵活的扩展性
- 新增功能权限只需配置角色
- 新增账户层级只需配置数据范围映射
- 权限和数据范围独立扩展

## 部署注意事项

### 1. 数据库无需变更
- 权限表结构保持不变
- 用户表已包含`account_level`字段
- 现有数据完全兼容

### 2. 前端适配
- 前端权限检查逻辑无需变更
- 数据范围由后端自动处理
- 用户界面显示基于功能权限

### 3. API兼容性
- 所有API接口保持兼容
- 权限检查逻辑更加严格
- 数据返回范围更加精确

## 总结

✅ **权限系统改造完成**

实现了权限与数据范围的完全分离：
- **权限只负责功能访问控制**：用户能否执行某个操作
- **账户层级决定数据范围**：用户能访问哪些数据
- **角色只绑定功能权限**：不再包含数据范围相关配置

系统现在更加清晰、简洁、易维护，完全符合"权限管功能，层级管数据"的设计理念。 