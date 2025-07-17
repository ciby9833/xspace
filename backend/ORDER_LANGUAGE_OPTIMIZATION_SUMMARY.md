# 订单语言优化总结

## 优化目标
将订单管理系统中的"客户语言"字段改为显示剧本或密室的支持语言，并支持按语言筛选订单。

## 实现方案

### 1. 数据库查询优化
**修改文件**: `backend/src/models/orderModel.js`

#### 主要更改：
- 在所有订单查询中添加剧本和密室的 `supported_languages` 字段
- 修改语言筛选逻辑，从按客户语言筛选改为按剧本/密室支持语言筛选

#### 具体修改：
```sql
-- 添加语言字段查询
sc.supported_languages as script_supported_languages,
er.supported_languages as escape_room_supported_languages

-- 修改语言筛选条件
WHERE (
  (o.order_type = '剧本杀' AND sc.supported_languages::jsonb ? $language) OR
  (o.order_type = '密室' AND er.supported_languages::jsonb ? $language)
)
```

#### 涉及的查询方法：
- `findByCompanyId()` - 根据公司ID获取订单列表
- `findByStoreId()` - 根据门店ID获取订单列表  
- `findById()` - 根据ID获取订单详情
- `getRoomOccupancyByDate()` - 获取房间占用情况
- `checkRoomTimeSlot()` - 检查房间时间段占用
- `checkRoomTimeConflicts()` - 检查房间时间冲突

### 2. 游戏主持人模块优化
**修改文件**: `backend/src/models/gameHostModel.js`

#### 主要更改：
- 在游戏主持人订单查询中添加剧本/密室语言字段
- 添加语言筛选支持

#### 涉及的查询方法：
- `findGameHostOrders()` - 获取游戏主持人订单列表
- `findGameHostOrderById()` - 获取游戏主持人订单详情
- `findCurrentInProgressOrder()` - 获取当前进行中的订单
- `getGameHostOrderHistory()` - 获取订单历史记录

### 3. 服务层语言处理
**修改文件**: `backend/src/services/orderService.js`

#### 主要功能：
- 添加 `getOrderDisplayLanguages()` 方法处理语言显示逻辑
- 修改订单列表、详情、导出等方法支持语言显示
- 统一语言文本转换逻辑

#### 核心方法：
```javascript
getOrderDisplayLanguages(order) {
  // 根据订单类型获取对应的语言支持
  // 处理JSON字符串和数组格式
  // 转换为中文显示文本
}
```

**修改文件**: `backend/src/services/gameHostService.js`

#### 主要功能：
- 添加相同的语言处理逻辑
- 确保游戏主持人界面也能正确显示语言信息

### 4. 控制器层参数处理
**修改文件**: `backend/src/controllers/orderController.js`

#### 主要更改：
- 优化查询参数处理，确保语言筛选参数正确传递
- 添加详细的参数注释说明

### 5. 导出功能优化
**修改文件**: `backend/src/services/orderService.js` 中的 `exportOrders()` 方法

#### 主要更改：
- 将导出Excel中的"客户语言"列改为"支持语言"
- 显示剧本/密室支持的所有语言，用逗号分隔

## 语言编码映射

| 代码 | 中文显示 | 英文显示 |
|------|----------|----------|
| CN   | 中文     | Chinese  |
| EN   | 英语     | English  |
| IND  | 印尼语   | Indonesian |

## 测试结果

### 功能验证
✅ 订单查询正确包含剧本/密室语言信息  
✅ 语言筛选功能正常工作  
✅ 支持多语言筛选（中文、英语、印尼语）  
✅ 剧本和密室语言字段正确显示  
✅ 导出功能正确显示语言信息  

### 测试数据
- 查询到订单包含语言信息
- 支持中文的剧本杀订单：2条
- 支持印尼语的订单：2条
- 语言筛选功能正常

## 向后兼容性

- 保持原有的 `orders.language` 字段不变
- 新增 `display_languages` 字段用于前端显示
- 不影响现有的订单创建和更新逻辑
- 支持JSON数组和字符串两种格式的语言数据

## 性能优化

- 使用 LEFT JOIN 避免数据缺失
- 利用 JSONB 的 `?` 操作符进行高效语言筛选
- 在 GROUP BY 中包含新增的语言字段
- 保持查询索引的有效性

## 使用说明

### 前端集成
```javascript
// 订单列表中的语言显示
order.display_languages // ['中文', '印尼语']

// 语言筛选
const params = {
  language: 'CN' // 筛选支持中文的订单
}
```

### API 参数
- `language`: 语言筛选参数（CN/EN/IND）
- 返回数据中包含 `display_languages` 字段

## 注意事项

1. 语言数据格式兼容性：支持JSON数组和逗号分隔字符串
2. 默认语言：如果没有语言信息，默认显示印尼语
3. 错误处理：JSON解析失败时使用默认语言
4. 数据一致性：确保剧本/密室的语言字段正确维护

## 相关文件

### 后端文件
- `backend/src/models/orderModel.js` - 订单数据模型
- `backend/src/models/gameHostModel.js` - 游戏主持人数据模型
- `backend/src/services/orderService.js` - 订单服务层
- `backend/src/services/gameHostService.js` - 游戏主持人服务层
- `backend/src/controllers/orderController.js` - 订单控制器

### 数据库表
- `orders` - 订单表
- `scripts` - 剧本表（包含 supported_languages 字段）
- `escape_rooms` - 密室表（包含 supported_languages 字段）

## 完成时间
2025年1月15日

---

此优化确保了订单管理系统能够正确显示和筛选剧本/密室的语言支持信息，提升了用户体验和数据的准确性。 