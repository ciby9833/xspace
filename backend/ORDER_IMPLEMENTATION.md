# 订单管理功能实现说明

基于《订单管理.md》设计文档，完成了订单管理模块的开发，遵循现有系统的层级架构和权限体系。

## 📋 实现概况

### 🗂️ 数据库结构

创建了以下数据表：

1. **orders** - 核心订单表
   - 支持剧本杀和密室两种订单类型
   - 包含客户信息、时间安排、费用信息、负责人等
   - 自动计算总金额的触发器
   - 支持软删除

2. **order_configs** - 订单配置表
   - 存储可编辑的选项（主持人、NPC、优惠、负责人等）
   - 按公司隔离配置数据
   - 支持排序和状态管理

3. **order_images** - 订单图片表
   - 存储支付凭证等图片
   - 支持多张图片和图片类型分类
   - 图片文件单独存储

### 🏗️ 系统架构

遵循现有的分层架构：

```
Controller -> Service -> Model -> Database
    ↓         ↓         ↓         ↓
 路由处理   业务逻辑   数据操作   数据存储
```

### 📁 文件结构

```
backend/src/
├── database/
│   └── migrate-orders.js          # 订单数据库迁移
├── models/
│   └── orderModel.js              # 订单数据模型
├── services/
│   └── orderService.js            # 订单业务逻辑
├── controllers/
│   └── orderController.js         # 订单控制器
└── routes/
    └── order.js                   # 订单路由配置
```

## 🔐 权限体系

### 权限模块

- `order.view` - 查看订单权限
- `order.manage` - 管理订单权限（创建、编辑、删除）

### 数据权限

- **平台级** - 可以查看所有公司的订单
- **公司级** - 只能查看本公司的订单
- **门店级** - 只能查看本门店的订单

## 🚀 API 接口

### 基础接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/order` | 获取订单列表 | order.view |
| POST | `/api/order` | 创建订单 | order.manage |
| GET | `/api/order/:id` | 获取订单详情 | order.view |
| PUT | `/api/order/:id` | 更新订单 | order.manage |
| DELETE | `/api/order/:id` | 删除订单 | order.manage |

### 门店相关接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/order/store/:storeId` | 获取门店订单列表 | order.view |
| GET | `/api/order/store/:storeId/stats` | 获取门店统计 | order.view |
| GET | `/api/order/store/:storeId/resources` | 获取门店可用资源 | order.view |

### 统计与配置接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | `/api/order/stats` | 获取订单统计 | order.view |
| GET | `/api/order/configs/:configType?` | 获取订单配置 | order.view |
| POST | `/api/order/batch` | 批量操作订单 | order.manage |

### 图片管理接口

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| POST | `/api/order/upload-images` | 上传图片 | order.manage |
| POST | `/api/order/:orderId/images` | 添加订单图片 | order.manage |
| DELETE | `/api/order/:orderId/images/:imageId` | 删除订单图片 | order.manage |

## 📊 查询筛选

支持多维度筛选：

- **门店筛选** - store_id
- **订单类型** - order_type (剧本杀/密室)
- **状态筛选** - status (pending/confirmed/in_progress/completed/cancelled)
- **支付状态** - payment_status (FULL/Not Yet/DP/Free)
- **预订类型** - booking_type (Booking/Walk In/Traveloka等)
- **语言筛选** - language (CN/IND)
- **日期范围** - start_date, end_date
- **客户搜索** - customer_name, customer_phone

## 💰 金额计算

### 自动计算逻辑

通过数据库触发器自动计算总金额：

```sql
total_amount = unit_price * player_count - promo_discount
```

### 特殊处理

- 免费订单：`is_free = true` 时，总金额为0
- 负数保护：确保总金额不为负数
- 优惠处理：支持优惠码和折扣金额

## 🏪 门店资源管理

### 可用资源查询

- **剧本** - 门店配置的可用剧本及价格
- **密室** - 门店配置的可用密室及价格  
- **房间** - 门店的所有房间
- **用户** - 可作为主持人、NPC、负责人的用户

### 动态配置

- 支持门店级别的价格设置
- 支持资源的启用/禁用状态
- 支持排序配置

## 📝 数据验证

### 必填字段验证

- 订单类型、客户信息、玩家人数
- 日期时间、门店、预订类型、支付状态

### 业务逻辑验证

- 剧本杀订单必须选择剧本
- 密室订单必须选择密室主题
- 结束时间必须晚于开始时间
- 金额不能为负数

### 数据完整性

- 外键约束确保关联数据一致性
- 软删除保护历史数据
- 冗余字段防止关联数据丢失

## 🔄 批量操作

支持的批量操作：

- **确认订单** - confirm
- **完成订单** - complete  
- **取消订单** - cancel

## 📈 统计功能

### 订单统计

- 总订单数、各状态订单数
- 剧本杀/密室订单分布
- 总收入、平均订单金额

### 门店统计

- 门店级别的订单统计
- 支持日期范围筛选
- 支持实时数据更新

## 🎯 使用说明

### 1. 运行数据库迁移

```bash
node src/database/migrate-orders.js
```

### 2. 启动服务

确保其他核心模块已正确配置，然后启动应用服务。

### 3. 权限配置

在权限管理界面为相应角色分配订单管理权限。

### 4. 基础配置

在订单配置界面设置：
- 主持人列表
- NPC列表  
- 优惠代码
- 负责人列表
- 收款负责人列表

## 🔧 扩展建议

### 近期优化

1. **订单状态流转** - 增加状态变更日志
2. **消息通知** - 订单状态变更时发送通知
3. **报表导出** - 支持订单数据导出Excel
4. **预约冲突检测** - 房间时间冲突提醒

### 长期规划

1. **在线支付集成** - 集成支付宝、微信支付
2. **客户管理系统** - 建立客户档案和积分体系
3. **智能推荐** - 基于历史数据推荐剧本/密室
4. **移动端支持** - 开发移动端订单管理应用

## 📋 注意事项

1. **图片存储** - 图片文件需要单独的存储路径管理
2. **时区处理** - 注意不同地区的时区转换
3. **并发控制** - 高并发场景下的数据一致性
4. **备份策略** - 重要订单数据的备份和恢复

---

**实现完成** ✅ 

该订单管理模块完全遵循现有系统架构，支持多公司、多门店的数据隔离，具备完整的权限控制和业务逻辑验证。 