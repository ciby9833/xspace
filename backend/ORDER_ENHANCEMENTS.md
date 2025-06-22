# 订单管理系统增强功能

## 📋 问题描述

用户反馈了订单管理中的三个关键问题：

1. **门店选项为空**：录入订单时"门店"选项为空，需要根据用户权限级别自动填充
2. **剧本/密室筛选问题**：密室和剧本列出的选项需要依据上架门店过滤显示
3. **房间占用检查缺失**：选择门店后需要列出门店房间并判断是否被占用

## 🚀 解决方案概览

### 1. 后端增强功能

#### 新增API端点

| 端点 | 方法 | 功能 | 权限 |
|------|------|------|------|
| `/api/order/available-stores` | GET | 获取用户可选门店列表 | order.view |
| `/api/order/store/:storeId/rooms/:roomId/occupancy` | GET | 获取房间占用情况 | order.view |
| `/api/order/store/:storeId/rooms/:roomId/availability` | GET | 检查房间可用性 | order.view |

#### 新增Service方法

**OrderService.js**
- `getAvailableStores(user)` - 根据用户权限获取可选门店
- `getEnhancedStoreResources(storeId, user, options)` - 获取增强的门店资源
- `getRoomOccupancy(storeId, roomId, timeSlot, user)` - 获取房间占用情况
- `checkRoomAvailability(storeId, roomId, timeSlot, user)` - 检查房间可用性

#### 新增Model方法

**OrderModel.js**
- `getRoomOccupancyByDate(roomId, date)` - 根据日期获取房间占用
- `checkRoomTimeSlot(roomId, date, startTime, endTime)` - 检查特定时间段占用
- `checkRoomTimeConflicts(roomId, date, startTime, endTime, excludeOrderId)` - 检查时间冲突
- `getEnhancedStoreResources(storeId, options)` - 获取增强的门店资源

### 2. 前端增强功能

#### 组件改进

**OrderFormModal.vue** - 完全重构
- ✅ 根据用户权限自动加载门店列表
- ✅ 门店级用户自动选择关联门店
- ✅ 根据选择门店动态加载剧本和密室（仅显示上架内容）
- ✅ 新增房间选择功能
- ✅ 实时检查房间占用状态
- ✅ 智能表单联动和验证
- ✅ 加载状态指示器

#### API增强

**order.js** - 新增API方法
- `getAvailableStores()` - 获取可选门店
- `getRoomOccupancy(storeId, roomId, params)` - 获取房间占用
- `checkRoomAvailability(storeId, roomId, params)` - 检查房间可用性

## 📊 功能特性

### 智能门店选择
```javascript
// 公司级用户：显示公司下所有门店
// 门店级用户：自动选择关联门店，不可更改
const stores = await orderAPI.getAvailableStores()
```

### 动态资源筛选
```javascript
// 根据选择的门店，只显示该门店上架的剧本和密室
watch(() => form.store_id, (newStoreId) => {
  if (newStoreId) {
    loadStoreResources(newStoreId) // 重新加载资源
  }
})
```

### 房间占用检查
```javascript
// 实时检查房间在指定时间段的可用性
const availability = await orderAPI.checkRoomAvailability(
  storeId, roomId, 
  { date, start_time, end_time, exclude_order_id }
)
```

## 🔧 技术实现

### 权限控制
- 基于用户 `account_level` 和 `company_id` 进行权限判断
- 平台级：可操作所有门店
- 公司级：只能操作本公司门店
- 门店级：只能操作关联门店

### 数据库查询优化
```sql
-- 房间时间冲突检查
SELECT o.id, o.customer_name, o.start_time, o.end_time 
FROM orders o
WHERE o.room_id = $1 AND o.order_date = $2 
  AND o.is_active = true AND o.status NOT IN ('cancelled')
  AND (
    (o.start_time < $4 AND o.end_time > $3) OR
    (o.start_time >= $3 AND o.start_time < $4) OR
    (o.end_time > $3 AND o.end_time <= $4)
  )
```

### 前端状态管理
- 响应式数据更新
- 智能表单验证
- 异步数据加载
- 错误处理和用户提示

## 🎯 用户体验改进

### 1. 门店选择自动化
- **之前**：门店选项为空，用户困惑
- **现在**：根据权限自动填充，门店级用户自动选择

### 2. 剧本/密室精准显示
- **之前**：显示所有剧本/密室，可能选择未上架内容
- **现在**：只显示选定门店上架的内容，包含价格信息

### 3. 房间占用可视化
- **之前**：无法知道房间是否被占用
- **现在**：实时显示房间状态，防止冲突预订

### 4. 智能表单联动
- **之前**：各字段独立，可能产生逻辑错误
- **现在**：字段间智能联动，自动验证和重置

## 📱 界面优化

### 加载状态指示
```vue
<a-select :loading="loadingStores" placeholder="正在加载门店...">
<a-select :loading="loadingResources" placeholder="正在加载资源...">
<div v-if="checkingRoom">正在检查房间可用性...</div>
```

### 状态可视化
```vue
<!-- 房间状态显示 -->
{{ room.name }} [{{ room.room_type }}, 容量{{ room.capacity }}] 
✅ 可用 / ❌ (2个冲突) / (维护中)
```

### 智能提示
```vue
<div v-if="!form.store_id">请先选择门店</div>
<div v-if="escapeRoomList.length === 0">该门店暂无可用密室</div>
```

## 🧪 测试验证

创建了测试脚本 `test-order-enhancements.js` 用于验证：
- ✅ 门店列表获取
- ✅ 门店资源加载
- ✅ 房间占用查询
- ✅ 房间可用性检查

## 🔍 性能优化

### 并发查询
```javascript
// 并发检查所有房间的可用性
const checkPromises = roomList.value.map(async (room) => {
  return await orderAPI.checkRoomAvailability(storeId, room.id, timeSlot)
})
const results = await Promise.all(checkPromises)
```

### 智能缓存
- 门店资源缓存，避免重复请求
- 房间状态缓存，减少API调用
- 表单数据智能重置

## 🚀 部署说明

### 后端部署
1. 确保所有新的API路由已添加
2. 数据库结构无需变更
3. 新增的service和model方法已就绪

### 前端部署
1. 新的API方法已添加到 `order.js`
2. `OrderFormModal.vue` 已完全重构
3. 保持向后兼容性

## 📝 总结

通过本次增强，完全解决了用户提出的三个关键问题：

1. ✅ **门店自动填充**：根据用户权限智能加载可选门店
2. ✅ **精准内容筛选**：剧本/密室按门店上架情况动态显示
3. ✅ **房间占用管理**：实时检查房间状态，防止冲突预订

同时提供了：
- 🎯 更好的用户体验
- 🔒 完善的权限控制
- ⚡ 优化的性能表现
- 🛡️ 健壮的错误处理

这些改进使订单管理系统更加智能、高效和用户友好。 