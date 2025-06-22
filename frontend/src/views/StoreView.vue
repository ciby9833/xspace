<template>
  <div class="store-view">
    <!-- 页面标题和操作按钮 -->
    <div class="page-header">
      <div class="header-content">
        <h2>门店管理</h2>
        <div class="header-actions">
          <a-button 
            type="primary" 
            @click="showCreateModal"
            v-if="authStore.hasPermission('store.create') && (authStore.isPlatformAdmin || authStore.isCompanyAdmin)"
          >
            <PlusOutlined />
            新建门店
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
        <a-col :span="6" v-if="authStore.isPlatformAdmin">
          <a-select
            v-model:value="filters.company_id"
            placeholder="选择公司"
            allow-clear
            @change="handleFilterChange"
            style="width: 100%"
          >
            <a-select-option 
              v-for="company in availableCompanies" 
              :key="company.id" 
              :value="company.id"
            >
              {{ company.name }} ({{ company.type }})
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-input
            v-model:value="filters.keyword"
            placeholder="搜索门店名称或地址"
            @change="handleFilterChange"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </a-col>
        <a-col :span="6">
          <a-select
            v-model:value="filters.is_active"
            placeholder="选择状态"
            allow-clear
            @change="handleFilterChange"
            style="width: 100%"
          >
            <a-select-option :value="true">正常</a-select-option>
            <a-select-option :value="false">停用</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </div>

    <!-- 门店列表 -->
    <div class="table-section">
      <a-table
        :columns="columns"
        :data-source="filteredStores"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <!-- 门店名称 -->
          <template v-if="column.key === 'name'">
            <div class="store-name">
              <strong>{{ record.name }}</strong>
              <div class="store-meta">
                <a-tag v-if="record.company_name" size="small" color="blue">
                  {{ record.company_name }}
                </a-tag>
              </div>
            </div>
          </template>

          <!-- 地址 -->
          <template v-else-if="column.key === 'address'">
            <div class="address-info">
              {{ record.address || '未设置' }}
            </div>
          </template>

          <!-- 用户数量 -->
          <template v-else-if="column.key === 'user_count'">
            <a-button 
              type="link" 
              size="small"
              @click="showStoreUsers(record)"
              v-if="authStore.hasPermission('user.view')"
            >
              {{ record.user_count || 0 }}人
            </a-button>
            <span v-else>{{ record.user_count || 0 }}人</span>
          </template>

          <!-- 房间数量 -->
          <template v-else-if="column.key === 'room_count'">
            <a-button 
              type="link" 
              size="small"
              @click="showRoomManagement(record)"
              v-if="authStore.hasPermission('room.view')"
            >
              {{ record.room_count || 0 }}间
            </a-button>
            <span v-else>{{ record.room_count || 0 }}间</span>
          </template>

          <!-- 状态 -->
          <template v-else-if="column.key === 'is_active'">
            <a-tag :color="record.is_active ? 'green' : 'red'">
              {{ record.is_active ? '正常' : '停用' }}
            </a-tag>
          </template>

          <!-- 操作 -->
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button 
                type="link" 
                size="small"
                @click="showStoreDetail(record)"
              >
                查看
              </a-button>
              <a-button 
                type="link" 
                size="small"
                @click="showRoomManagement(record)"
                v-if="authStore.hasPermission('room.view')"
              >
                房间管理
              </a-button>
              <a-button 
                type="link" 
                size="small"
                @click="showEditModal(record)"
                v-if="authStore.hasPermission('store.edit') && canManageStore(record)"
              >
                编辑
              </a-button>
              <a-popconfirm
                title="确定要删除这个门店吗？"
                @confirm="handleDelete(record)"
                v-if="authStore.hasPermission('store.delete') && canManageStore(record)"
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

    <!-- 创建/编辑门店弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalMode === 'create' ? '新建门店' : '编辑门店'"
      :confirm-loading="modalLoading"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
      width="600px"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <!-- 平台管理员可以选择公司 -->
        <a-form-item label="所属公司" name="company_id" v-if="authStore.isPlatformAdmin">
          <a-select
            v-model:value="formData.company_id"
            placeholder="选择公司"
            :disabled="modalMode === 'edit'"
          >
            <a-select-option 
              v-for="company in availableCompanies" 
              :key="company.id" 
              :value="company.id"
            >
              {{ company.name }} ({{ company.type }})
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <!-- 公司管理员显示当前公司信息，不可修改 -->
        <a-form-item label="所属公司" v-else-if="authStore.isCompanyAdmin">
          <a-input :value="authStore.user?.company_name || '当前公司'" disabled />
          <div class="form-item-tip">门店将自动关联到您的公司</div>
        </a-form-item>

        <a-form-item label="门店名称" name="name">
          <a-input v-model:value="formData.name" placeholder="请输入门店名称" />
        </a-form-item>

        <a-form-item label="门店地址" name="address">
          <a-textarea 
            v-model:value="formData.address" 
            placeholder="请输入门店地址"
            :rows="3"
          />
        </a-form-item>

        <a-form-item label="状态" name="is_active" v-if="modalMode === 'edit'">
          <a-switch 
            v-model:checked="formData.is_active"
            checked-children="正常"
            un-checked-children="停用"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 门店详情弹窗 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="门店详情"
      :footer="null"
      width="1200px"
    >
      <div v-if="selectedStore" class="store-detail">
        <a-tabs v-model:activeKey="activeTabKey">
          <!-- 基本信息 -->
          <a-tab-pane key="info" tab="基本信息">
            <a-descriptions :column="2" bordered>
              <a-descriptions-item label="门店名称">
                {{ selectedStore.name }}
              </a-descriptions-item>
              <a-descriptions-item label="所属公司">
                {{ selectedStore.company_name }}
              </a-descriptions-item>
              <a-descriptions-item label="门店地址" :span="2">
                {{ selectedStore.address || '未设置' }}
              </a-descriptions-item>
              <a-descriptions-item label="时区">
                {{ selectedStore.timezone }}
              </a-descriptions-item>
              <a-descriptions-item label="状态">
                <a-tag :color="selectedStore.is_active ? 'green' : 'red'">
                  {{ selectedStore.is_active ? '正常' : '停用' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="创建时间" :span="2">
                {{ formatDateTime(selectedStore.created_at) }}
              </a-descriptions-item>
            </a-descriptions>

            <!-- 门店统计 -->
            <div v-if="selectedStore.stats" class="store-stats">
              <h4>门店统计</h4>
              <a-row :gutter="16">
                <a-col :span="6">
                  <a-statistic title="总用户数" :value="selectedStore.stats.total_users" />
                </a-col>
                <a-col :span="6">
                  <a-statistic title="活跃用户" :value="selectedStore.stats.active_users" />
                </a-col>
                <a-col :span="6">
                  <a-statistic title="门店级用户" :value="selectedStore.stats.store_level_users" />
                </a-col>
                <a-col :span="6">
                  <a-statistic title="房间数量" :value="selectedStore.room_count || 0" />
                </a-col>
              </a-row>
            </div>
          </a-tab-pane>

          <!-- 房间管理 -->
          <a-tab-pane key="rooms" tab="房间管理" v-if="authStore.hasPermission('room.view')">
            <RoomManagement :store-id="selectedStore.id" />
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-modal>

    <!-- 门店用户列表弹窗 -->
    <a-modal
      v-model:open="usersModalVisible"
      title="门店用户列表"
      :footer="null"
      width="800px"
    >
      <div v-if="storeUsers.length > 0">
        <a-table
          :columns="userColumns"
          :data-source="storeUsers"
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'role'">
              <a-tag color="blue">{{ record.role_display_name || record.role_name }}</a-tag>
            </template>
            <template v-else-if="column.key === 'account_level'">
              <a-tag :color="getAccountLevelColor(record.account_level)">
                {{ getAccountLevelText(record.account_level) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'is_primary'">
              <a-tag v-if="record.is_primary" color="gold">主门店</a-tag>
            </template>
          </template>
        </a-table>
      </div>
      <a-empty v-else description="该门店暂无用户" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { storeAPI } from '@/api/store'
import RoomManagement from '@/components/room/RoomManagement.vue'

const authStore = useAuthStore()

// 响应式数据
const loading = ref(false)
const stores = ref([])
const availableCompanies = ref([])
const modalVisible = ref(false)
const modalLoading = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const detailModalVisible = ref(false)
const usersModalVisible = ref(false)
const selectedStore = ref(null)
const storeUsers = ref([])
const formRef = ref()
const activeTabKey = ref('info') // 控制门店详情弹窗的激活标签页

// 筛选条件
const filters = reactive({
  company_id: null,
  keyword: '',
  is_active: undefined // undefined表示显示所有，true表示只显示启用，false表示只显示禁用
})

// 表单数据
const formData = reactive({
  company_id: null,
  name: '',
  address: '',
  is_active: true
})

// 表单验证规则
const formRules = computed(() => ({
  company_id: authStore.isPlatformAdmin ? [
    { required: true, message: '请选择所属公司', trigger: 'change' }
  ] : [],
  name: [
    { required: true, message: '请输入门店名称', trigger: 'blur' },
    { min: 1, max: 255, message: '门店名称长度在1-255字符之间', trigger: 'blur' }
  ]
}))

// 表格列配置
const columns = [
  {
    title: '门店名称',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '地址',
    dataIndex: 'address',
    key: 'address'
  },
  {
    title: '用户数量',
    dataIndex: 'user_count',
    key: 'user_count',
    width: 100
  },
  {
    title: '房间数量',
    dataIndex: 'room_count',
    key: 'room_count',
    width: 100
  },
  {
    title: '状态',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 80
  },
  {
    title: '操作',
    key: 'action',
    width: 200
  }
]

// 用户列表表格列
const userColumns = [
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { 
    title: '角色', 
    dataIndex: 'role', 
    key: 'role'
  },
  { 
    title: '账户级别', 
    dataIndex: 'account_level', 
    key: 'account_level'
  },
  { 
    title: '主门店', 
    dataIndex: 'is_primary', 
    key: 'is_primary'
  }
]

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 条记录`
})

// 计算属性
const filteredStores = computed(() => {
  let result = stores.value

  // 关键词搜索（后端已处理公司和状态筛选）
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase()
    result = result.filter(store => 
      store.name.toLowerCase().includes(keyword) ||
      (store.address && store.address.toLowerCase().includes(keyword))
    )
  }

  pagination.total = result.length
  return result
})

// 方法
const loadStores = async () => {
  try {
    loading.value = true
    const params = {}
    
    // 如果是平台管理员且选择了公司，添加公司筛选
    if (authStore.isPlatformAdmin && filters.company_id) {
      params.company_id = filters.company_id
    }
    
    // 添加状态筛选
    if (filters.is_active !== undefined) {
      params.is_active = filters.is_active
    }
    
    const response = await storeAPI.getStoreList(params)
    stores.value = response.data.stores || []
  } catch (error) {
    message.error('获取门店列表失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const loadAvailableCompanies = async () => {
  try {
    const response = await storeAPI.getAvailableCompanies()
    availableCompanies.value = response.data || []
  } catch (error) {
    console.error('获取可选公司列表失败:', error)
  }
}

const refreshData = () => {
  loadStores()
  if (authStore.isPlatformAdmin) {
    loadAvailableCompanies()
  }
}

const handleFilterChange = () => {
  pagination.current = 1
  loadStores() // 重新加载数据
}

const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
}

const showCreateModal = () => {
  modalMode.value = 'create'
  resetForm()
  modalVisible.value = true
}

const showEditModal = (store) => {
  modalMode.value = 'edit'
  resetForm()
  
  // 填充表单数据
  Object.assign(formData, {
    company_id: store.company_id,
    name: store.name,
    address: store.address,
    is_active: store.is_active
  })
  
  selectedStore.value = store
  modalVisible.value = true
}

const resetForm = () => {
  Object.assign(formData, {
    company_id: authStore.isCompanyAdmin ? authStore.companyId : null,
    name: '',
    address: '',
    is_active: true
  })
  
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

const handleModalOk = async () => {
  try {
    await formRef.value.validate()
    modalLoading.value = true
    
    // 准备提交数据
    const submitData = { ...formData }
    
    // 如果是公司管理员，确保使用当前用户的公司ID
    if (authStore.isCompanyAdmin) {
      submitData.company_id = authStore.companyId
    }
    
    if (modalMode.value === 'create') {
      await storeAPI.createStore(submitData)
      message.success('门店创建成功')
    } else {
      await storeAPI.updateStore(selectedStore.value.id, submitData)
      message.success('门店更新成功')
    }
    
    modalVisible.value = false
    loadStores()
  } catch (error) {
    if (error.errorFields) {
      // 表单验证错误
      return
    }
    message.error('操作失败：' + (error.message || '未知错误'))
  } finally {
    modalLoading.value = false
  }
}

const handleModalCancel = () => {
  modalVisible.value = false
  resetForm()
}

const handleDelete = async (store) => {
  try {
    await storeAPI.deleteStore(store.id)
    message.success('门店删除成功')
    loadStores()
  } catch (error) {
    message.error('删除失败：' + (error.message || '未知错误'))
  }
}

const showStoreDetail = async (store) => {
  try {
    const response = await storeAPI.getStoreDetail(store.id)
    selectedStore.value = response.data
    activeTabKey.value = 'info' // 默认显示基本信息标签页
    detailModalVisible.value = true
  } catch (error) {
    message.error('获取门店详情失败：' + (error.message || '未知错误'))
  }
}

const showStoreUsers = async (store) => {
  try {
    const response = await storeAPI.getStoreUsers(store.id)
    storeUsers.value = response.data.users || []
    usersModalVisible.value = true
  } catch (error) {
    message.error('获取门店用户失败：' + (error.message || '未知错误'))
  }
}

const showRoomManagement = async (store) => {
  try {
    // 获取门店详情
    const response = await storeAPI.getStoreDetail(store.id)
    selectedStore.value = response.data
    activeTabKey.value = 'rooms' // 直接切换到房间管理标签页
    detailModalVisible.value = true
  } catch (error) {
    message.error('获取门店详情失败：' + (error.message || '未知错误'))
  }
}

const canManageStore = (store) => {
  if (authStore.isPlatformAdmin) {
    return true
  }
  if (authStore.isCompanyAdmin) {
    return store.company_id === authStore.companyId
  }
  return false
}

const formatDateTime = (dateTime) => {
  return dateTime ? dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const getAccountLevelColor = (level) => {
  const colors = {
    'platform': 'purple',
    'company': 'blue',
    'store': 'green'
  }
  return colors[level] || 'default'
}

const getAccountLevelText = (level) => {
  const texts = {
    'platform': '平台级',
    'company': '公司级',
    'store': '门店级'
  }
  return texts[level] || level
}

// 生命周期
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.store-view {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
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

.table-section {
  background: #fff;
  border-radius: 6px;
}

.store-name strong {
  color: #262626;
  font-size: 14px;
}

.store-meta {
  margin-top: 4px;
}

.address-info {
  color: #666;
  max-width: 200px;
  word-break: break-all;
}

.store-detail {
  padding: 8px 0;
}

.store-stats {
  margin-top: 24px;
}

.store-stats h4 {
  margin-bottom: 12px;
  color: #262626;
}

.form-item-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style> 