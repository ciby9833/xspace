<template>
  <div class="role-pricing-container">
    <div class="header-actions">
      <h2>折扣定价模板管理</h2>
      <div class="actions">
        <a-button 
          type="primary" 
          @click="showCreateModal"
          v-if="hasCreatePermission"
        >
          <PlusOutlined />
          新增定价模板
        </a-button>
        <a-button 
          type="default" 
          @click="showImportModal"
          v-if="hasCreatePermission"
        >
          <ImportOutlined />
          批量导入
        </a-button>
        <a-button 
          type="default" 
          @click="exportTemplates"
          :loading="exportLoading"
        >
          <DownloadOutlined />
          导出模板
        </a-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <a-card class="filter-card">
      <a-form layout="inline" :model="filterForm" @finish="handleFilter">
        <a-form-item label="折扣名称">
          <a-input 
            v-model:value="filterForm.role_name"
            placeholder="折扣名称"
            style="width: 150px"
            allow-clear
          />
        </a-form-item>
        
        <a-form-item label="门店">
          <a-select 
            v-model:value="filterForm.store_id" 
            placeholder="选择门店" 
            style="width: 150px"
            allow-clear
          >
            <a-select-option value="">全部门店</a-select-option>
            <a-select-option 
              v-for="store in storeList" 
              :key="store.id" 
              :value="store.id"
            >
              {{ store.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="折扣类型">
          <a-select 
            v-model:value="filterForm.discount_type" 
            placeholder="选择折扣类型" 
            style="width: 120px"
            allow-clear
          >
            <a-select-option value="percentage">百分比</a-select-option>
            <a-select-option value="fixed">固定金额</a-select-option>
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
        :data-source="templateList"
        :loading="loading"
        :row-selection="rowSelection"
        row-key="id"
        :scroll="{ x: 1400 }"
        :pagination="{ 
          pageSize: 10, 
          showSizeChanger: true, 
          showQuickJumper: true,
          current: pagination.current,
          total: pagination.total,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 项，共 ${total} 项`
        }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'role_name'">
            <a-tag color="blue">{{ record.role_name }}</a-tag>
          </template>
          
          <template v-if="column.key === 'discount_info'">
            <div class="discount-info">
              <a-tag 
                :color="record.discount_type === 'percentage' ? 'green' : 'orange'"
              >
                {{ record.discount_type === 'percentage' ? '百分比' : '固定金额' }}
              </a-tag>
              <span class="discount-value">
                {{ record.discount_type === 'percentage' ? 
                  `${record.discount_value}%` : 
                  `Rp ${formatNumber(record.discount_value)}` 
                }}
              </span>
            </div>
          </template>
          
          <template v-if="column.key === 'store_scope'">
            <div class="store-scope">
              <template v-if="!record.store_ids || record.store_ids.length === 0">
                <a-tag color="purple">全公司</a-tag>
              </template>
              <template v-else>
                <a-tag 
                  v-for="storeId in record.store_ids.slice(0, 2)" 
                  :key="storeId"
                  color="blue"
                >
                  {{ getStoreName(storeId) }}
                </a-tag>
                <a-tag v-if="record.store_ids.length > 2" color="default">
                  +{{ record.store_ids.length - 2 }}
                </a-tag>
              </template>
            </div>
          </template>
          
          <template v-if="column.key === 'usage_stats'">
            <div class="usage-stats">
              <div class="stat-item">
                <span class="stat-label">使用次数:</span>
                <span class="stat-value">{{ record.usage_count || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">节省金额:</span>
                <span class="stat-value text-success">Rp {{ formatNumber(record.total_saved || 0) }}</span>
              </div>
            </div>
          </template>
          
          <template v-if="column.key === 'is_active'">
            <a-switch
              v-model:checked="record.is_active"
              :loading="record.statusLoading"
              @change="handleStatusChange(record)"
              v-if="hasUpdatePermission"
            />
            <a-tag v-else :color="record.is_active ? 'green' : 'red'">
              {{ record.is_active ? '启用' : '禁用' }}
            </a-tag>
          </template>
          
          <template v-if="column.key === 'actions'">
            <div class="action-buttons">
              <a-button 
                type="link" 
                size="small" 
                @click="showDetailModal(record)"
              >
                <EyeOutlined />
                查看
              </a-button>
              <a-button 
                type="link" 
                size="small" 
                @click="showEditModal(record)"
                v-if="hasUpdatePermission"
              >
                <EditOutlined />
                编辑
              </a-button>
              <a-button 
                type="link" 
                size="small" 
                @click="showCopyModal(record)"
                v-if="hasCreatePermission"
              >
                <CopyOutlined />
                复制
              </a-button>
              <a-popconfirm
                title="确定要删除这个定价模板吗？"
                @confirm="handleDelete(record.id)"
                v-if="hasDeletePermission"
              >
                <a-button type="link" size="small" danger>
                  <DeleteOutlined />
                  删除
                </a-button>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 批量操作栏 -->
    <div class="batch-operations" v-if="selectedRowKeys.length > 0">
      <a-card>
        <div class="batch-info">
          <span>已选择 {{ selectedRowKeys.length }} 项</span>
          <div class="batch-actions">
            <a-button 
              @click="batchUpdateStatus(true)"
              v-if="hasUpdatePermission"
            >
              <CheckOutlined />
              批量启用
            </a-button>
            <a-button 
              @click="batchUpdateStatus(false)"
              v-if="hasUpdatePermission"
            >
              <CloseOutlined />
              批量禁用
            </a-button>
            <a-popconfirm
              title="确定要删除选中的定价模板吗？"
              @confirm="batchDelete"
              v-if="hasDeletePermission"
            >
              <a-button danger>
                <DeleteOutlined />
                批量删除
              </a-button>
            </a-popconfirm>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 创建/编辑模态框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
      :confirm-loading="modalLoading"
      width="800px"
    >
      <a-form
        ref="modalFormRef"
        :model="modalForm"
        :rules="modalRules"
        layout="vertical"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="折扣名称" name="role_name">
              <a-input 
                v-model:value="modalForm.role_name"
                placeholder="请输入折扣名称"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="折扣类型" name="discount_type">
              <a-select 
                v-model:value="modalForm.discount_type"
                placeholder="选择折扣类型"
              >
                <a-select-option value="percentage">百分比折扣</a-select-option>
                <a-select-option value="fixed">固定金额折扣</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="折扣值" name="discount_value">
              <a-input-number
                v-model:value="modalForm.discount_value"
                :min="0"
                :max="modalForm.discount_type === 'percentage' ? 100 : 999999999"
                :precision="modalForm.discount_type === 'percentage' ? 2 : 0"
                :formatter="modalForm.discount_type === 'fixed' ? formatNumber : undefined"
                :parser="modalForm.discount_type === 'fixed' ? parseNumber : undefined"
                :addonAfter="modalForm.discount_type === 'percentage' ? '%' : 'Rp'"
                style="width: 100%"
                :placeholder="modalForm.discount_type === 'percentage' ? '请输入百分比' : '请输入金额'"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态" name="is_active">
              <a-switch
                v-model:checked="modalForm.is_active"
                checked-children="启用"
                un-checked-children="禁用"
              />
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-form-item label="适用门店" name="store_ids">
          <a-select
            v-model:value="modalForm.store_ids"
            mode="multiple"
            placeholder="选择适用门店（不选择则适用于全公司）"
            style="width: 100%"
            allow-clear
          >
            <a-select-option 
              v-for="store in storeList" 
              :key="store.id" 
              :value="store.id"
            >
              {{ store.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="描述" name="description">
          <a-textarea
            v-model:value="modalForm.description"
            :rows="3"
            placeholder="请输入定价模板的描述信息"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 详情模态框 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="定价模板详情"
      :footer="null"
      width="800px"
    >
      <div class="detail-content" v-if="selectedRecord">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="折扣名称">
            <a-tag color="blue">{{ selectedRecord.role_name }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="折扣类型">
            <a-tag :color="selectedRecord.discount_type === 'percentage' ? 'green' : 'orange'">
              {{ selectedRecord.discount_type === 'percentage' ? '百分比折扣' : '固定金额折扣' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="折扣值">
            <span class="discount-value">
              {{ selectedRecord.discount_type === 'percentage' ? 
                `${selectedRecord.discount_value}%` : 
                `Rp ${formatNumber(selectedRecord.discount_value)}` 
              }}
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="selectedRecord.is_active ? 'green' : 'red'">
              {{ selectedRecord.is_active ? '启用' : '禁用' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="适用门店" :span="2">
            <template v-if="!selectedRecord.store_ids || selectedRecord.store_ids.length === 0">
              <a-tag color="purple">全公司适用</a-tag>
            </template>
            <template v-else>
              <a-tag 
                v-for="storeId in selectedRecord.store_ids" 
                :key="storeId"
                color="blue"
              >
                {{ getStoreName(storeId) }}
              </a-tag>
            </template>
          </a-descriptions-item>
          <a-descriptions-item label="使用统计" :span="2">
            <div class="usage-stats">
              <div class="stat-item">
                <span class="stat-label">使用次数:</span>
                <span class="stat-value">{{ selectedRecord.usage_count || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">节省金额:</span>
                <span class="stat-value text-success">Rp {{ formatNumber(selectedRecord.total_saved || 0) }}</span>
              </div>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="描述" :span="2">
            {{ selectedRecord.description || '暂无描述' }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">
            {{ formatDate(selectedRecord.created_at) }}
          </a-descriptions-item>
          <a-descriptions-item label="更新时间">
            {{ formatDate(selectedRecord.updated_at) }}
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>

    <!-- 复制模态框 -->
    <a-modal
      v-model:open="copyModalVisible"
      title="复制定价模板"
      @ok="handleCopyOk"
      @cancel="handleCopyCancel"
      :confirm-loading="copyLoading"
    >
      <a-form
        ref="copyFormRef"
        :model="copyForm"
        :rules="copyRules"
        layout="vertical"
      >
        <a-form-item label="新折扣名称" name="new_role_name">
          <a-input 
            v-model:value="copyForm.new_role_name"
            placeholder="请输入新折扣名称"
          />
        </a-form-item>
        <a-form-item label="目标门店" name="target_store_ids">
          <a-select
            v-model:value="copyForm.target_store_ids"
            mode="multiple"
            placeholder="选择目标门店（不选择则适用于全公司）"
            style="width: 100%"
            allow-clear
          >
            <a-select-option 
              v-for="store in storeList" 
              :key="store.id" 
              :value="store.id"
            >
              {{ store.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 导入模态框 -->
    <a-modal
      v-model:open="importModalVisible"
      title="批量导入定价模板"
      @ok="handleImportOk"
      @cancel="handleImportCancel"
      :confirm-loading="importLoading"
    >
      <div class="import-content">
        <a-alert
          message="导入说明"
          description="请下载模板文件，填写数据后上传。支持Excel格式文件。"
          type="info"
          show-icon
          style="margin-bottom: 16px"
        />
        <a-button @click="downloadTemplate" style="margin-bottom: 16px">
          <DownloadOutlined />
          下载模板
        </a-button>
        <a-upload
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :remove="handleRemove"
          accept=".xlsx,.xls"
        >
          <a-button>
            <UploadOutlined />
            选择文件
          </a-button>
        </a-upload>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { 
  PlusOutlined, 
  SearchOutlined, 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined,
  DownloadOutlined,
  ImportOutlined,
  UploadOutlined,
  CopyOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons-vue'
import { rolePricingTemplateAPI } from '@/api/multiPayment'
import { storeAPI } from '@/api/store'

const authStore = useAuthStore()

// 权限检查
const hasCreatePermission = computed(() => authStore.hasPermission('role.pricing.create'))
const hasUpdatePermission = computed(() => authStore.hasPermission('role.pricing.edit'))
const hasDeletePermission = computed(() => authStore.hasPermission('role.pricing.delete'))

// 数据状态
const loading = ref(false)
const templateList = ref([])
const storeList = ref([])
const selectedRowKeys = ref([])
const exportLoading = ref(false)

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// 筛选表单
const filterForm = reactive({
  role_name: '',
  store_id: '',
  discount_type: '',
  is_active: undefined
})

// 表格配置
const columns = [
  {
    title: '折扣名称',
    dataIndex: 'role_name',
    key: 'role_name',
    width: 120,
    fixed: 'left'
  },
  {
    title: '折扣信息',
    key: 'discount_info',
    width: 150
  },
  {
    title: '适用门店',
    key: 'store_scope',
    width: 200
  },
  {
    title: '使用统计',
    key: 'usage_stats',
    width: 180
  },
  {
    title: '状态',
    key: 'is_active',
    width: 80
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
    customRender: ({ text }) => formatDate(text)
  },
  {
    title: '操作',
    key: 'actions',
    width: 250,
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

// 模态框状态
const modalVisible = ref(false)
const modalTitle = ref('')
const modalLoading = ref(false)
const modalFormRef = ref()
const detailModalVisible = ref(false)
const copyModalVisible = ref(false)
const copyLoading = ref(false)
const copyFormRef = ref()
const importModalVisible = ref(false)
const importLoading = ref(false)
const fileList = ref([])
const selectedRecord = ref(null)

// 表单数据
const modalForm = reactive({
  role_name: '',
  discount_type: 'percentage',
  discount_value: 0,
  store_ids: [],
  description: '',
  is_active: true
})

const copyForm = reactive({
  new_role_name: '',
  target_store_ids: []
})

// 表单验证规则
const modalRules = {
  role_name: [
    { required: true, message: '请输入折扣名称', trigger: 'blur' }
  ],
  discount_type: [
    { required: true, message: '请选择折扣类型', trigger: 'change' }
  ],
  discount_value: [
    { required: true, message: '请输入折扣值', trigger: 'blur' },
    { type: 'number', min: 0, message: '折扣值不能小于0', trigger: 'blur' },
    { 
      type: 'number', 
      max: 999999999, 
      message: '金额不能超过999,999,999', 
      trigger: 'blur',
      validator: (rule, value) => {
        if (value === null || value === undefined) return true
        const form = rule.field.split('.')[0] // 获取表单引用
        const discountType = modalForm.discount_type
        if (discountType === 'percentage' && value > 100) {
          return Promise.reject(new Error('百分比不能超过100'))
        }
        if (discountType === 'fixed' && value > 999999999) {
          return Promise.reject(new Error('金额不能超过999,999,999'))
        }
        return Promise.resolve()
      }
    }
  ]
}

const copyRules = {
  new_role_name: [
    { required: true, message: '请输入新折扣名称', trigger: 'blur' }
  ]
}

// 初始化
onMounted(() => {
  fetchTemplates()
  fetchStores()
})

// 获取定价模板列表
const fetchTemplates = async () => {
  loading.value = true
  try {
    const params = {
      ...filterForm,
      page: pagination.current,
      page_size: pagination.pageSize
    }
    const response = await rolePricingTemplateAPI.getList(params)
    templateList.value = response.data.data
    pagination.total = response.data.total
  } catch (error) {
    message.error('获取定价模板列表失败')
  } finally {
    loading.value = false
  }
}

// 获取门店列表
const fetchStores = async () => {
  try {
    const response = await storeAPI.getStoreList()
    console.log('门店列表API响应:', response)
    // 处理不同可能的数据结构
    if (response.data) {
      if (Array.isArray(response.data)) {
        storeList.value = response.data
      } else if (response.data.data && Array.isArray(response.data.data)) {
        storeList.value = response.data.data
      } else if (response.data.stores && Array.isArray(response.data.stores)) {
        storeList.value = response.data.stores
      } else {
        storeList.value = []
      }
    } else if (Array.isArray(response)) {
      storeList.value = response
    } else {
      storeList.value = []
    }
    console.log('门店列表数据:', storeList.value)
  } catch (error) {
    console.error('获取门店列表失败:', error)
    message.error('获取门店列表失败')
    storeList.value = []
  }
}

// 获取门店名称
const getStoreName = (storeId) => {
  const store = storeList.value.find(s => s.id === storeId)
  return store ? store.name : '未知门店'
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 格式化数字，添加千分符
const formatNumber = (value) => {
  if (value === null || value === undefined) return ''
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 解析数字，移除千分符
const parseNumber = (value) => {
  if (value === null || value === undefined) return null
  return value.replace(/,/g, '')
}

// 筛选处理
const handleFilter = () => {
  pagination.current = 1
  fetchTemplates()
}

// 重置筛选
const resetFilter = () => {
  Object.assign(filterForm, {
    role_name: '',
    store_id: '',
    discount_type: '',
    is_active: undefined
  })
  pagination.current = 1
  fetchTemplates()
}

// 表格变化处理
const handleTableChange = (pag) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchTemplates()
}

// 显示创建模态框
const showCreateModal = () => {
  modalTitle.value = '新增定价模板'
  resetModalForm()
  modalVisible.value = true
}

// 显示编辑模态框
const showEditModal = (record) => {
  modalTitle.value = '编辑定价模板'
  Object.assign(modalForm, {
    id: record.id,
    role_name: record.role_name,
    discount_type: record.discount_type,
    discount_value: record.discount_value,
    store_ids: record.store_ids || [],
    description: record.description || '',
    is_active: record.is_active
  })
  modalVisible.value = true
}

// 显示详情模态框
const showDetailModal = (record) => {
  selectedRecord.value = record
  detailModalVisible.value = true
}

// 显示复制模态框
const showCopyModal = (record) => {
  selectedRecord.value = record
  copyForm.new_role_name = record.role_name + '_副本'
  copyForm.target_store_ids = []
  copyModalVisible.value = true
}

// 显示导入模态框
const showImportModal = () => {
  fileList.value = []
  importModalVisible.value = true
}

// 重置模态框表单
const resetModalForm = () => {
  Object.assign(modalForm, {
    id: null,
    role_name: '',
    discount_type: 'percentage',
    discount_value: 0,
    store_ids: [],
    description: '',
    is_active: true
  })
}

// 模态框确认
const handleModalOk = async () => {
  try {
    await modalFormRef.value.validate()
    modalLoading.value = true
    
    const data = { ...modalForm }
    if (data.store_ids.length === 0) {
      data.store_ids = null
    }
    
    if (modalForm.id) {
      await rolePricingTemplateAPI.update(modalForm.id, data)
      message.success('更新成功')
    } else {
      await rolePricingTemplateAPI.create(data)
      message.success('创建成功')
    }
    
    modalVisible.value = false
    fetchTemplates()
  } catch (error) {
    if (error.message) {
      message.error(error.message)
    }
  } finally {
    modalLoading.value = false
  }
}

// 模态框取消
const handleModalCancel = () => {
  modalVisible.value = false
  resetModalForm()
}

// 复制确认
const handleCopyOk = async () => {
  try {
    await copyFormRef.value.validate()
    copyLoading.value = true
    
    const data = {
      new_role_name: copyForm.new_role_name,
      target_store_ids: copyForm.target_store_ids.length > 0 ? copyForm.target_store_ids : null
    }
    
    await rolePricingTemplateAPI.copy(selectedRecord.value.id, data)
    message.success('复制成功')
    
    copyModalVisible.value = false
    fetchTemplates()
  } catch (error) {
    message.error('复制失败')
  } finally {
    copyLoading.value = false
  }
}

// 复制取消
const handleCopyCancel = () => {
  copyModalVisible.value = false
  copyForm.new_role_name = ''
  copyForm.target_store_ids = []
}

// 状态切换
const handleStatusChange = async (record) => {
  record.statusLoading = true
  try {
    await rolePricingTemplateAPI.update(record.id, {
      is_active: record.is_active
    })
    message.success('状态更新成功')
  } catch (error) {
    record.is_active = !record.is_active
    message.error('状态更新失败')
  } finally {
    record.statusLoading = false
  }
}

// 删除
const handleDelete = async (id) => {
  try {
    await rolePricingTemplateAPI.delete(id)
    message.success('删除成功')
    fetchTemplates()
  } catch (error) {
    message.error('删除失败')
  }
}

// 批量更新状态
const batchUpdateStatus = async (status) => {
  try {
    await rolePricingTemplateAPI.batchUpdateStatus({
      template_ids: selectedRowKeys.value,
      is_active: status
    })
    message.success('批量更新成功')
    selectedRowKeys.value = []
    fetchTemplates()
  } catch (error) {
    message.error('批量更新失败')
  }
}

// 批量删除
const batchDelete = async () => {
  try {
    await Promise.all(selectedRowKeys.value.map(id => 
      rolePricingTemplateAPI.delete(id)
    ))
    message.success('批量删除成功')
    selectedRowKeys.value = []
    fetchTemplates()
  } catch (error) {
    message.error('批量删除失败')
  }
}

// 导出
const exportTemplates = async () => {
  exportLoading.value = true
  try {
    const response = await rolePricingTemplateAPI.export(filterForm)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', '折扣定价模板.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    message.success('导出成功')
  } catch (error) {
    message.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 下载模板
const downloadTemplate = () => {
  const link = document.createElement('a')
  link.href = '/templates/role-pricing-template.xlsx'
  link.download = '折扣定价模板.xlsx'
  link.click()
}

// 文件上传前处理
const beforeUpload = (file) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                  file.type === 'application/vnd.ms-excel'
  if (!isExcel) {
    message.error('只能上传Excel文件！')
    return false
  }
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isLt2M) {
    message.error('文件大小不能超过2MB！')
    return false
  }
  return false // 阻止自动上传
}

// 移除文件
const handleRemove = (file) => {
  const index = fileList.value.indexOf(file)
  const newFileList = fileList.value.slice()
  newFileList.splice(index, 1)
  fileList.value = newFileList
}

// 导入确认
const handleImportOk = async () => {
  if (fileList.value.length === 0) {
    message.error('请选择要导入的文件')
    return
  }
  
  importLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', fileList.value[0])
    
    await rolePricingTemplateAPI.import(formData)
    message.success('导入成功')
    
    importModalVisible.value = false
    fetchTemplates()
  } catch (error) {
    message.error('导入失败')
  } finally {
    importLoading.value = false
  }
}

// 导入取消
const handleImportCancel = () => {
  importModalVisible.value = false
  fileList.value = []
}
</script>

<style scoped>
.role-pricing-container {
  padding: 0;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-actions h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}

.filter-card {
  margin-bottom: 16px;
}

.discount-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.discount-value {
  font-weight: 600;
  color: #1890ff;
}

.store-scope {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.usage-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: 600;
}

.text-success {
  color: #52c41a;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.batch-operations {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.batch-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.detail-content {
  margin-top: 16px;
}

.import-content {
  text-align: center;
}

/* 金额输入框优化 */
.ant-input-number {
  text-align: right;
}

.ant-input-number-input {
  text-align: right;
}

/* 折扣值显示优化 */
.discount-value {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #1890ff;
}

.text-success {
  color: #52c41a;
  font-family: 'Courier New', monospace;
}
</style> 