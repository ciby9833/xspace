# 公司级账户权限更新总结

## 更新概述

根据需求，对创建公司时生成的管理员账户权限进行了优化，确保公司级账户具有合适的权限范围，同时保持系统的安全性和层级控制。

## 核心变更

### 1. 公司创建逻辑优化 ✅

**文件**: `backend/src/services/companyService.js`

**主要变更**:
- 强化权限检查：只有平台级账户才能创建公司
- 创建的管理员账户确保为公司级（`account_level: 'company'`）
- 移除不存在的`is_main_account`字段引用

```javascript
// 创建公司级主账号（admin角色，company账户层级）
const mainAccount = await userModel.create({
  company_id: company.id,
  name: admin_name,
  email: admin_email,
  password_hash: hashedPassword,
  role: 'admin',
  account_level: 'company'  // 确保是公司级账户
});
```

### 2. 权限配置扩展 ✅

**文件**: `backend/src/config/permissions.js`

**admin角色权限扩展**:
```javascript
'admin': {
  permissions: [
    'company.view',        // 可以查看公司信息（但不能创建公司）
    'company.edit',        // 可以编辑自己的公司信息
    'user.view',
    'user.create',
    'user.edit',
    'user.delete',
    'user.manage',
    'store.view',
    'store.create',
    'store.edit',
    'store.delete',
    'store.manage',
    'script.view',
    'script.create',
    'script.edit',
    'script.delete',
    'script.manage',
    'order.view',
    'order.create',
    'order.edit',
    'order.delete',
    'order.manage',
    'system.permission'    // 可以管理权限和角色
  ]
}
```

### 3. 权限服务更新 ✅

**文件**: `backend/src/services/permissionService.js`

**角色可见性优化**:
- 公司级账户可以查看所有角色（包括平台级角色）
- 角色与层级完全分离，角色只管理功能权限
- 保持数据访问基于账户层级的控制

```javascript
if (PermissionChecker.isCompanyAdmin(user)) {
  // 公司管理员可以看到所有角色（包括平台级角色），但角色与层级无关
  return true;
}
```

### 4. 权限检查工具优化 ✅

**文件**: `backend/src/utils/permissions.js`

**可管理角色更新**:
- 公司级账户可以管理除平台级外的所有角色
- 保持层级管理的安全性

```javascript
// 公司级可以管理除平台级外的所有角色
if (accountLevel === ACCOUNT_LEVELS.COMPANY) {
  return role !== 'superadmin';
}
```

## 权限体系架构

### 三级权限控制

```
1. 功能权限（角色控制）
   ├── 菜单访问权限
   ├── 操作权限
   └── 功能模块权限

2. 数据权限（账户层级自动控制）
   ├── 平台级：所有数据
   ├── 公司级：本公司数据
   └── 门店级：本门店数据

3. 管理权限（层级控制）
   ├── 平台级：管理所有层级
   ├── 公司级：管理公司和门店层级
   └── 门店级：管理门店层级
```

### 公司级账户权限特点

#### ✅ 拥有的权限
- **公司管理**: 查看和编辑自己的公司信息
- **用户管理**: 完整的用户管理功能
- **门店管理**: 完整的门店管理功能
- **剧本管理**: 完整的剧本管理功能
- **订单管理**: 完整的订单管理功能
- **权限管理**: 可以管理角色和权限（除平台级角色外）

#### ❌ 不具备的权限
- **公司创建**: 不能创建新公司
- **系统管理**: 不能进行系统级配置
- **平台级角色管理**: 不能管理superadmin角色

#### 🔍 数据访问范围
- **本公司数据**: 完全访问
- **其他公司数据**: 无法访问
- **跨公司操作**: 受限制

## 测试验证结果

### 自动化测试通过 ✅

```
📋 测试1: 公司级账户权限检查 - ✅ 通过
📋 测试2: 账户层级检查 - ✅ 通过  
📋 测试3: 公司创建权限 - ✅ 通过
📋 测试4: 角色管理权限 - ✅ 通过
📋 测试5: 账户创建权限 - ✅ 通过
📋 测试6: 数据访问权限 - ✅ 通过
```

### 关键权限验证

| 权限 | 公司级账户 | 预期 | 结果 |
|------|------------|------|------|
| company.view | ✅ | 有 | ✅ |
| company.create | ❌ | 无 | ✅ |
| company.edit | ✅ | 有 | ✅ |
| user.manage | ✅ | 有 | ✅ |
| system.permission | ✅ | 有 | ✅ |
| store.manage | ✅ | 有 | ✅ |
| script.manage | ✅ | 有 | ✅ |
| order.manage | ✅ | 有 | ✅ |

## 安全性保障

### 1. 层级隔离 🔒
- 公司级账户无法访问其他公司数据
- 不能创建平台级账户
- 不能管理平台级角色

### 2. 功能限制 🔒
- 不能创建新公司
- 不能进行系统级配置
- 权限管理受层级限制

### 3. 数据保护 🔒
- 自动的数据范围控制
- 基于账户层级的访问限制
- 跨公司操作防护

## 用户体验优化

### 1. 权限透明 👁️
- 清晰的权限边界
- 直观的角色管理界面
- 明确的操作反馈

### 2. 功能完整 🎯
- 公司内完整的管理功能
- 灵活的角色配置
- 便捷的用户管理

### 3. 操作简化 ⚡
- 角色与层级分离
- 自动的权限继承
- 智能的权限检查

## 部署说明

### 1. 数据库更新
- 确保`account_level`字段存在
- 运行统一迁移脚本
- 验证现有数据完整性

### 2. 权限配置
- 新的admin角色权限已生效
- 公司创建权限已限制
- 角色管理权限已优化

### 3. 兼容性
- 向后兼容现有数据
- 平滑的权限过渡
- 无需手动数据修复

## 总结

✅ **公司级账户权限更新完成**

本次更新实现了以下目标：
- **权限完整**: 公司级账户拥有除公司创建外的所有管理权限
- **安全可控**: 严格的层级控制和数据隔离
- **角色分离**: 角色只管理功能权限，层级管理数据权限
- **用户友好**: 清晰的权限边界和完整的管理功能

系统现在完全符合**"角色管理功能权限，层级控制数据权限"**的设计理念，为用户提供了安全、灵活、易用的权限管理体验。 