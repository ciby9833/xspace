<template>
  <a-modal
    v-model:open="modalVisible"
    title="密室详情"
    width="1000px"
    :footer="null"
    centered
    @cancel="handleCancel"
  >
    <div v-if="escapeRoomData" class="escape-room-detail">
      <a-row :gutter="24">
        <!-- 左栏：基本信息 -->
        <a-col :span="12">
          <div class="detail-section">
            <h3 class="section-title">基本信息</h3>
            
            <div class="escape-room-header">
              <!-- 多图片展示区域 -->
              <div class="escape-room-images" v-if="coverImages.length > 0">
                <div class="main-image" @click="showImagePreview(coverImages, currentImageIndex)">
                  <img 
                    :src="getImageUrl(currentImage)"
                    :alt="escapeRoomData.name"
                    @error="handleImageError"
                  />
                  <!-- 预览提示 -->
                  <div class="image-preview-hint">
                    <EyeOutlined />
                    点击放大
                  </div>
                </div>
                <div class="image-thumbnails" v-if="coverImages.length > 1">
                  <div 
                    v-for="(image, index) in coverImages"
                    :key="index"
                    class="thumbnail"
                    :class="{ active: currentImageIndex === index }"
                    @click="currentImageIndex = index"
                  >
                    <img 
                      :src="getImageUrl(image)"
                      @error="handleImageError"
                    />
                  </div>
                </div>
              </div>
              
              <!-- 没有图片时的占位 -->
              <div class="no-image" v-else>
                <div class="no-image-placeholder">
                  <FileImageOutlined />
                  <span>暂无图片</span>
                </div>
              </div>

              <div class="escape-room-basic">
                <h2 class="escape-room-name">{{ escapeRoomData.name }}</h2>
                <div class="escape-room-meta">
                  <a-tag :color="getHorrorLevelColor(escapeRoomData.horror_level)">
                    {{ escapeRoomData.horror_level }}
                  </a-tag>
                  <a-tag :color="escapeRoomData.is_active ? 'green' : 'red'">
                    {{ escapeRoomData.is_active ? '启用' : '禁用' }}
                  </a-tag>
                </div>
              </div>
            </div>

            <a-descriptions :column="1" size="small" class="detail-descriptions">
              <a-descriptions-item label="游戏人数">
                {{ escapeRoomData.min_players }}-{{ escapeRoomData.max_players }}人
              </a-descriptions-item>
              <a-descriptions-item label="游戏时长">
                {{ escapeRoomData.duration }}分钟
              </a-descriptions-item>
              <a-descriptions-item label="NPC数量">
                {{ escapeRoomData.npc_count || 0 }}个
              </a-descriptions-item>
              <a-descriptions-item label="建议价格">
                <span v-if="escapeRoomData.price" class="price">Rp {{ formatPrice(escapeRoomData.price) }}</span>
                <span v-else class="no-price">未设置</span>
              </a-descriptions-item>
              <a-descriptions-item label="创建时间">
                {{ formatDate(escapeRoomData.created_at) }}
              </a-descriptions-item>
              <a-descriptions-item label="更新时间">
                {{ formatDate(escapeRoomData.updated_at) }}
              </a-descriptions-item>
            </a-descriptions>

            <!-- NPC角色 -->
            <div v-if="npcRoles.length > 0" class="tags-section">
              <h4>NPC角色</h4>
              <div class="tags-container">
                <a-tag 
                  v-for="role in npcRoles" 
                  :key="role"
                  color="purple"
                >
                  {{ role }}
                </a-tag>
              </div>
            </div>
          </div>
        </a-col>

        <!-- 右栏：详细信息 -->
        <a-col :span="12">
          <div class="detail-section">
            <h3 class="section-title">详细信息</h3>
            
            <!-- 密室简介 -->
            <div v-if="escapeRoomData.description" class="content-block">
              <h4>密室简介</h4>
              <div class="content-text">{{ escapeRoomData.description }}</div>
            </div>

            <!-- 密室道具 -->
            <div v-if="escapeRoomData.props" class="content-block">
              <h4>密室道具</h4>
              <div class="content-text">{{ escapeRoomData.props }}</div>
            </div>

            <!-- 门店配置统计 -->
            <div class="content-block">
              <h4>上架门店</h4>
              <div class="store-stats">
                <a-statistic
                  title="已上架门店"
                  :value="storeConfigs.length"
                  suffix="个"
                  :value-style="{ color: '#1890ff' }"
                />
              </div>
              
              <!-- 门店配置详情 -->
              <div v-if="storeConfigs.length > 0" class="store-configs">
                <a-list
                  size="small"
                  :data-source="storeConfigs"
                  :split="false"
                >
                  <template #renderItem="{ item }">
                    <a-list-item>
                      <div class="store-config-item">
                        <div class="store-info">
                          <div class="store-main-info">
                            <span class="store-name">{{ item.store_name }}</span>
                            <a-tag 
                              :color="item.is_available ? 'green' : 'red'"
                              size="small"
                            >
                              {{ item.is_available ? '启用' : '禁用' }}
                            </a-tag>
                          </div>
                          <div v-if="item.store_address" class="store-address">
                            {{ item.store_address }}
                          </div>
                        </div>
                        <div class="store-price">
                          <span v-if="item.store_price" class="price">Rp {{ formatPrice(item.store_price) }}</span>
                          <span v-else class="no-price">使用默认价格</span>
                        </div>
                      </div>
                    </a-list-item>
                  </template>
                </a-list>
              </div>
              
              <!-- 无门店配置时的提示 -->
              <div v-else class="no-stores">
                <a-empty 
                  description="暂未在任何门店上架"
                  :image="false"
                  style="margin: 20px 0;"
                />
              </div>
            </div>
          </div>
        </a-col>
      </a-row>
    </div>

    <!-- 图片预览弹窗 -->
    <a-modal
      v-model:open="imagePreviewVisible"
      title="图片预览"
      width="800px"
      :footer="null"
      centered
    >
      <div class="image-preview-container">
        <div class="main-preview">
          <img 
            :src="getImageUrl(previewImages[currentPreviewIndex])"
            :alt="`预览图片 ${currentPreviewIndex + 1}`"
            @error="handleImageError"
          />
        </div>
        <div class="preview-thumbnails" v-if="previewImages.length > 1">
          <div 
            v-for="(image, index) in previewImages"
            :key="index"
            class="preview-thumbnail"
            :class="{ active: currentPreviewIndex === index }"
            @click="currentPreviewIndex = index"
          >
            <img 
              :src="getImageUrl(image)"
              @error="handleImageError"
            />
          </div>
        </div>
        <div class="preview-info">
          {{ currentPreviewIndex + 1 }} / {{ previewImages.length }}
        </div>
      </div>
    </a-modal>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { EyeOutlined, FileImageOutlined } from '@ant-design/icons-vue'
