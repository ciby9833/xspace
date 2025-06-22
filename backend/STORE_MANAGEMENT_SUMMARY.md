# 门店管理功能实现总结

## 概述

基于现有的用户体系和层级体系，成功实现了门店管理功能。门店作为公司的下级单位，支持完整的CRUD操作，并严格遵循权限层级控制。

## 数据库结构

### 核心表结构

1. **company表** - 公司信息
   - 已存在，包含公司基本信息
   - 支持直营和加盟两种类型

2. **store表** - 门店信息
   - `id`: UUID主键
   - `company_id`: 关联公司ID（外键）
   - `name`: 门店名称
   - `address`: 门店地址
   - `business_hours`: 营业时间（JSONB格式）
   - `is_active`: 是否激活
   - `timezone`: 时区设置
   - `created_at/updated_at`: 时间戳

3. **user_stores表** - 用户门店关联
   - 支持用户关联多个门店
   - `is_primary`: 标识主门店

## 权限体系

### 层级权限控制

- **平台级用户**: 可管理所有公司的所有门店
- **公司级用户**: 只能管理本公司的门店
- **门店级用户**: 只能查看自己关联的门店

### 功能权限

- `store.view`: 查看门店信息
- `store.create`: 创建门店
- `store.edit`: 编辑门店信息
- `store.delete`: 删除门店
- `store.manage`: 门店管理

## 实现的功能模块

### 1. 门店模型 (StoreModel)

**文件**: `backend/src/models/storeModel.js`

**主要方法**:
- `create()`: 创建门店
- `findByCompanyId()`: 根据公司ID查询门店
- `findAllWithCompanyInfo()`: 查询所有门店（平台用）
- `findById()`: 根据ID查询门店详情
- `findByIdAndCompany()`: 权限控制的门店查询
- `update()`: 更新门店信息
- `delete()`: 软删除门店
- `getStoreUsers()`: 获取门店用户列表
- `checkNameUnique()`: 检查门店名称唯一性
- `getAccessibleStores()`: 获取用户可访问的门店

### 2. 门店服务 (StoreService)

**文件**: `backend/src/services/storeService.js`

**主要功能**:
- 权限检查和业务逻辑处理
- 支持基于用户层级的数据访问控制
- 门店名称唯一性验证（公司内）
- 完整的CRUD操作封装

### 3. 门店控制器 (StoreController)

**文件**: `backend/src/controllers/storeController.js`

**API端点处理**:
- 统一的错误处理
- 参数验证
- HTTP状态码规范

### 4. 门店路由 (StoreRoutes)

**文件**: `backend/src/routes/storeRoutes.js`

**路由配置**:
- 完整的RESTful API设计
- 参数验证中间件
- 认证中间件保护

## API端点

### 门店管理API

| 方法 | 端点 | 描述 | 权限要求 |
|------|------|------|----------|
| GET | `/api/stores` | 获取门店列表 | store.view |
| GET | `/api/stores/companies` | 获取可选公司列表 | - |
| GET | `/api/stores/:storeId` | 获取门店详情 | store.view |
| GET | `/api/stores/:storeId/users` | 获取门店用户列表 | user.view |
| POST | `/api/stores` | 创建门店 | store.create |
| PUT | `/api/stores/:storeId` | 更新门店信息 | store.edit |
| DELETE | `/api/stores/:storeId` | 删除门店 | store.delete |

### 请求参数

#### 创建门店 (POST /api/stores)
```json
{
  "company_id": "uuid",
  "name": "门店名称",
  "address": "门店地址",
  "business_hours": {
    "monday": { "open": "09:00", "close": "22:00" },
    "tuesday": { "open": "09:00", "close": "22:00" }
  },
  "timezone": "Asia/Jakarta"
}
```

#### 更新门店 (PUT /api/stores/:storeId)
```json
{
  "name": "新门店名称",
  "address": "新地址",
  "business_hours": { ... },
  "timezone": "Asia/Jakarta",
  "is_active": true
}
```

## 权限控制逻辑

### 数据访问控制

1. **平台级用户**:
   - 可以查看和管理所有公司的门店
   - 可以跨公司操作

2. **公司级用户**:
   - 只能查看和管理本公司的门店
   - 创建门店时自动关联到本公司

3. **门店级用户**:
   - 只能查看自己关联的门店
   - 无法创建或删除门店

### 业务规则

1. **门店名称唯一性**: 同一公司内门店名称必须唯一
2. **级联删除保护**: 有用户关联的门店无法删除
3. **软删除**: 删除门店时使用软删除（is_active=false）
4. **权限验证**: 所有操作都需要相应的功能权限

## 测试验证

### 数据库测试
- ✅ 表结构正确创建
- ✅ 外键关系正常
- ✅ 索引创建成功

### 模型测试
- ✅ 门店创建功能
- ✅ 门店查询功能
- ✅ 门店更新功能
- ✅ 权限控制逻辑

### API测试
- ✅ 控制器和服务加载
- ✅ 路由配置正确
- ✅ 权限检查工具集成

## 集成说明

### 已集成的组件

1. **路由注册**: 已添加到 `backend/src/routes/index.js`
2. **权限系统**: 集成现有的权限检查工具
3. **数据库连接**: 使用现有的连接池
4. **认证中间件**: 使用现有的JWT认证

### 配置更新

1. **API信息更新**: 在健康检查端点中添加门店管理说明
2. **权限配置**: 门店相关权限已在权限系统中配置
3. **路由映射**: `/api/stores` 路径已正确映射

## 使用示例

### 获取门店列表
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/stores
```

### 创建门店
```bash
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"company_id":"uuid","name":"新门店","address":"地址"}' \
     http://localhost:3000/api/stores
```

## 后续扩展建议

1. **门店配置**: 可扩展门店特定的配置项
2. **门店统计**: 添加门店业务数据统计
3. **门店模板**: 支持门店创建模板
4. **批量操作**: 支持批量门店管理
5. **门店层级**: 如需要可扩展门店内部层级

## 总结

门店管理功能已完全集成到现有系统中，严格遵循了系统的权限层级设计，提供了完整的CRUD操作，并确保了数据安全和权限控制。所有功能都经过测试验证，可以立即投入使用。 