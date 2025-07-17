<template>
  <a-modal
    v-model:visible="visible"
    title="订单详情"
    width="800px"
    :footer="null"
    @cancel="handleCancel"
  >
    <div v-if="order" class="order-detail-content">
      <!-- 订单基本信息 -->
      <a-card class="detail-section" size="small">
        <template #title>
          <span class="section-title">订单信息</span>
        </template>
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="订单ID">
            {{ order.id }}
          </a-descriptions-item>
          <a-descriptions-item label="订单类型">
            <a-tag :color="order.order_type === '剧本杀' ? 'blue' : 'green'">
              {{ order.order_type }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="订单日期">
            {{ formatDate(order.order_date) }}
          </a-descriptions-item>
          <a-descriptions-item label="星期">
            {{ order.weekday }}
          </a-descriptions-item>
          <a-descriptions-item label="预约时间">
            {{ formatTime(order.start_time) }} - {{ formatTime(order.end_time) }}
          </a-descriptions-item>
          <a-descriptions-item label="时长">
            {{ order.duration }}分钟
          </a-descriptions-item>
          <a-descriptions-item label="订单状态">
            <a-tag :color="getStatusColor(order.status)">
              {{ getStatusText(order.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="实际开始时间" v-if="order.actual_start_time">
            {{ formatDateTime(order.actual_start_time) }}
          </a-descriptions-item>
          <a-descriptions-item label="实际结束时间" v-if="order.actual_end_time">
            {{ formatDateTime(order.actual_end_time) }}
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 客户信息 -->
      <a-card class="detail-section" size="small">
        <template #title>
          <span class="section-title">客户信息</span>
        </template>
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="客户姓名">
            {{ order.customer_name }}
          </a-descriptions-item>
          <a-descriptions-item label="客户电话">
            {{ order.customer_phone }}
          </a-descriptions-item>
          <a-descriptions-item label="玩家人数">
            {{ order.player_count }}人
          </a-descriptions-item>
          <a-descriptions-item label="补位人数">
            {{ order.support_player_count }}人
          </a-descriptions-item>
          <a-descriptions-item label="支持语言">
            {{ getDisplayLanguages(order) }}
          </a-descriptions-item>
          <a-descriptions-item label="内部补位">
            <a-tag :color="order.internal_support ? 'green' : 'default'">
              {{ order.internal_support ? '是' : '否' }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 游戏内容信息 -->
      <a-card class="detail-section" size="small">
        <template #title>
          <span class="section-title">游戏内容</span>
        </template>
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="房间">
            {{ order.room_name || '未分配' }}
          </a-descriptions-item>
          <a-descriptions-item label="剧本" v-if="order.order_type === '剧本杀'">
            {{ order.current_script_name || order.script_name || '未选择' }}
          </a-descriptions-item>
          <a-descriptions-item label="密室" v-if="order.order_type === '密室'">
            {{ order.current_escape_room_name || order.escape_room_name || '未选择' }}
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 服务选项 (密室专用) -->
      <a-card v-if="order.order_type === '密室'" class="detail-section" size="small">
        <template #title>
          <span class="section-title">服务选项</span>
        </template>
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="包含拍照">
            <a-tag :color="order.include_photos ? 'green' : 'default'">
              {{ order.include_photos ? '是' : '否' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="包含CCTV">
            <a-tag :color="order.include_cctv ? 'green' : 'default'">
              {{ order.include_cctv ? '是' : '否' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="团体预订">
            <a-tag :color="order.is_group_booking ? 'blue' : 'default'">
              {{ order.is_group_booking ? '是' : '否' }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 门店信息 -->
      <a-card class="detail-section" size="small">
        <template #title>
          <span class="section-title">门店信息</span>
        </template>
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="门店名称">
            {{ order.store_name }}
          </a-descriptions-item>
          <a-descriptions-item label="Game Host">
            {{ order.game_host_name }}
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 备注信息 -->
      <a-card class="detail-section" size="small" v-if="order.notes || order.game_host_notes">
        <template #title>
          <span class="section-title">备注信息</span>
        </template>
        <a-descriptions :column="1" bordered size="small">
          <a-descriptions-item label="订单备注" v-if="order.notes">
            {{ order.notes }}
          </a-descriptions-item>
          <a-descriptions-item label="Game Host备注" v-if="order.game_host_notes">
            {{ order.game_host_notes }}
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <!-- 订单图片 -->
      <a-card class="detail-section" size="small" v-if="order.images && order.images.length > 0">
        <template #title>
          <span class="section-title">订单图片</span>
        </template>
        <div class="order-images">
          <div 
            v-for="image in order.images" 
            :key="image.id"
            class="image-item"
            @click="previewImage(image)"
          >
            <img 
              :src="image.image_url" 
              :alt="image.image_name"
              class="thumbnail"
            />
            <div class="image-info">
              <span class="image-name">{{ image.image_name }}</span>
              <span class="image-type">{{ image.image_type }}</span>
            </div>
          </div>
        </div>
      </a-card>

      <!-- 时间信息 -->
      <a-card class="detail-section" size="small">
        <template #title>
          <span class="section-title">时间记录</span>
        </template>
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="创建时间">
            {{ formatDateTime(order.created_at) }}
          </a-descriptions-item>
          <a-descriptions-item label="更新时间">
            {{ formatDateTime(order.updated_at) }}
          </a-descriptions-item>
        </a-descriptions>
      </a-card>
    </div>

    <!-- 图片预览模态框 -->
    <a-modal
      v-model:visible="previewVisible"
      :footer="null"
      width="80%"
      :style="{ maxWidth: '800px' }"
    >
      <img :src="previewImageUrl" style="width: 100%" />
    </a-modal>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  visible: Boolean,
  order: Object
})

const emit = defineEmits(['update:visible'])

// 响应式数据
const previewVisible = ref(false)
const previewImageUrl = ref('')

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 方法
const formatDate = (date) => {
  return date ? dayjs(date).format('YYYY-MM-DD') : ''
}

const formatTime = (time) => {
  return time ? dayjs(time, 'HH:mm:ss').format('HH:mm') : ''
}

const formatDateTime = (datetime) => {
  return datetime ? dayjs(datetime).format('YYYY-MM-DD HH:mm:ss') : ''
}

const getStatusColor = (status) => {
  const colors = {
    'pending': 'orange',
    'confirmed': 'blue',
    'in_progress': 'cyan',
    'completed': 'green',
    'cancelled': 'red'
  }
  return colors[status] || 'default'
}

const getStatusText = (status) => {
  const statusMap = {
    'pending': '待确认',
    'confirmed': '已确认',
    'in_progress': '进行中',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}

const getLanguageText = (language) => {
  const languageMap = {
    'CN': '中文',
    'EN': '英语',
    'IND': '印尼语'
  }
  return languageMap[language] || language
}

const getDisplayLanguages = (order) => {
  if (!order) return '未知'
  
  // 优先使用display_languages字段
  if (order.display_languages) {
    return order.display_languages
  }
  
  // 兼容旧数据
  const languages = []
  if (order.script_supported_languages) {
    const scriptLangs = Array.isArray(order.script_supported_languages) 
      ? order.script_supported_languages 
      : [order.script_supported_languages]
    languages.push(...scriptLangs.map(lang => getLanguageText(lang)))
  }
  if (order.escape_room_supported_languages) {
    const roomLangs = Array.isArray(order.escape_room_supported_languages) 
      ? order.escape_room_supported_languages 
      : [order.escape_room_supported_languages]
    languages.push(...roomLangs.map(lang => getLanguageText(lang)))
  }
  
  return languages.length > 0 ? languages.join(' / ') : '未知'
}

const previewImage = (image) => {
  previewImageUrl.value = image.image_url
  previewVisible.value = true
}

const handleCancel = () => {
  visible.value = false
}
</script>

<style scoped>
.order-detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 16px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-weight: 600;
  color: #333;
}

.order-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.image-item {
  cursor: pointer;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px;
  transition: all 0.3s ease;
}

.image-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.thumbnail {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 8px;
}

.image-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.image-name {
  font-size: 12px;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-type {
  font-size: 11px;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .order-images {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }
  
  .thumbnail {
    height: 60px;
  }
}
</style> 