<template>
  <a-modal
    v-model:open="modalVisible"
    title="房间图片管理"
    :confirm-loading="loading"
    @ok="handleSave"
    @cancel="handleCancel"
    width="900px"
    :mask-closable="false"
  >
    <div class="room-image-management">
      <!-- 操作说明 -->
      <a-alert
        message="图片管理说明"
        description="最多可上传15张图片，支持拖拽排序。第一张图片将作为主图显示。"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />

      <!-- 上传区域 -->
      <div class="upload-section">
        <a-upload-dragger
          v-model:file-list="fileList"
          name="images"
          multiple
          :before-upload="beforeUpload"
          :custom-request="customUpload"
          :show-upload-list="false"
          accept="image/*"
          :disabled="images.length >= 15"
        >
          <p class="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p class="ant-upload-hint">
            支持单个或批量上传，最多15张图片，每张不超过10MB
          </p>
        </a-upload-dragger>
      </div>

      <!-- 图片列表 -->
      <div class="image-list" v-if="images.length > 0">
        <h4>已上传图片 ({{ images.length }}/15)</h4>
        <div class="image-grid">
          <div
            v-for="(image, index) in images"
            :key="image.id || image.uid"
            class="image-item"
            :class="{ 'primary-image': index === 0 }"
          >
            <!-- 图片预览 -->
            <div class="image-preview">
              <img 
                :src="image.full_url || image.url || image.thumbUrl" 
                :alt="image.image_name || image.name"
                @click="showImagePreview(index)"
              />
              <div class="image-overlay">
                <a-tag v-if="index === 0" color="gold" size="small">主图</a-tag>
                <span class="image-order">{{ index + 1 }}</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="image-actions">
              <a-space>
                <a-button 
                  type="link" 
                  size="small"
                  @click="moveUp(index)"
                  :disabled="index === 0"
                >
                  <UpOutlined />
                </a-button>
                <a-button 
                  type="link" 
                  size="small"
                  @click="moveDown(index)"
                  :disabled="index === images.length - 1"
                >
                  <DownOutlined />
                </a-button>
                <a-popconfirm
                  title="确定要删除这张图片吗？"
                  @confirm="removeImage(index)"
                >
                  <a-button type="link" size="small" danger>
                    <DeleteOutlined />
                  </a-button>
                </a-popconfirm>
              </a-space>
            </div>

            <!-- 上传进度 -->
            <div v-if="image.status === 'uploading'" class="upload-progress">
              <a-progress :percent="image.percent" size="small" />
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <a-empty description="暂无图片，请上传房间图片" />
      </div>

      <!-- 图片预览 -->
      <a-image-preview-group
        v-model:visible="previewVisible"
        :current="previewIndex"
        @change="handlePreviewChange"
      >
        <a-image
          v-for="image in images"
          :key="image.id || image.uid"
          :src="image.full_url || image.url || image.thumbUrl"
          style="display: none"
        />
      </a-image-preview-group>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  InboxOutlined,
  UpOutlined,
  DownOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
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

const emit = defineEmits(['update:visible', 'success'])

// 响应式数据
const loading = ref(false)
const images = ref([])
const fileList = ref([])
const previewVisible = ref(false)
const previewIndex = ref(0)
const hasChanges = ref(false)

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
    images.value = (response.data.images || []).sort((a, b) => a.sort_order - b.sort_order)
  } catch (error) {
    console.error('获取房间图片失败:', error)
    images.value = []
  }
}

const beforeUpload = (file) => {
  // 检查文件类型
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    message.error('只能上传图片文件!')
    return false
  }

  // 检查文件大小
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    message.error('图片大小不能超过10MB!')
    return false
  }

  // 检查数量限制
  if (images.value.length >= 15) {
    message.error('最多只能上传15张图片!')
    return false
  }

  return true
}