import { getEscapeRoomStoreConfigs, getCompanyStores } from '@/api/escapeRoom'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  escapeRoomData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible'])

// 当前显示的图片索引
const currentImageIndex = ref(0)

// 图片预览状态
const imagePreviewVisible = ref(false)
const previewImages = ref([])
const currentPreviewIndex = ref(0)

// 门店配置数据
const storeConfigsData = ref([])
const loadingStoreConfigs = ref(false)

// 计算属性
const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 处理图片数组
const coverImages = computed(() => {
  if (!props.escapeRoomData?.cover_images) return []
  
  if (Array.isArray(props.escapeRoomData.cover_images)) {
    return props.escapeRoomData.cover_images
  }
  
  try {
    return JSON.parse(props.escapeRoomData.cover_images)
  } catch (e) {
    return []
  }
})

// 当前显示的图片
const currentImage = computed(() => {
  if (coverImages.value.length === 0) return ''
  return coverImages.value[currentImageIndex.value] || coverImages.value[0]
})

const npcRoles = computed(() => {
  if (!props.escapeRoomData?.npc_roles) return []
  
  if (Array.isArray(props.escapeRoomData.npc_roles)) {
    return props.escapeRoomData.npc_roles
  }
  
  try {
    return JSON.parse(props.escapeRoomData.npc_roles)
  } catch (e) {
    return []
  }
})

// 处理门店配置数据 - 使用主动获取的数据
const storeConfigs = computed(() => {
  return storeConfigsData.value.filter(config => config !== null)
})

// 获取门店配置数据
const fetchStoreConfigs = async (escapeRoomId) => {
  if (!escapeRoomId) return
  
  try {
    loadingStoreConfigs.value = true
    const response = await getEscapeRoomStoreConfigs(escapeRoomId)
    const configs = response.data || []
    
    // 转换数据格式，匹配显示需求
    storeConfigsData.value = configs.map(config => ({
      store_id: config.store_id,
      store_name: config.store_name,
      store_address: config.store_address,
      store_price: config.store_price,
      is_available: config.is_available !== false
    }))
    
    console.log('获取密室门店配置成功:', storeConfigsData.value)
  } catch (error) {
    console.error('获取密室门店配置失败:', error)
    storeConfigsData.value = []
  } finally {
    loadingStoreConfigs.value = false
  }
}

// 监听弹窗显示和密室数据变化
watch([() => props.visible, () => props.escapeRoomData], ([visible, escapeRoomData]) => {
  if (visible && escapeRoomData?.id) {
    fetchStoreConfigs(escapeRoomData.id)
  }
}, { immediate: true })

