# 支付逻辑增强功能文档

## 概述
根据用户故事需求，对订单确认环节的支付逻辑进行了重大改进，支持更灵活的支付方式和金额计算。

## 用户故事
> 用户订单确认环节可能存在一次性就把订单确认了把钱付完整，也有可能下单的时候支付了部分款项，针对支付了部分那么在后续客户到现场会再次剩余的钱

## 核心改进

### 1. 支付逻辑重构
- **原逻辑**: 总金额由用户手动输入
- **新逻辑**: 总金额 = 人数 × 单价（自动计算）

### 2. 新增字段
- **单价 (unit_price)**: 剧本或密室的单价
- **预付金额 (prepaid_amount)**: 用户实际支付的金额
- **剩余应付金额 (remaining_amount)**: 总金额 - 预付金额
- **订单状态 (status)**: 支持待确认/已确认状态选择

### 3. 支付状态扩展
- **FULL (已全付)**: 预付金额 = 总金额，剩余金额 = 0
- **DP (定金)**: 预付金额 < 总金额，剩余金额 = 总金额 - 预付金额
- **Not Yet (未付)**: 预付金额 = 0，剩余金额 = 总金额

## 前端实现

### OrderPaymentConfirm.vue 改进

#### 1. 新增订单状态卡片
```vue
<!-- 订单状态卡片 -->
<div class="form-card">
  <div class="compact-header">
    <CheckCircleOutlined class="header-icon" />
    <span class="header-title">订单状态</span>
  </div>
  <div class="form-grid">
    <div class="form-item">
      <label class="required">订单状态</label>
      <a-select v-model:value="formData.status">
        <a-select-option value="pending">待确认</a-select-option>
        <a-select-option value="confirmed">已确认</a-select-option>
      </a-select>
    </div>
  </div>
</div>
```

#### 2. 支付信息重构
```vue
<!-- 费用计算区域 -->
<div class="form-grid">
  <!-- 单价（只读，来自项目价格） -->
  <div class="form-item">
    <label>单价</label>
    <a-input-number 
      v-model:value="formData.unit_price"
      readonly
      class="calculated-field"
    />
  </div>
  
  <!-- 总金额（自动计算：人数 × 单价） -->
  <div class="form-item">
    <label>总金额</label>
    <a-input-number 
      v-model:value="formData.total_amount"
      readonly
      class="calculated-field"
    />
    <small class="calculation-note">
      自动计算：{{ formData.player_count }} 人 × Rp {{ formatPrice(formData.unit_price) }}
    </small>
  </div>
  
  <!-- 预付金额（定金支付时显示） -->
  <div v-if="formData.payment_status === 'DP'" class="form-item">
    <label class="required">预付金额</label>
    <a-input-number 
      v-model:value="formData.prepaid_amount"
      :max="formData.total_amount"
      @change="calculateRemainingAmount"
    />
  </div>
  
  <!-- 剩余应付金额（自动计算） -->
  <div v-if="formData.payment_status === 'DP'" class="form-item">
    <label>剩余应付金额</label>
    <a-input-number 
      v-model:value="formData.remaining_amount"
      readonly
      class="calculated-field"
    />
    <small class="calculation-note">
      自动计算：Rp {{ formatPrice(formData.total_amount) }} - Rp {{ formatPrice(formData.prepaid_amount) }}
    </small>
  </div>
</div>
```