const customUpload = async ({ file, onProgress, onSuccess, onError }) => {
  try {
    // 创建FormData
    const formData = new FormData()
    formData.append('images', file)

    // 添加到图片列表（显示上传状态）
    const imageItem = {
      uid: file.uid,
      name: file.name,
      status: 'uploading',
      percent: 0,
      url: URL.createObjectURL(file)
    }
    images.value.push(imageItem)

    // 模拟上传进度
    const progressTimer = setInterval(() => {
      if (imageItem.percent < 90) {
        imageItem.percent += 10
        onProgress({ percent: imageItem.percent })
      }
    }, 100)

    // 上传图片
    const response = await roomAPI.uploadRoomImages(props.roomData.id, formData)
    
    clearInterval(progressTimer)
    
    // 更新图片信息
    const uploadedImages = response.data || []
    if (uploadedImages.length > 0) {
      const uploadedImage = uploadedImages[0]
      const index = images.value.findIndex(img => img.uid === file.uid)
      if (index !== -1) {
        images.value[index] = {
          ...uploadedImage,
          status: 'done',
          percent: 100
        }
      }
      hasChanges.value = true
      onSuccess(response, file)
      message.success('图片上传成功')
    }
  } catch (error) {
    const index = images.value.findIndex(img => img.uid === file.uid)
    if (index !== -1) {
      images.value[index].status = 'error'
    }
    onError(error, file)
    message.error('图片上传失败：' + (error.message || '未知错误'))
  }
}

const removeImage = async (index) => {
  const image = images.value[index]
  
  try {
    // 如果是已保存的图片，调用删除接口
    if (image.id) {
      await roomAPI.deleteRoomImage(props.roomData.id, image.id)
      message.success('图片删除成功')
    }
    
    // 从列表中移除
    images.value.splice(index, 1)
    hasChanges.value = true
  } catch (error) {
    message.error('删除图片失败：' + (error.message || '未知错误'))
  }
}

const moveUp = (index) => {
  if (index > 0) {
    const temp = images.value[index]
    images.value[index] = images.value[index - 1]
    images.value[index - 1] = temp
    hasChanges.value = true
  }
}

const moveDown = (index) => {
  if (index < images.value.length - 1) {
    const temp = images.value[index]
    images.value[index] = images.value[index + 1]
    images.value[index + 1] = temp
    hasChanges.value = true
  }
}

const showImagePreview = (index) => {
  previewIndex.value = index
  previewVisible.value = true
}

const handlePreviewChange = (current) => {
  previewIndex.value = current
}

const handleSave = async () => {
  if (!hasChanges.value) {
    modalVisible.value = false
    return
  }

  try {
    loading.value = true
    
    // 更新图片排序
    const imageOrders = images.value
      .filter(img => img.id) // 只处理已保存的图片
      .map((img, index) => ({
        id: img.id,
        sort_order: index,
        is_primary: index === 0
      }))

    if (imageOrders.length > 0) {
      await roomAPI.updateImageOrder(props.roomData.id, imageOrders)
      message.success('图片排序更新成功')
    }
    
    emit('success')
    modalVisible.value = false
  } catch (error) {
    message.error('保存失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  if (hasChanges.value) {
    // 可以添加确认对话框
  }
  modalVisible.value = false
  hasChanges.value = false
}

// 监听弹窗显示状态
watch(() => props.visible, (visible) => {
  if (visible && props.roomData) {
    loadRoomImages()
    hasChanges.value = false
  }
})
</script>

<style scoped>
.room-image-management {
  max-height: 70vh;
  overflow-y: auto;
}

.upload-section {
  margin-bottom: 24px;
}

.image-list h4 {
  margin-bottom: 16px;
  color: #262626;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.image-item {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
}

.image-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.primary-image {
  border-color: #faad14;
  box-shadow: 0 2px 8px rgba(250, 173, 20, 0.2);
}

.image-preview {
  position: relative;
  width: 100%;
  height: 150px;
  cursor: pointer;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
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

.image-actions {
  padding: 8px;
  background: #fafafa;
  text-align: center;
}

.upload-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

:deep(.ant-upload-drag) {
  border-color: #d9d9d9;
}

:deep(.ant-upload-drag:hover) {
  border-color: #1890ff;
}

:deep(.ant-upload-drag.ant-upload-disabled) {
  background: #f5f5f5;
  border-color: #d9d9d9;
  cursor: not-allowed;
}
</style> 