// 处理取消
const handleCancel = () => {
  currentImageIndex.value = 0 // 重置图片索引
  storeConfigsData.value = [] // 重置门店配置数据
  modalVisible.value = false
}

// 获取图片URL
const getImageUrl = (imageUrl) => {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http')) return imageUrl
  return `http://localhost:3000${imageUrl}`
}

// 工具函数
const getHorrorLevelColor = (level) => {
  const colors = {
    '非恐': 'green',
    '微恐': 'blue', 
    '中恐': 'orange',
    '重恐': 'red'
  }
  return colors[level] || 'default'
}

const formatPrice = (price) => {
  if (!price) return '0'
  return new Intl.NumberFormat('id-ID').format(price)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

const handleImageError = (e) => {
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMS4zMzMzIDIxLjMzMzNIMTZWNDIuNjY2N0g0OFYyMS4zMzMzSDQyLjY2NjdMMzggMTZIMjZMMjEuMzMzMyAyMS4zMzMzWiIgZmlsbD0iI0NDQ0NDQyIvPgo8cGF0aCBkPSJNMzIgMzcuMzMzM0MzNS42ODEzIDM3LjMzMzMgMzguNjY2NyAzNC4zNDc5IDM4LjY2NjcgMzFDMzguNjY2NyAyNy42NTIxIDM1LjY4MTMgMjQuNjY2NyAzMiAyNC42NjY3QzI4LjMxODcgMjQuNjY2NyAyNS4zMzMzIDI3LjY1MjEgMjUuMzMzMyAzMUMyNS4zMzMzIDM0LjM0NzkgMjguMzE4NyAzNy4zMzMzIDMyIDM3LjMzMzNaIiBmaWxsPSIjQ0NDQ0NDIi8+Cjwvc3ZnPgo='
}

// 显示图片预览
const showImagePreview = (images, index) => {
  if (!images || images.length === 0) return
  
  previewImages.value = images
  currentPreviewIndex.value = index
  imagePreviewVisible.value = true
}
</script>

<style scoped>
.escape-room-detail {
  padding: 16px 0;
}

.detail-section {
  padding: 0 12px;
}

.section-title {
  margin: 0 0 20px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.escape-room-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

/* 多图片展示样式 */
.escape-room-images {
  width: 200px;
  flex-shrink: 0;
}

.main-image {
  width: 200px;
  height: 250px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #d9d9d9;
  margin-bottom: 8px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
}

.main-image:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.main-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-preview-hint {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  font-size: 12px;
  gap: 4px;
}

.main-image:hover .image-preview-hint {
  opacity: 1;
}

.image-thumbnails {
  display: flex;
  gap: 4px;
  overflow-x: auto;
}

.thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.3s;
}

.thumbnail:hover {
  border-color: #1890ff;
}

.thumbnail.active {
  border-color: #1890ff;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  width: 200px;
  height: 250px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.no-image-placeholder {
  text-align: center;
  color: #999;
}

.no-image-placeholder .anticon {
  font-size: 32px;
  margin-bottom: 8px;
  display: block;
}

.escape-room-basic {
  flex: 1;
}

.escape-room-name {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.escape-room-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-descriptions {
  margin-bottom: 24px;
}

.price {
  color: #1890ff;
  font-weight: 500;
}

.no-price {
  color: #999;
}

.tags-section {
  margin-bottom: 24px;
}

.tags-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.tags-container {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.content-block {
  margin-bottom: 24px;
}

.content-block h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.content-text {
  color: #333;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.store-stats {
  margin-bottom: 16px;
}

.store-configs {
  max-height: 200px;
  overflow-y: auto;
}

.store-config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.store-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.store-main-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.store-name {
  font-weight: 500;
  color: #333;
}

.store-address {
  font-size: 12px;
  color: #666;
  margin-left: 0;
}

.store-price {
  color: #1890ff;
  font-weight: 500;
  margin-left: 16px;
}

.store-price .price {
  color: #1890ff;
  font-weight: 500;
}

.no-stores {
  text-align: center;
  padding: 20px 0;
}

/* 图片预览弹窗样式 */
.image-preview-container {
  text-align: center;
}

.main-preview {
  margin-bottom: 16px;
}

.main-preview img {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-thumbnails {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding: 8px 0;
}

.preview-thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.3s;
}

.preview-thumbnail:hover {
  border-color: #1890ff;
}

.preview-thumbnail.active {
  border-color: #1890ff;
}

.preview-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-info {
  color: #666;
  font-size: 14px;
}

:deep(.ant-descriptions-item-label) {
  color: #666;
  font-weight: 500;
}

:deep(.ant-list-item) {
  padding: 8px 0;
}

/* 滚动条美化 */
.escape-room-detail {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.escape-room-detail::-webkit-scrollbar {
  width: 6px;
}

.escape-room-detail::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.escape-room-detail::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.escape-room-detail::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style> 