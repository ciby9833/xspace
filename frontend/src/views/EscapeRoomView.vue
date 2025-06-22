<template>
  <div class="escape-room-container">
    <div class="header-actions">
      <h2>密室管理</h2>
      <div class="actions">
        <a-button 
          type="primary" 
          @click="showCreateModal"
          v-if="hasCreatePermission"
        >
          <PlusOutlined />
          新增密室
        </a-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <a-card class="filter-card">
      <a-form layout="inline" :model="filterForm" @finish="handleFilter">
        <a-form-item label="恐怖等级">
          <a-select 
            v-model:value="filterForm.horror_level" 
            placeholder="选择恐怖等级" 
            style="width: 120px"
            allow-clear
          >
            <a-select-option value="非恐">非恐</a-select-option>
            <a-select-option value="微恐">微恐</a-select-option>
            <a-select-option value="中恐">中恐</a-select-option>
            <a-select-option value="重恐">重恐</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="状态">
          <a-select 
            v-model:value="filterForm.is_active" 
            placeholder="选择状态" 
            style="width: 100px"
            allow-clear
          >
            <a-select-option :value="true">启用</a-select-option>
            <a-select-option :value="false">禁用</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="最少人数">
          <a-input-number
            v-model:value="filterForm.min_players"
            placeholder="最少人数"
            :min="1"
            :max="20"
            style="width: 120px"
          />
        </a-form-item>

        <a-form-item label="价格范围">
          <a-input-number
            v-model:value="filterForm.min_price"
            placeholder="最低价格"
            :min="0"
            style="width: 120px"
          />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit">
            <SearchOutlined />
            查询
          </a-button>
          <a-button @click="resetFilter" style="margin-left: 8px">
            重置
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 数据表格 -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="escapeRoomList"
        :loading="loading"
        :row-selection="rowSelection"
        row-key="id"
        :scroll="{ x: 1600 }"
        :pagination="{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'escape_room_info'">
            <div class="escape-room-info">
              <!-- 多图片显示 -->
              <div class="escape-room-images">
                <div 
                  v-if="getEscapeRoomImages(record).length > 0"
                  class="image-gallery"
                  @click="showImagePreview(getEscapeRoomImages(record), 0)"
                >
                  <img 
                    :src="getImageUrl(getEscapeRoomImages(record)[0])" 
                    class="main-escape-room-image"
                    @error="handleImageError"
                  />
                  <!-- 图片数量标识 -->
                  <div 
                    v-if="getEscapeRoomImages(record).length > 1"
                    class="image-count"
                  >
                    +{{ getEscapeRoomImages(record).length - 1 }}
                  </div>
                  <!-- 预览提示 -->
                  <div class="image-preview-hint">
                    <EyeOutlined />
                    点击预览
                  </div>
                </div>
                <!-- 无图片占位 -->
                <div v-else class="no-image-placeholder">
                  <FileImageOutlined />
                </div>
              </div>
              
              <div class="escape-room-details">
                <div class="escape-room-name" @click="viewEscapeRoom(record)">
                  {{ record.name }}
                </div>
                <div class="escape-room-meta">
                  <a-tag :color="getHorrorLevelColor(record.horror_level)" size="small">
                    {{ record.horror_level }}
                  </a-tag>
                  <a-tag 
                    v-if="record.npc_count > 0"
                    color="blue" 
                    size="small"
                  >
                    {{ record.npc_count }}个NPC
                  </a-tag>
                </div>
                <!-- 显示描述预览 -->
                <div v-if="record.description" class="escape-room-description">
                  {{ record.description.substring(0, 50) }}{{ record.description.length > 50 ? '...' : '' }}
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'players'">
            <div class="player-info">
              <span class="player-count">{{ record.min_players }}-{{ record.max_players }}人</span>
            </div>
          </template>

          <template v-else-if="column.key === 'duration'">
            <span class="duration">{{ record.duration }}分钟</span>
          </template>

          <template v-else-if="column.key === 'price'">
            <span v-if="record.price" class="price">Rp {{ formatPrice(record.price) }}</span>
            <span v-else class="no-price">未设置</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.is_active ? 'green' : 'red'">
              {{ record.is_active ? '启用' : '禁用' }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'store_count'">
            <a-badge :count="record.store_count || 0" :number-style="{ backgroundColor: '#1890ff' }" />
          </template>

          <!-- NPC角色显示 -->
          <template v-else-if="column.key === 'npc_roles'">
            <div class="npc-roles-display">
              <a-tag 
                v-for="role in getNpcRoles(record).slice(0, 2)" 
                :key="role"
                color="purple"
                size="small"
              >
                {{ role }}
              </a-tag>
              <span 
                v-if="getNpcRoles(record).length > 2"
                class="more-roles"
              >
                +{{ getNpcRoles(record).length - 2 }}
              </span>
            </div>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" type="link" @click="viewEscapeRoom(record)">
                <EyeOutlined />
                查看
              </a-button>
              <a-button 
                size="small" 
                type="link" 
                @click="editEscapeRoom(record)"
                v-if="hasEditPermission"
              >
                <EditOutlined />
                编辑
              </a-button>
              <a-button 
                size="small" 
                type="link" 
                danger
                @click="deleteEscapeRoom(record)"
                v-if="hasDeletePermission"
              >
                <DeleteOutlined />
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>

      <!-- 批量操作 -->
      <div class="batch-actions" v-if="selectedRowKeys.length > 0">
        <a-space>
          <span class="selection-info">
            <CheckCircleOutlined />
            已选择 {{ selectedRowKeys.length }} 项
          </span>
          <a-button @click="batchEnable" type="primary" ghost>
            <CheckOutlined />
            批量启用
          </a-button>
          <a-button @click="batchDisable" type="primary" ghost>
            <StopOutlined />
            批量禁用
          </a-button>
          <a-button @click="batchDelete" danger type="primary" ghost>
            <DeleteOutlined />
            批量删除
          </a-button>
          <a-button @click="clearSelection" type="link">
            清空选择
          </a-button>
        </a-space>
      </div>
    </a-card>

    <!-- 创建/编辑弹窗 -->
    <EscapeRoomFormModal
      v-model:visible="formModalVisible"
      :escape-room-data="currentEscapeRoom"
      :is-edit="isEdit"
      @success="handleFormSuccess"
    />

    <!-- 查看详情弹窗 -->
    <EscapeRoomDetailModal
      v-model:visible="detailModalVisible"
      :escape-room-data="currentEscapeRoom"
    />

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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { 
  PlusOutlined, 
  SearchOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FileImageOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  StopOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { 
  getEscapeRoomList, 
  deleteEscapeRoom as deleteEscapeRoomAPI,
  batchOperation,
  getEscapeRoomDetail
} from '@/api/escapeRoom'
import EscapeRoomFormModal from '@/components/escapeRoom/EscapeRoomFormModal.vue'
import EscapeRoomDetailModal from '@/components/escapeRoom/EscapeRoomDetailModal.vue'

const authStore = useAuthStore()

// 权限检查
const hasCreatePermission = computed(() => 
  authStore.hasPermission('escape_room.manage')
)
const hasEditPermission = computed(() => 
  authStore.hasPermission('escape_room.manage')
)
const hasDeletePermission = computed(() => 
  authStore.hasPermission('escape_room.manage')
)

// 数据
const escapeRoomList = ref([])
const loading = ref(false)
const selectedRowKeys = ref([])

// 筛选表单
const filterForm = reactive({
  horror_level: undefined,
  is_active: undefined,
  min_players: undefined,
  min_price: undefined
})

// 弹窗状态
const formModalVisible = ref(false)
const detailModalVisible = ref(false)
const currentEscapeRoom = ref(null)
const isEdit = ref(false)

// 图片预览状态
const imagePreviewVisible = ref(false)
const previewImages = ref([])
const currentPreviewIndex = ref(0)

// 表格列定义
const columns = [
  {
    title: '密室信息',
    key: 'escape_room_info',
    width: 300,
    fixed: 'left'
  },
  {
    title: '游戏设置',
    key: 'players',
    width: 120,
    align: 'center'
  },
  {
    title: '时长',
    key: 'duration',
    width: 80,
    align: 'center'
  },
  {
    title: '价格',
    key: 'price',
    width: 100,
    align: 'center'
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    align: 'center'
  },
  {
    title: '门店',
    key: 'store_count',
    width: 80,
    align: 'center'
  },
  {
    title: 'NPC角色',
    key: 'npc_roles',
    width: 150
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    width: 180
  },
  {
    title: '操作',
    key: 'action',
    width: 150,
    fixed: 'right'
  }
]

// 行选择配置
const rowSelection = {
  selectedRowKeys,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
}

// 获取密室图片数组
const getEscapeRoomImages = (escapeRoom) => {
  if (!escapeRoom.cover_images) return []
  
  if (Array.isArray(escapeRoom.cover_images)) {
    return escapeRoom.cover_images
  }
  
  try {
    return JSON.parse(escapeRoom.cover_images)
  } catch (e) {
    return []
  }
}

// 获取NPC角色数组
const getNpcRoles = (escapeRoom) => {
  if (!escapeRoom.npc_roles) return []
  
  if (Array.isArray(escapeRoom.npc_roles)) {
    return escapeRoom.npc_roles
  }
  
  try {
    return JSON.parse(escapeRoom.npc_roles)
  } catch (e) {
    return []
  }
}

// 获取图片URL
const getImageUrl = (imageUrl) => {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http')) {
    return imageUrl
  }
  return `http://localhost:3000${imageUrl}`
}

// 图片预览方法
const showImagePreview = (images, startIndex = 0) => {
  if (!images || images.length === 0) return
  
  previewImages.value = images
  currentPreviewIndex.value = startIndex
  imagePreviewVisible.value = true
}

// 获取密室列表
const fetchEscapeRoomList = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterForm.horror_level) params.horror_level = filterForm.horror_level
    if (filterForm.is_active !== undefined) params.is_active = filterForm.is_active
    if (filterForm.min_players) params.min_players = filterForm.min_players
    if (filterForm.min_price) params.min_price = filterForm.min_price

    const response = await getEscapeRoomList(params)
    escapeRoomList.value = response.data?.list || response.list || response.data || response || []
    
  } catch (error) {
    console.error('获取密室列表失败:', error)
    message.error(`获取密室列表失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 筛选处理
const handleFilter = () => {
  fetchEscapeRoomList()
}

// 重置筛选
const resetFilter = () => {
  Object.keys(filterForm).forEach(key => {
    filterForm[key] = undefined
  })
  fetchEscapeRoomList()
}

// 显示创建弹窗
const showCreateModal = () => {
  currentEscapeRoom.value = null
  isEdit.value = false
  formModalVisible.value = true
}

// 查看密室
const viewEscapeRoom = (record) => {
  currentEscapeRoom.value = record
  detailModalVisible.value = true
}

// 编辑密室
const editEscapeRoom = async (record) => {
  try {
    // 获取完整的密室数据，包括门店配置
    const response = await getEscapeRoomDetail(record.id)
    currentEscapeRoom.value = response.data || response
    isEdit.value = true
    formModalVisible.value = true
  } catch (error) {
    console.error('获取密室详情失败:', error)
    message.error('获取密室详情失败')
  }
}

// 删除密室
const deleteEscapeRoom = (record) => {
  Modal.confirm({
    title: '确认删除',
    icon: h(ExclamationCircleOutlined),
    content: `确定要删除密室"${record.name}"吗？删除后相关图片也会被清理。`,
    onOk: async () => {
      try {
        await deleteEscapeRoomAPI(record.id)
        message.success('删除成功')
        fetchEscapeRoomList()
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

// 表单提交成功
const handleFormSuccess = () => {
  fetchEscapeRoomList()
}

// 清空选择
const clearSelection = () => {
  selectedRowKeys.value = []
}

// 批量操作
const batchEnable = async () => {
  try {
    await batchOperation({
      operation: 'enable',
      escape_room_ids: selectedRowKeys.value
    })
    message.success('批量启用成功')
    selectedRowKeys.value = []
    fetchEscapeRoomList()
  } catch (error) {
    message.error('批量启用失败')
  }
}

const batchDisable = async () => {
  try {
    await batchOperation({
      operation: 'disable',
      escape_room_ids: selectedRowKeys.value
    })
    message.success('批量禁用成功')
    selectedRowKeys.value = []
    fetchEscapeRoomList()
  } catch (error) {
    message.error('批量禁用失败')
  }
}

const batchDelete = () => {
  Modal.confirm({
    title: '确认批量删除',
    icon: h(ExclamationCircleOutlined),
    content: `确定要删除选中的 ${selectedRowKeys.value.length} 个密室吗？删除后相关图片也会被清理。`,
    onOk: async () => {
      try {
        await batchOperation({
          operation: 'delete',
          escape_room_ids: selectedRowKeys.value
        })
        message.success('批量删除成功')
        selectedRowKeys.value = []
        fetchEscapeRoomList()
      } catch (error) {
        message.error('批量删除失败')
      }
    }
  })
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

const handleImageError = (e) => {
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMS4zMzMzIDIxLjMzMzNIMTZWNDIuNjY2N0g0OFYyMS4zMzMzSDQyLjY2NjdMMzggMTZIMjZMMjEuMzMzMyAyMS4zMzMzWiIgZmlsbD0iI0NDQ0NDQyIvPgo8cGF0aCBkPSJNMzIgMzcuMzMzM0MzNS42ODEzIDM3LjMzMzMgMzguNjY2NyAzNC4zNDc5IDM4LjY2NjcgMzFDMzguNjY2NyAyNy42NTIxIDM1LjY4MTMgMjQuNjY2NyAzMiAyNC42NjY3QzI4LjMxODcgMjQuNjY2NyAyNS4zMzMzIDI3LjY1MjEgMjUuMzMzMyAzMUMyNS4zMzMzIDM0LjM0NzkgMjguMzE4NyAzNy4zMzMzIDMyIDM3LjMzMzNaIiBmaWxsPSIjQ0NDQ0NDIi8+Cjwvc3ZnPgo='
}

// 价格格式化函数
const formatPrice = (price) => {
  if (!price) return '0'
  return new Intl.NumberFormat('id-ID').format(price)
}

// 初始化
onMounted(() => {
  console.log('EscapeRoomView组件挂载完成')
  fetchEscapeRoomList()
})
</script>

<style scoped>
.escape-room-container {
  padding: 24px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-actions h2 {
  margin: 0;
  color: #333;
  font-weight: 600;
}

.filter-card {
  margin-bottom: 24px;
}

/* 密室信息展示样式 */
.escape-room-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.escape-room-images {
  position: relative;
  flex-shrink: 0;
}

.image-gallery {
  position: relative;
  width: 60px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #d9d9d9;
  cursor: pointer;
  transition: all 0.3s;
}

.image-gallery:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.main-escape-room-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-count {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
  line-height: 1;
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
  font-size: 10px;
  gap: 2px;
}

.image-gallery:hover .image-preview-hint {
  opacity: 1;
}

.no-image-placeholder {
  width: 60px;
  height: 80px;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  color: #ccc;
}

.escape-room-details {
  flex: 1;
  min-width: 0;
}

.escape-room-name {
  font-weight: 500;
  margin-bottom: 6px;
  cursor: pointer;
  color: #1890ff;
  text-decoration: none;
  font-size: 14px;
  line-height: 1.4;
}

.escape-room-name:hover {
  text-decoration: underline;
}

.escape-room-meta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.escape-room-description {
  color: #666;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-word;
}

.player-info {
  text-align: center;
}

.player-count {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
}

.duration {
  font-weight: 500;
}

.price {
  color: #1890ff;
  font-weight: 500;
}

.no-price {
  color: #999;
  font-size: 12px;
}

.npc-roles-display {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.more-roles {
  color: #666;
  font-size: 12px;
}

/* 批量操作样式 */
.batch-actions {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f6f8ff 0%, #e8f0ff 100%);
  border-radius: 8px;
  border: 1px solid #d9e5ff;
}

.selection-info {
  color: #1890ff;
  font-weight: 500;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .escape-room-container {
    padding: 16px;
  }
  
  .escape-room-info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .escape-room-images {
    margin-bottom: 8px;
  }
}

/* 表格滚动条美化 */
:deep(.ant-table-body) {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

:deep(.ant-table-body::-webkit-scrollbar) {
  height: 8px;
}

:deep(.ant-table-body::-webkit-scrollbar-track) {
  background: #f1f1f1;
  border-radius: 4px;
}

:deep(.ant-table-body::-webkit-scrollbar-thumb) {
  background: #c1c1c1;
  border-radius: 4px;
}

:deep(.ant-table-body::-webkit-scrollbar-thumb:hover) {
  background: #a1a1a1;
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
</style> 