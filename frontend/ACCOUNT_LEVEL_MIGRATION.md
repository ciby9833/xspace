# 前端账户级别系统改造总结

## 概述

本次改造将前端权限系统从基于 `role_level` 的系统升级为基于 `account_level` 的层级化账户系统，与后端保持一致，实现更清晰的权限管理和数据范围控制。

## 主要改动

### 1. 认证Store改造 (`src/stores/auth.js`)

#### 替换字段
- `roleLevel` → `accountLevel`
- `role_level` → `account_level`

#### 新增计算属性
```javascript
const accountLevel = computed(() => user.value?.account_level || 'store')
const isStoreAdmin = computed(() => accountLevel.value === 'store' || isCompanyAdmin.value)
```

#### 新增方法
- `hasAccountLevel(requiredLevel)` - 检查账户级别权限
- `canCreateAccountLevel(targetLevel)` - 检查是否可创建指定级别账户
- `getCreatableAccountLevels()` - 获取可创建的账户级别列表

#### 权限检查优化
```javascript
const hasPermission = (permission) => {
  // 平台管理员拥有所有权限
  if (isPlatformAdmin.value) return true
  
  // 门店级账户权限限制
  if (accountLevel.value === 'store') {
    if (permission.startsWith('company.') || 
        permission.startsWith('system.') || 
        permission.startsWith('platform.')) {
      return false
    }
  }
  
  // 其他权限检查逻辑...
}
```

### 2. API接口扩展 (`src/api/user.js`)

#### 新增接口
```javascript
// 获取可创建的账户级别列表
getCreatableAccountLevels() {
  return request.get('/api/users/creatable-account-levels')
}
```

### 3. 用户管理视图改造 (`src/views/UserView.vue`)

#### 新增功能
- **账户级别选择**: 创建和编辑用户时支持选择账户级别
- **账户级别显示**: 用户列表中显示账户级别标签
- **权限检查优化**: 基于账户级别进行权限验证

#### 表格列新增
```javascript
{
  title: '账户级别',
  dataIndex: 'account_level',
  key: 'account_level',
}
```

#### 表单字段新增
```javascript
<a-form-item label="账户级别" name="account_level">
  <a-select v-model:value="createForm.account_level">
    <a-select-option v-for="level in creatableAccountLevels">
      {{ level.label }}
    </a-select-option>
  </a-select>
</a-form-item>
```

#### 权限检查函数重构
```javascript
const canEditUser = (user) => {
  // 平台级账户只能被平台级或自己编辑
  if (user.account_level === 'platform' && 
      !authStore.isPlatformAdmin && 
      user.id !== authStore.user?.id) {
    return false
  }
  // 其他检查逻辑...
}
```

### 4. 公司管理视图改造 (`src/views/CompanyView.vue`)

#### 新增功能
- **管理员账户级别设置**: 创建公司时可设置管理员账户级别
- **权限检查优化**: 使用新的账户级别系统

#### 表单字段新增
```javascript
<a-form-item label="账户级别" name="admin_account_level">
  <a-select v-model:value="createForm.admin_account_level">
    <a-select-option value="company">公司级账户</a-select-option>
    <a-select-option value="store">门店级账户</a-select-option>
  </a-select>
</a-form-item>
```

### 5. 权限管理视图改造 (`src/views/PermissionView.vue`)

#### 权限检查优化
- 基于账户级别过滤可见角色
- 更新角色编辑和删除权限检查

```javascript
const canEditRole = (role) => {
  if (authStore.isPlatformAdmin) return true
  
  if (authStore.isCompanyAdmin) {
    return !['平台管理员', 'superadmin'].includes(role.name)
  }
  
  // 门店级用户权限限制
  return !['平台管理员', '公司管理员', 'superadmin', 'admin'].includes(role.name)
}
```

### 6. 路由守卫更新 (`src/router/index.js`)

#### 日志输出更新
```javascript
console.log('用户信息:', {
  role: authStore.userRole,
  account_level: authStore.accountLevel,  // 替换 role_level
  management_scope: authStore.managementScope
})
```

### 7. 仪表板视图优化 (`src/views/DashboardView.vue`)

#### 权限检查更新
```javascript
v-if="authStore.hasPermission('company.view')"  // 替换 'platform.manage'
```

## 账户级别系统特性

### 层级结构
```
平台级 (platform)
├── 可创建: 平台级、公司级账户
├── 数据范围: 所有数据
└── 权限: 所有功能权限

公司级 (company)
├── 可创建: 公司级、门店级账户
├── 数据范围: 本公司数据
└── 权限: 公司内管理权限

门店级 (store)
├── 可创建: 门店级账户
├── 数据范围: 本门店数据
└── 权限: 基础操作权限
```

### 权限控制原则

1. **数据范围自动确定**: 基于账户级别自动确定数据访问范围
2. **功能权限独立**: 权限配置只控制功能访问，不影响数据范围
3. **层级化管理**: 上级可以管理下级，同级可以管理同级
4. **安全性保障**: 下级不能管理上级，关键账户受保护

### 前后端一致性

- **字段统一**: 前后端都使用 `account_level` 字段
- **逻辑一致**: 权限检查和数据范围控制逻辑保持一致
- **API对接**: 前端调用后端的账户级别相关接口

## 测试验证

### 测试脚本
- `test-account-level-frontend.js`: 前端账户级别系统测试
- 验证权限检查、数据范围控制、组件权限等功能

### 测试覆盖
- ✅ 账户级别权限检查
- ✅ 权限继承关系
- ✅ 数据范围控制
- ✅ 前端组件权限
- ✅ 路由守卫更新

## 兼容性说明

### 向后兼容
- 保留原有的权限检查方法，内部逻辑更新为账户级别
- API响应格式保持兼容，新增字段不影响现有功能

### 迁移建议
1. 确保后端已完成账户级别系统迁移
2. 更新前端依赖和配置
3. 测试各个功能模块的权限控制
4. 验证用户创建和管理流程

## 总结

本次前端改造成功实现了：

1. **系统统一**: 前后端权限系统完全统一
2. **逻辑清晰**: 账户级别决定数据范围，权限控制功能访问
3. **管理简化**: 层级化账户管理更加直观
4. **扩展性强**: 易于添加新的账户级别和权限
5. **安全性高**: 多层权限检查确保系统安全

前端账户级别系统改造完成，与后端形成完整的权限管理体系。 