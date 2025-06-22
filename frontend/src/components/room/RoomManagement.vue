<template>
  <div class="room-management">
    <!-- 页面标题和操作按钮 -->
    <div class="page-header">
      <div class="header-content">
        <h3>房间管理</h3>
        <div class="header-actions">
          <a-button 
            type="primary" 
            @click="showCreateModal"
            v-if="authStore.hasPermission('room.create')"
          >
            <PlusOutlined />
            新建房间
          </a-button>
          <a-button 
            @click="showBatchCreateModal"
            v-if="authStore.hasPermission('room.create')"
          >
            <DatabaseOutlined />
            批量录入
          </a-button>
          <a-button @click="refreshData">
            <ReloadOutlined />
            刷新
          </a-button>
        </div>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-section">
      <a-row :gutter="16">
        <a-col :span="6" v-if="!storeId">
          <a-select
            v-model:value="filters.store_id"
            placeholder="选择门店"
            allow-clear
            @change="handleFilterChange"
            style="width: 100%"
          >
            <a-select-option 
              v-for="store in availableStores" 
              :key="store.id" 
              :value="store.id"
            >
              {{ store.name }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-select
            v-model:value="filters.room_type"
            placeholder="房间类型"
            allow-clear
            @change="handleFilterChange"
            style="width: 100%"
          >
            <a-select-option value="剧本杀">剧本杀</a-select-option>
            <a-select-option value="密室">密室</a-select-option>
            <a-select-option value="混合">混合</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-select
            v-model:value="filters.status"
            placeholder="房间状态"
            allow-clear
            @change="handleFilterChange"
            style="width: 100%"
          >
            <a-select-option value="正常">正常</a-select-option>
            <a-select-option value="维护">维护</a-select-option>
            <a-select-option value="关闭">关闭</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-input
            v-model:value="filters.keyword"
            placeholder="搜索房间名称"
            @change="handleFilterChange"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </a-col>
      </a-row>
    </div>

    <!-- 批量操作 -->
    <div class="batch-actions" v-if="selectedRowKeys.length > 0">
      <a-space>
        <span>已选择 {{ selectedRowKeys.length }} 项</span>
        <a-select
          v-model:value="batchStatus"
          placeholder="批量设置状态"
          style="width: 120px"
        >
          <a-select-option value="正常">正常</a-select-option>
          <a-select-option value="维护">维护</a-select-option>
          <a-select-option value="关闭">关闭</a-select-option>
        </a-select>
        <a-button 
          type="primary" 
          @click="handleBatchStatusUpdate"
          :disabled="!batchStatus"
        >
          批量更新状态
        </a-button>
        <a-button @click="clearSelection">取消选择</a-button>
      </a-space>
    </div>

    <!-- 房间列表 -->
    <div class="table-section">
      <a-table
        :columns="columns"
        :data-source="rooms"
        :loading="loading"
        :pagination="pagination"
        :row-selection="rowSelection"
        row-key="id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 房间名称 -->
          <template v-if="column.key === 'name'">
            <div class="room-name">
              <strong>{{ record.name }}</strong>
              <div class="room-meta">
                <a-tag size="small" :color="getRoomTypeColor(record.room_type)">
                  {{ record.room_type }}
                </a-tag>
                <span class="capacity">{{ record.capacity }}人</span>
              </div>
            </div>
          </template>

          <!-- 门店信息 -->
          <template v-else-if="column.key === 'store_name'">
            <div class="store-info">
              <div>{{ record.store_name }}</div>
              <small class="company-name">{{ record.company_name }}</small>
            </div>
          </template>

          <!-- 图片数量 -->
          <template v-else-if="column.key === 'image_count'">
            <a-button 
              type="link" 
              size="small"
              @click="showImageModal(record)"
            >
              {{ record.image_count || 0 }}张
            </a-button>
          </template>

          <!-- 状态 -->
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ record.status }}
            </a-tag>
          </template>

          <!-- 操作 -->
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button 
                type="link" 
                size="small"
                @click="showRoomDetail(record)"
              >
                查看
              </a-button>
              <a-button 
                type="link" 
                size="small"
                @click="showEditModal(record)"
                v-if="authStore.hasPermission('room.edit')"
              >
                编辑
              </a-button>
              <a-button 
                type="link" 
                size="small"
                @click="showImageModal(record)"
                v-if="authStore.hasPermission('room.manage')"
              >
                图片
              </a-button>
              <a-popconfirm
                title="确定要删除这个房间吗？"
                @confirm="handleDelete(record)"
                v-if="authStore.hasPermission('room.delete')"
              >
                <a-button type="link" size="small" danger>
                  删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 创建/编辑房间弹窗 -->
    <RoomFormModal
      v-model:visible="formModalVisible"
      :mode="modalMode"
      :room-data="selectedRoom"
      :store-id="storeId"
      @success="handleFormSuccess"
    />

    <!-- 批量创建房间弹窗 -->
    <BatchCreateModal
      v-model:visible="batchCreateModalVisible"
      :store-id="storeId"
      @success="handleBatchCreateSuccess"
    />

    <!-- 房间详情弹窗 -->
    <RoomDetailModal
      v-model:visible="detailModalVisible"
      :room-data="selectedRoom"
    />

    <!-- 房间图片管理弹窗 -->
    <RoomImageModal
      v-model:visible="imageModalVisible"
      :room-data="selectedRoom"
      @success="refreshData"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  DatabaseOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { roomAPI } from '@/api/room'
