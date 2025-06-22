<template>
  <div class="script-container">
    <div class="header-actions">
      <h2>剧本管理</h2>
      <div class="actions">
        <a-button 
          type="primary" 
          @click="showCreateModal"
          v-if="hasCreatePermission"
        >
          <PlusOutlined />
          新增剧本
        </a-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <a-card class="filter-card">
      <a-form layout="inline" :model="filterForm" @finish="handleFilter">
        <a-form-item label="剧本类型">
          <a-select 
            v-model:value="filterForm.type" 
            placeholder="选择类型" 
            style="width: 120px"
            allow-clear
          >
            <a-select-option value="欢乐">欢乐</a-select-option>
            <a-select-option value="惊悚">惊悚</a-select-option>
            <a-select-option value="推理">推理</a-select-option>
            <a-select-option value="恐怖">恐怖</a-select-option>
            <a-select-option value="情感">情感</a-select-option>
            <a-select-option value="策略">策略</a-select-option>
            <a-select-option value="血染钟楼">血染钟楼</a-select-option>
            <a-select-option value="桌游">桌游</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="剧本背景">
          <a-select 
            v-model:value="filterForm.background" 
            placeholder="选择背景" 
            style="width: 120px"
            allow-clear
          >
            <a-select-option value="现代">现代</a-select-option>
            <a-select-option value="中国古代">中国古代</a-select-option>
            <a-select-option value="欧式">欧式</a-select-option>
            <a-select-option value="日式">日式</a-select-option>
            <a-select-option value="架空">架空</a-select-option>
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
        :data-source="scriptList"
        :loading="loading"
        :row-selection="rowSelection"
        row-key="id"
        :scroll="{ x: 1600 }"
        :pagination="{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'script_info'">
            <div class="script-info">
              <!-- 🆕 多图片显示 -->
              <div class="script-images">
                <div 
                  v-if="getScriptImages(record).length > 0"
                  class="image-gallery"
                  @click="showImagePreview(getScriptImages(record), 0)"
                >
                  <img 
                    :src="getImageUrl(getScriptImages(record)[0])" 
                    class="main-script-image"
                    @error="handleImageError"
                  />
                  <!-- 图片数量标识 -->
                  <div 
                    v-if="getScriptImages(record).length > 1"
                    class="image-count"
                  >
                    +{{ getScriptImages(record).length - 1 }}
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
              
              <div class="script-details">
                <div class="script-name" @click="viewScript(record)">
                  {{ record.name }}
                </div>
                <div class="script-meta">
                  <a-tag :color="getTypeColor(record.type)" size="small">
                    {{ record.type }}
                  </a-tag>
                  <a-tag 
                    v-if="record.background"
                    :color="getBackgroundColor(record.background)" 
                    size="small"
                  >
                    {{ record.background }}
                  </a-tag>
                </div>
                <!-- 🆕 显示描述预览 -->
                <div v-if="record.description" class="script-description">
                  {{ record.description.substring(0, 50) }}{{ record.description.length > 50 ? '...' : '' }}
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'players'">
            <div class="player-info">
              <span class="player-count">{{ record.min_players }}-{{ record.max_players }}人</span>
              <div class="difficulty">
                <a-tag :color="getDifficultyColor(record.difficulty)" size="small">
                  {{ record.difficulty }}
                </a-tag>
              </div>
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
            <a-badge :count="record.store_count" :number-style="{ backgroundColor: '#1890ff' }" />
          </template>

          <!-- 🆕 标签显示 -->
          <template v-else-if="column.key === 'tags'">
            <div class="tags-display">
              <a-tag 
                v-for="tag in getScriptTags(record).slice(0, 2)" 
                :key="tag"
                color="blue"
                size="small"
              >
                {{ tag }}
              </a-tag>
              <span 
                v-if="getScriptTags(record).length > 2"
                class="more-tags"
              >
                +{{ getScriptTags(record).length - 2 }}
              </span>
            </div>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" type="link" @click="viewScript(record)">
                <EyeOutlined />
                查看
              </a-button>
              <a-button 
                size="small" 
                type="link" 
                @click="editScript(record)"
                v-if="hasEditPermission"
              >
                <EditOutlined />
                编辑
              </a-button>
              <a-button 
                size="small" 
                type="link" 
                danger
                @click="deleteScript(record)"
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
    <ScriptFormModal
      v-model:visible="formModalVisible"
      :script-data="currentScript"
      :is-edit="isEdit"
      @success="handleFormSuccess"
    />

    <!-- 查看详情弹窗 -->
    <ScriptDetailModal
      v-model:visible="detailModalVisible"
      :script-data="currentScript"
    />

    <!-- 🆕 图片预览弹窗 -->
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
  getScriptList, 
  deleteScript as deleteScriptAPI,
  batchOperation,
  getScriptDetail
} from '@/api/script'
import ScriptFormModal from '@/components/script/ScriptFormModal.vue'
import ScriptDetailModal from '@/components/script/ScriptDetailModal.vue'