#### 3. 计算逻辑实现
```javascript
// 计算总金额
const calculateAmounts = () => {
  const playerCount = formData.player_count || 0
  const unitPrice = formData.unit_price || 0
  formData.total_amount = playerCount * unitPrice
  
  if (formData.payment_status === 'DP') {
    calculateRemainingAmount()
  }
}

// 计算剩余应付金额
const calculateRemainingAmount = () => {
  const totalAmount = formData.total_amount || 0
  const prepaidAmount = formData.prepaid_amount || 0
  formData.remaining_amount = Math.max(0, totalAmount - prepaidAmount)
}

// 处理支付状态变更
const handlePaymentStatusChange = () => {
  if (formData.payment_status === 'FULL') {
    formData.prepaid_amount = formData.total_amount
    formData.remaining_amount = 0
  } else if (formData.payment_status === 'Not Yet') {
    formData.prepaid_amount = 0
    formData.remaining_amount = formData.total_amount
  } else if (formData.payment_status === 'DP') {
    formData.prepaid_amount = 0
    formData.remaining_amount = formData.total_amount
  }
}
```

#### 4. 响应式计算
```javascript
// 监听人数变化，自动重新计算金额
watch(() => formData.player_count, () => {
  if (formData.free_pay === 'Pay') {
    calculateAmounts()
  }
})
```

### 样式增强
```css
/* 计算字段样式 */
.calculated-field {
  background-color: #f5f5f5 !important;
  cursor: not-allowed !important;
}

.calculation-note {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
  font-style: italic;
}
```

## 后端支持

### API 增强
在 `order.js` 中新增支付相关API：
```javascript
// 更新订单支付信息
updatePayment(id, data) {
  return request({
    url: `/api/order/${id}/payment`,
    method: 'put',
    data
  })
}
```

### 数据库字段
新增的数据库字段（通过之前的迁移脚本已添加）：
- `unit_price` DECIMAL(15,2) - 单价
- `prepaid_amount` DECIMAL(15,2) - 预付金额  
- `remaining_amount` DECIMAL(15,2) - 剩余应付金额

## 业务流程

### 1. 订单创建流程
```
1. 用户选择项目和人数
2. 系统自动设置单价（来自项目价格）
3. 系统自动计算总金额（人数 × 单价）
4. 用户选择支付状态：
   - 全额支付：预付 = 总金额，剩余 = 0
   - 定金支付：用户输入预付金额，系统计算剩余
   - 未付款：预付 = 0，剩余 = 总金额
5. 创建订单
```

### 2. 支付场景
```
场景1：一次性全额支付
- 客户预订时支付全款
- 到现场直接开始游戏

场景2：定金支付
- 客户预订时支付部分金额
- 到现场支付剩余金额后开始游戏

场景3：未付款预订
- 客户预订时不支付
- 到现场支付全款后开始游戏
```

## 数据示例

### 案例1：4人密室，单价10万
```json
{
  "player_count": 4,
  "unit_price": 100000,
  "total_amount": 400000,
  "payment_status": "DP",
  "prepaid_amount": 150000,
  "remaining_amount": 250000
}
```

### 案例2：2人剧本杀，单价5万
```json
{
  "player_count": 2,
  "unit_price": 50000,
  "total_amount": 100000,
  "payment_status": "FULL",
  "prepaid_amount": 100000,
  "remaining_amount": 0
}
```

## 优势

### 1. 业务灵活性
- 支持多种支付方式
- 适应不同客户需求
- 便于现场收款管理

### 2. 计算准确性
- 自动计算，减少人为错误
- 实时更新，数据一致性
- 清晰的金额明细

### 3. 用户体验
- 直观的界面设计
- 自动计算提示
- 清晰的状态区分

### 4. 数据完整性
- 完整的支付记录
- 准确的财务数据
- 便于后续分析

## 测试验证

已通过以下测试场景：
- ✅ 全额支付订单创建
- ✅ 定金支付订单创建  
- ✅ 未付款订单创建
- ✅ 人数变化自动重算
- ✅ 支付状态切换
- ✅ 数据库字段存储

## 后续扩展

### 建议功能
1. **支付记录**: 记录每次支付的详细信息
2. **退款处理**: 支持部分退款和全额退款
3. **优惠券**: 支持优惠券抵扣
4. **会员折扣**: 支持会员价格体系
5. **分期支付**: 支持多次分期付款

---

*更新时间: 2024-12-21*
*版本: v1.0* 