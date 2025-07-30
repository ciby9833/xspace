# 多人支付系统权限配置说明

## 概述

本文档说明了多人支付系统的权限配置，包括4个主要功能模块的权限设置。

## 新增权限模块

### 1. 订单参与玩家 (order_player)
- **模块描述**: 管理订单中的参与玩家信息
- **权限列表**:
  - `order_player.view` - 查看订单参与玩家
  - `order_player.create` - 创建订单参与玩家
  - `order_player.edit` - 编辑订单参与玩家
  - `order_player.delete` - 删除订单参与玩家
  - `order_player.manage` - 订单参与玩家管理（包含所有操作）

### 2. 支付记录 (order_payment)
- **模块描述**: 管理订单的支付记录和状态
- **权限列表**:
  - `order_payment.view` - 查看支付记录
  - `order_payment.create` - 创建支付记录
  - `order_payment.edit` - 编辑支付记录
  - `order_payment.delete` - 删除支付记录
  - `order_payment.confirm` - 确认支付
  - `order_payment.manage` - 支付记录管理（包含所有操作）

### 3. 角色定价模板 (role_pricing)
- **模块描述**: 管理角色定价模板和折扣规则
- **权限列表**:
  - `role_pricing.view` - 查看角色定价模板
  - `role_pricing.create` - 创建角色定价模板
  - `role_pricing.edit` - 编辑角色定价模板
  - `role_pricing.delete` - 删除角色定价模板
  - `role_pricing.manage` - 角色定价模板管理（包含所有操作）

### 4. 定价日历 (pricing_calendar)
- **模块描述**: 管理基于日期的定价规则
- **权限列表**:
  - `pricing_calendar.view` - 查看定价日历
  - `pricing_calendar.create` - 创建定价日历
  - `pricing_calendar.edit` - 编辑定价日历
  - `pricing_calendar.delete` - 删除定价日历
  - `pricing_calendar.manage` - 定价日历管理（包含所有操作）

## 权限配置执行

### 运行权限添加脚本

```bash
# 进入后端目录
cd backend

# 执行权限添加脚本
node src/database/add-multi-payment-permissions.js
```

### 执行内容

脚本会执行以下操作：

1. **添加权限模块**: 在 `permission_modules` 表中添加4个新的权限模块
2. **添加权限项**: 在 `permissions` 表中添加对应的权限项
3. **分配权限**: 自动为以下角色分配新权限：
   - 超级管理员（superadmin）
   - 平台级角色（platform）
   - 公司级角色（company）
   - 管理员角色（admin, manager, supervisor）

### 模块排序

新增模块的排序顺序：
- 订单参与玩家: 10
- 支付记录: 11
- 角色定价模板: 12
- 定价日历: 13

## 前端界面权限

### 路由权限

已在前端路由中配置权限检查：

```javascript
// 角色定价模板管理
{
  path: '/role-pricing',
  name: 'RolePricing',
  component: () => import('@/views/RolePricingView.vue'),
  meta: {
    title: '角色定价模板',
    requiresAuth: true,
    permission: 'role_pricing.view'
  }
}

// 定价日历管理
{
  path: '/pricing-calendar',
  name: 'PricingCalendar',
  component: () => import('@/views/PricingCalendarView.vue'),
  meta: {
    title: '定价日历',
    requiresAuth: true,
    permission: 'pricing_calendar.view'
  }
}
```

### 菜单权限

已在主布局中配置菜单权限检查：

```javascript
// 角色定价模板菜单
{
  key: 'role-pricing',
  icon: 'DollarOutlined',
  label: '角色定价模板',
  permission: 'role_pricing.view'
}

// 定价日历菜单
{
  key: 'pricing-calendar',
  icon: 'CalendarOutlined',
  label: '定价日历',
  permission: 'pricing_calendar.view'
}
```

## API 端点权限

### 订单参与玩家 API
- 基础路径: `/api/order-players`
- 权限检查: 所有端点都需要相应的权限

### 支付记录 API
- 基础路径: `/api/order-payments`
- 权限检查: 所有端点都需要相应的权限

### 角色定价模板 API
- 基础路径: `/api/role-pricing-templates`
- 权限检查: 所有端点都需要相应的权限

### 定价日历 API
- 基础路径: `/api/pricing-calendar`
- 权限检查: 所有端点都需要相应的权限

## 角色权限分配建议

### 管理员角色 (admin)
- 所有多人支付系统权限
- 适用于公司管理员

### 经理角色 (manager)
- 查看和编辑权限
- 适用于门店经理

### 客服角色 (service)
- 查看和创建权限
- 适用于客服人员

### 主持人角色 (host)
- 仅查看权限
- 适用于Game Host

## 数据权限控制

权限系统基于账户层级控制数据访问范围：

- **平台级**: 可访问所有公司数据
- **公司级**: 可访问本公司所有门店数据
- **门店级**: 仅可访问本门店数据

## 注意事项

1. **权限继承**: 具有 `manage` 权限的用户自动拥有该模块的所有权限
2. **数据隔离**: 权限检查会基于用户的账户层级自动过滤数据
3. **接口安全**: 所有API端点都有权限检查和数据范围限制
4. **前端权限**: 前端界面元素会根据用户权限动态显示/隐藏

## 故障排除

### 权限添加失败
1. 检查数据库连接
2. 确认 `permission_modules` 和 `permissions` 表存在
3. 检查是否有重复的权限键值

### 权限不生效
1. 检查用户是否有相应的角色
2. 确认角色是否分配了相应权限
3. 检查前端权限缓存是否更新

### 数据访问问题
1. 确认用户的账户层级设置正确
2. 检查公司和门店关联关系
3. 验证数据权限范围设置

## 相关文件

- 权限配置: `backend/src/config/permissions.js`
- 权限添加脚本: `backend/src/database/add-multi-payment-permissions.js`
- 权限检查工具: `backend/src/utils/permissions.js`
- 前端权限存储: `frontend/src/stores/auth.js`
- 路由权限配置: `frontend/src/router/index.js` 