const authStore = useAuthStore()

// 权限检查
const hasCreatePermission = computed(() => 
  authStore.hasPermission('script.manage')
)
const hasEditPermission = computed(() => 
  authStore.hasPermission('script.manage')
)
const hasDeletePermission = computed(() => 
  authStore.hasPermission('script.manage')
)

// 数据
const scriptList = ref([])
const loading = ref(false)
const selectedRowKeys = ref([])

// 筛选表单
const filterForm = reactive({
  type: undefined,
  background: undefined,
  is_active: undefined,
  min_players: undefined
})

// 弹窗状态
const formModalVisible = ref(false)
const detailModalVisible = ref(false)
const currentScript = ref(null)
const isEdit = ref(false)

// 🆕 图片预览状态
const imagePreviewVisible = ref(false)
const previewImages = ref([])
const currentPreviewIndex = ref(0)

// 表格列定义
const columns = [
  {
    title: '剧本信息',
    key: 'script_info',
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
    title: '标签',
    key: 'tags',
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

// 🆕 获取剧本图片数组
const getScriptImages = (script) => {
  if (!script.images) return []
  
  if (Array.isArray(script.images)) {
    return script.images
  }
  
  try {
    return JSON.parse(script.images)
  } catch (e) {
    return []
  }
}

// 🆕 获取剧本标签数组
const getScriptTags = (script) => {
  if (!script.tags) return []
  
  if (Array.isArray(script.tags)) {
    return script.tags
  }
  
  try {
    return JSON.parse(script.tags)
  } catch (e) {
    return []
  }
}

// 🆕 获取图片URL
const getImageUrl = (imageUrl) => {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http')) {
    return imageUrl
  }
  return `http://localhost:3000${imageUrl}`
}

// 🆕 图片预览方法
const showImagePreview = (images, startIndex = 0) => {
  if (!images || images.length === 0) return
  
  previewImages.value = images
  currentPreviewIndex.value = startIndex
  imagePreviewVisible.value = true
}

// 获取剧本列表
const fetchScriptList = async () => {
  loading.value = true
  try {
    const params = {}
    if (filterForm.type) params.type = filterForm.type
    if (filterForm.background) params.background = filterForm.background
    if (filterForm.is_active !== undefined) params.is_active = filterForm.is_active
    if (filterForm.min_players) params.min_players = filterForm.min_players

    const response = await getScriptList(params)
    scriptList.value = response.data || response || []
    
  } catch (error) {
    console.error('获取剧本列表失败:', error)
    message.error(`获取剧本列表失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 筛选处理
const handleFilter = () => {
  fetchScriptList()
}

// 重置筛选
const resetFilter = () => {
  Object.keys(filterForm).forEach(key => {
    filterForm[key] = undefined
  })
  fetchScriptList()
}

// 显示创建弹窗
const showCreateModal = () => {
  currentScript.value = null
  isEdit.value = false
  formModalVisible.value = true
}

// 查看剧本
const viewScript = (record) => {
  currentScript.value = record
  detailModalVisible.value = true
}

// 编辑剧本
const editScript = async (record) => {
  try {
    // 获取完整的剧本数据，包括门店配置
    const response = await getScriptDetail(record.id)
    currentScript.value = response.data || response
    isEdit.value = true
    formModalVisible.value = true
  } catch (error) {
    console.error('获取剧本详情失败:', error)
    message.error('获取剧本详情失败')
  }
}

// 删除剧本
const deleteScript = (record) => {
  Modal.confirm({
    title: '确认删除',
    icon: h(ExclamationCircleOutlined),
    content: `确定要删除剧本"${record.name}"吗？删除后相关图片也会被清理。`,
    onOk: async () => {
      try {
        await deleteScriptAPI(record.id)
        message.success('删除成功')
        fetchScriptList()
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

// 表单提交成功
const handleFormSuccess = () => {
  fetchScriptList()
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
      script_ids: selectedRowKeys.value
    })
    message.success('批量启用成功')
    selectedRowKeys.value = []
    fetchScriptList()
  } catch (error) {
    message.error('批量启用失败')
  }
}

const batchDisable = async () => {
  try {
    await batchOperation({
      operation: 'disable',
      script_ids: selectedRowKeys.value
    })
    message.success('批量禁用成功')
    selectedRowKeys.value = []
    fetchScriptList()
  } catch (error) {
    message.error('批量禁用失败')
  }
}

const batchDelete = () => {
  Modal.confirm({
    title: '确认批量删除',
    icon: h(ExclamationCircleOutlined),
    content: `确定要删除选中的 ${selectedRowKeys.value.length} 个剧本吗？删除后相关图片也会被清理。`,
    onOk: async () => {
      try {
        await batchOperation({
          operation: 'delete',
          script_ids: selectedRowKeys.value
        })
        message.success('批量删除成功')
        selectedRowKeys.value = []
        fetchScriptList()
      } catch (error) {
        message.error('批量删除失败')
      }
    }
  })
}

// 工具函数
const getTypeColor = (type) => {
  const colors = {
    '欢乐': 'orange',
    '惊悚': 'purple', 
    '推理': 'blue',
    '恐怖': 'red',
    '情感': 'pink',
    '策略': 'green',
    '血染钟楼': 'volcano',
    '桌游': 'cyan'
  }
  return colors[type] || 'default'
}

const getDifficultyColor = (difficulty) => {
  const colors = {
    '新手': 'green',
    '进阶': 'blue', 
    '硬核': 'red'
  }
  return colors[difficulty] || 'default'
}

const getBackgroundColor = (background) => {
  const colors = {
    '现代': 'blue',
    '中国古代': 'gold',
    '欧式': 'purple',
    '日式': 'magenta',
    '架空': 'cyan'
  }
  return colors[background] || 'default'
}

const handleImageError = (e) => {
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMS4zMzMzIDIxLjMzMzNIMTZWNDIuNjY2N0g0OFYyMS4zMzMzSDQyLjY2NjdMMzggMTZIMjZMMjEuMzMzMyAyMS4zMzMzWiIgZmlsbD0iI0NDQ0NDQyIvPgo8cGF0aCBkPSJNMzIgMzcuMzMzM0MzNS42ODEzIDM3LjMzMzMgMzguNjY2NyAzNC4zNDc5IDM4LjY2NjcgMzFDMzguNjY2NyAyNy42NTIxIDM1LjY4MTMgMjQuNjY2NyAzMiAyNC42NjY3QzI4LjMxODcgMjQuNjY2NyAyNS4zMzMzIDI3LjY1MjEgMjUuMzMzMyAzMUMyNS4zMzMzIDM0LjM0NzkgMjguMzE4NyAzNy4zMzMzIDMyIDM3LjMzMzNaIiBmaWxsPSIjQ0NDQ0NDIi8+Cjwvc3ZnPgo='
}

// 🆕 价格格式化函数
const formatPrice = (price) => {
  if (!price) return '0'
  return new Intl.NumberFormat('id-ID').format(price)
}

// 初始化
onMounted(() => {
  console.log('ScriptView组件挂载完成')
  fetchScriptList()
})
</script>

<style scoped>
.script-container {
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

/* 🆕 剧本信息展示样式 */
.script-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.script-images {
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

.main-script-image {
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

.script-details {
  flex: 1;
  min-width: 0;
}

.script-name {
  font-weight: 500;
  margin-bottom: 6px;
  cursor: pointer;
  color: #1890ff;
  text-decoration: none;
  font-size: 14px;
  line-height: 1.4;
}

.script-name:hover {
  text-decoration: underline;
}

.script-meta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.script-description {
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

.difficulty {
  display: flex;
  justify-content: center;
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

.tags-display {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.more-tags {
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
  .script-container {
    padding: 16px;
  }
  
  .script-info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .script-images {
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

/* 🆕 图片预览弹窗样式 */
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