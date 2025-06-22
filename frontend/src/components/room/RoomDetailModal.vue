<template>
  <a-modal
    v-model:open="modalVisible"
    title="房间详情"
    :footer="null"
    width="800px"
  >
    <div v-if="roomData" class="room-detail">
      <!-- 基本信息 -->
      <a-descriptions title="基本信息" :column="2" bordered>
        <a-descriptions-item label="房间名称">
          {{ roomData.name }}
        </a-descriptions-item>
        <a-descriptions-item label="房间类型">
          <a-tag :color="getRoomTypeColor(roomData.room_type)">
            {{ roomData.room_type }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="房间容量">
          {{ roomData.capacity }}人
        </a-descriptions-item>
        <a-descriptions-item label="房间状态">
          <a-tag :color="getStatusColor(roomData.status)">
            {{ roomData.status }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="所属门店" :span="2">
          {{ roomData.store_name }}
          <a-tag v-if="roomData.company_name" size="small" color="blue" style="margin-left: 8px">
            {{ roomData.company_name }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="房间描述" :span="2">
          {{ roomData.description || '暂无描述' }}
        </a-descriptions-item>
        <a-descriptions-item label="设备信息" :span="2">
          {{ roomData.equipment || '暂无设备信息' }}
        </a-descriptions-item>
        <a-descriptions-item label="备注" :span="2">
          {{ roomData.notes || '暂无备注' }}
        </a-descriptions-item>
        <a-descriptions-item label="创建时间" :span="2">
          {{ formatDateTime(roomData.created_at) }}
        </a-descriptions-item>
      </a-descriptions>

      <!-- 房间图片 -->
      <div v-if="roomImages.length > 0" class="room-images">
        <h4>房间图片</h4>
        <div class="image-gallery">
          <div 
            v-for="(image, index) in roomImages" 
            :key="image.id"
            class="image-item"
            @click="showImagePreview(index)"
          >
            <img :src="image.full_url" :alt="image.image_name" />
            <div class="image-overlay">
              <a-tag v-if="image.is_primary" color="gold" size="small">主图</a-tag>
              <span class="image-order">{{ image.sort_order + 1 }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-images">
        <a-empty description="暂无房间图片" />
      </div>

      <!-- 图片预览 -->
      <a-image-preview-group
        v-model:visible="previewVisible"
        :current="previewIndex"
        @change="handlePreviewChange"
      >
        <a-image
          v-for="image in roomImages"
          :key="image.id"
          :src="image.full_url"
          style="display: none"
        />
      </a-image-preview-group>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import { roomAPI } from '@/api/room'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  roomData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible'])

// 响应式数据
const roomImages = ref([])
const previewVisible = ref(false)
const previewIndex = ref(0)

// 弹窗显示状态
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 方法
const loadRoomImages = async () => {
  if (!props.roomData?.id) return
  
  try {
    const response = await roomAPI.getRoomDetail(props.roomData.id)
    roomImages.value = response.data.images || []
  } catch (error) {
    console.error('获取房间图片失败:', error)
    roomImages.value = []
  }
}

const showImagePreview = (index) => {
  previewIndex.value = index
  previewVisible.value = true
}

const handlePreviewChange = (current) => {
  previewIndex.value = current
}

const getRoomTypeColor = (type) => {
  const colors = {
    '剧本杀': 'blue',
    '密室': 'green',
    '混合': 'orange'
  }
  return colors[type] || 'default'
}

const getStatusColor = (status) => {
  const colors = {
    '正常': 'green',
    '维护': 'orange',
    '关闭': 'red'
  }
  return colors[status] || 'default'
}

const formatDateTime = (dateTime) => {
  return dateTime ? dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss') : '-'
}

// 监听弹窗显示状态
watch(() => props.visible, (visible) => {
  if (visible && props.roomData) {
    loadRoomImages()
  }
})
</script>

<style scoped>
.room-detail {
  padding: 8px 0;
}

.room-images {
  margin-top: 24px;
}

.room-images h4 {
  margin-bottom: 12px;
  color: #262626;
}

.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.image-item {
  position: relative;
  width: 120px;
  height: 90px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #d9d9d9;
  transition: all 0.3s;
}

.image-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.image-order {
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.no-images {
  margin-top: 24px;
  text-align: center;
  padding: 40px 0;
}
</style> 