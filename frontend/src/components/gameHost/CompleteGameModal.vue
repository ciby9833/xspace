<template>
  <a-modal
    v-model:visible="visible"
    title="完成游戏"
    width="600px"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <div v-if="order" class="complete-game-content">
      <!-- 订单信息摘要 -->
      <a-card class="order-summary" size="small">
        <div class="summary-content">
          <div class="customer-info">
            <h4>{{ order.customer_name }}</h4>
            <p>{{ order.customer_phone }}</p>
          </div>
          <div class="game-info">
            <a-tag :color="order.order_type === '剧本杀' ? 'blue' : 'orange'">
              {{ order.order_type }}
            </a-tag>
            <span class="game-name">
              {{ order.order_type === '剧本杀' ? 
                  (order.current_script_name || order.script_name) : 
                  (order.current_escape_room_name || order.escape_room_name) 
              }}
            </span>
          </div>
          <div class="time-info">
            <p><ClockCircleOutlined /> {{ formatTime(order.start_time) }} - {{ formatTime(order.end_time) }}</p>
            <p><EnvironmentOutlined /> {{ order.room_name }}</p>
            <p><UserOutlined /> {{ order.player_count }}人
              <span v-if="order.support_player_count > 0">
                (+{{ order.support_player_count }}补位)
              </span>
            </p>
          </div>
        </div>
      </a-card>

      <!-- 完成确认 -->
      <div class="complete-confirmation">
                 <a-alert
           message="确认完成游戏"
           description="请确认游戏已经完成，完成后订单状态将变更为已完成，无法撤销。"
           type="info"
           show-icon
           style="margin-bottom: 24px;"
         />
      </div>

      <!-- 完成备注 -->
      <a-form
        ref="formRef"
        :model="form"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item label="Game Host备注" name="game_host_notes">
          <a-textarea
            v-model:value="form.game_host_notes"
            :rows="4"
            placeholder="输入游戏完成备注，如游戏体验、客户反馈等..."
            :maxlength="1000"
            show-count
          />
          <div class="notes-tips">
            <small style="color: #666;">
              建议记录：游戏完成情况、客户满意度、特殊情况等
            </small>
          </div>
        </a-form-item>
      </a-form>

      <!-- 完成时间显示 -->
      <div class="completion-time">
        <p><strong>完成时间：</strong>{{ formatDateTime(new Date()) }}</p>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined
} from '@ant-design/icons-vue'
import * as gameHostAPI from '@/api/gameHost'

const props = defineProps({
  visible: Boolean,
  order: Object
})

const emit = defineEmits(['update:visible', 'success'])

// 响应式数据
const loading = ref(false)
const formRef = ref()

// 表单数据
const form = reactive({
  game_host_notes: ''
})

// 表单验证规则
const rules = {
  game_host_notes: [
    { max: 1000, message: '备注不能超过1000个字符' }
  ]
}

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 监听订单变化，初始化表单
watch(() => props.order, (newOrder) => {
  if (newOrder) {
    form.game_host_notes = newOrder.game_host_notes || ''
  }
}, { immediate: true })

// 方法
const formatTime = (time) => {
  return time ? dayjs(time, 'HH:mm:ss').format('HH:mm') : ''
}

const formatDateTime = (datetime) => {
  return dayjs(datetime).format('YYYY-MM-DD HH:mm:ss')
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    loading.value = true
    
    const completionData = {
      game_host_notes: form.game_host_notes
    }
    
    await gameHostAPI.completeGame(props.order.id, completionData)
    
    message.success('游戏完成成功')
    emit('success')
    visible.value = false
  } catch (error) {
    if (error.errorFields) {
      // 表单验证错误
      return
    }
    console.error('完成游戏失败:', error)
    message.error(error.response?.data?.error || '完成游戏失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  visible.value = false
}

// 清理数据
watch(visible, (newVisible) => {
  if (!newVisible) {
    // 重置表单
    formRef.value?.resetFields()
    form.game_host_notes = ''
  }
})
</script>

<style scoped>
.complete-game-content {
  padding: 0;
}

.order-summary {
  margin-bottom: 24px;
  border: 1px solid #52c41a;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.customer-info h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.customer-info p {
  margin: 4px 0 0 0;
  color: #666;
  font-size: 14px;
}

.game-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.game-name {
  font-weight: 500;
  font-size: 14px;
}

.time-info p {
  margin: 2px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
}

.complete-confirmation {
  margin-bottom: 24px;
}

.notes-tips {
  margin-top: 8px;
}

.completion-time {
  margin-top: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  border-left: 4px solid #52c41a;
}

.completion-time p {
  margin: 0;
  color: #333;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .summary-content {
    gap: 8px;
  }
  
  .game-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style> 