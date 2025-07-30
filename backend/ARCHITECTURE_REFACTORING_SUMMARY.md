我来帮你分析这个支付汇总API的数据来源。让我先查看相关的控制器代码，然后分析数据来源。
Ran tool

现在让我查看OrderService中的`getOrderPaymentSummary`方法的具体实现：
Ran tool

让我继续查看这些生成方法和getById方法的具体实现：
Ran tool

让我查看orderService的getById方法实现：
Read file: backend/src/services/orderService.js

基于代码分析，我可以详细回答你的问题。这个 `/api/order/{orderId}/payment-summary` API 返回的数据来源如下：

## 数据来源分析

### 1. **order（订单数据）** 
**主要数据表：`orders` 表**
通过 `orderModel.findById()` 方法获取，涉及以下表的 JOIN 查询：

```sql
FROM orders o
LEFT JOIN company c ON o.company_id = c.id           -- 公司信息
LEFT JOIN store s ON o.store_id = s.id               -- 门店信息  
LEFT JOIN rooms r ON o.room_id = r.id                -- 房间信息
LEFT JOIN scripts sc ON o.script_id = sc.id          -- 剧本信息
LEFT JOIN escape_rooms er ON o.escape_room_id = er.id -- 密室信息
LEFT JOIN users gu ON o.game_host_id = gu.id         -- 主持人信息
LEFT JOIN users nu ON o.npc_id = nu.id               -- NPC信息
LEFT JOIN users pu ON o.pic_id = pu.id               -- PIC信息
LEFT JOIN users ppu ON o.pic_payment_id = ppu.id     -- 付款PIC信息
LEFT JOIN users cu ON o.created_by = cu.id           -- 创建者信息
LEFT JOIN users uu ON o.updated_by = uu.id           -- 更新者信息
LEFT JOIN order_images oi ON o.id = oi.order_id      -- 订单图片
```

### 2. **players（玩家数据）**
**数据来源：代码生成（非数据库表）**
通过 `generateSinglePaymentPlayers()` 方法生成虚拟玩家记录：

```354:2:backend/src/services/orderService.js
// 🆕 为单笔支付订单生成基础玩家记录（用于显示）
generateSinglePaymentPlayers(order) {
  const players = [];
  const playerCount = order.player_count || 0;
  const unitPrice = parseFloat(order.unit_price || order.total_amount || 0) / playerCount;
  
  for (let i = 1; i <= playerCount; i++) {
    players.push({
      id: `single_player_${i}`,
      player_name: `玩家 ${i}`,
      // ... 其他字段基于订单信息计算
    });
  }
  return players;
}
```

### 3. **payments（支付记录）**
**数据来源：代码生成（非数据库表）**
通过 `generateSinglePaymentRecord()` 方法生成虚拟支付记录：

```354:26:backend/src/services/orderService.js
// 🆕 为单笔支付订单生成基础支付记录（用于显示）
generateSinglePaymentRecord(order) {
  return [{
    id: 'single_payment',
    payer_name: order.customer_name || '客户',
    payment_amount: parseFloat(order.total_amount || 0),
    // ... 其他字段基于订单信息
  }];
}
```

### 4. **paymentStats（支付统计）**
**数据来源：基于 `orders` 表字段计算**
直接从订单数据计算得出：

```354:3:backend/src/services/orderService.js
const stats = {
  total_players: order.player_count || 0,
  paid_players: order.payment_status === 'FULL' ? (order.player_count || 0) : 0,
  total_final_amount: parseFloat(order.total_amount || 0),
  total_original_amount: parseFloat(order.original_price || order.total_amount || 0),
  total_discount_amount: parseFloat(order.discount_amount || 0),
  // ... 其他统计字段
};
```

## 重要说明

**对于单笔支付订单（`enable_multi_payment: false`）：**
- ✅ **订单基本信息** 来自数据库多表查询
- ❌ **玩家数据** 不来自 `order_players` 表，而是代码生成
- ❌ **支付记录** 不来自 `order_payments` 表，而是代码生成  
- ✅ **统计信息** 基于订单表字段计算

**如果是多笔支付订单（`enable_multi_payment: true`）：**
- 则会实际查询 `order_players` 和 `order_payments` 表获取真实数据

这种设计是为了向后兼容传统的单笔支付订单，同时支持新的多笔支付功能。