import RoomFormModal from './RoomFormModal.vue'
import BatchCreateModal from './BatchCreateModal.vue'
import RoomDetailModal from './RoomDetailModal.vue'
import RoomImageModal from './RoomImageModal.vue'

const props = defineProps({
  storeId: {
    type: String,
    default: null
  }
})

const authStore = useAuthStore()

// 响应式数据
const loading = ref(false)
const rooms = ref([])
const availableStores = ref([])
const formModalVisible = ref(false)
const batchCreateModalVisible = ref(false)
const detailModalVisible = ref(false)
const imageModalVisible = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const selectedRoom = ref(null)
const selectedRowKeys = ref([])
const batchStatus = ref('')

// 筛选条件
const filters = reactive({
  store_id: props.storeId || null,
  room_type: null,
  status: null,
  keyword: ''
})

// 表格列配置
const columns = computed(() => {
  const baseColumns = [
    {
      title: '房间名称',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: '容量',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 80
    },
    {
      title: '图片',
      dataIndex: 'image_count',
      key: 'image_count',
      width: 80
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100
    },
    {
      title: '操作',
      key: 'action',
      width: 200
    }
  ]

  // 如果不是特定门店，显示门店信息
  if (!props.storeId) {
    baseColumns.splice(1, 0, {
      title: '所属门店',
      dataIndex: 'store_name',
      key: 'store_name',
      width: 150
    })
  }

  return baseColumns
})

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条记录`
})

// 行选择配置
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
}))

// 方法
const loadRooms = async () => {
  try {
    loading.value = true
    const params = { ...filters }
    
    // 移除空值
    Object.keys(params).forEach(key => {
      if (!params[key]) {
        delete params[key]
      }
    })
    
    const response = await roomAPI.getRoomList(params)
    rooms.value = response.data || []
    pagination.total = rooms.value.length
  } catch (error) {
    message.error('获取房间列表失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const loadAvailableStores = async () => {
  if (props.storeId) return
  
  try {
    const response = await roomAPI.getAvailableStores()
    availableStores.value = response.data || []
  } catch (error) {
    console.error('获取可选门店列表失败:', error)
  }
}

const refreshData = () => {
  loadRooms()
  loadAvailableStores()
}

const handleFilterChange = () => {
  pagination.current = 1
  loadRooms()
}

const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
}

const showCreateModal = () => {
  modalMode.value = 'create'
  selectedRoom.value = null
  formModalVisible.value = true
}

const showEditModal = (room) => {
  modalMode.value = 'edit'
  selectedRoom.value = room
  formModalVisible.value = true
}

const showBatchCreateModal = () => {
  batchCreateModalVisible.value = true
}

const showRoomDetail = (room) => {
  selectedRoom.value = room
  detailModalVisible.value = true
}

const showImageModal = (room) => {
  selectedRoom.value = room
  imageModalVisible.value = true
}

const handleFormSuccess = () => {
  formModalVisible.value = false
  refreshData()
}

const handleBatchCreateSuccess = () => {
  batchCreateModalVisible.value = false
  refreshData()
}

const handleDelete = async (room) => {
  try {
    await roomAPI.deleteRoom(room.id)
    message.success('房间删除成功')
    refreshData()
  } catch (error) {
    message.error('删除失败：' + (error.message || '未知错误'))
  }
}

const handleBatchStatusUpdate = async () => {
  try {
    await roomAPI.batchOperation({
      operation: 'updateStatus',
      room_ids: selectedRowKeys.value,
      status: batchStatus.value
    })
    message.success('批量更新状态成功')
    clearSelection()
    refreshData()
  } catch (error) {
    message.error('批量更新失败：' + (error.message || '未知错误'))
  }
}

const clearSelection = () => {
  selectedRowKeys.value = []
  batchStatus.value = ''
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

// 监听storeId变化
watch(() => props.storeId, (newStoreId) => {
  filters.store_id = newStoreId
  refreshData()
}, { immediate: true })

// 生命周期
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.room-management {
  padding: 0;
}

.page-header {
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h3 {
  margin: 0;
  color: #262626;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.filter-section {
  background: #fafafa;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.batch-actions {
  background: #e6f7ff;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  border: 1px solid #91d5ff;
}

.table-section {
  background: #fff;
  border-radius: 6px;
}

.room-name strong {
  color: #262626;
  font-size: 14px;
}

.room-meta {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.capacity {
  color: #666;
  font-size: 12px;
}

.store-info {
  line-height: 1.4;
}

.company-name {
  color: #999;
  font-size: 12px;
}
</style> 