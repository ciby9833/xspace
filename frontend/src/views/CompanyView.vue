<template>
  <div class="company-view">
    <div class="page-header">
      <h2>公司管理</h2>
      <a-button 
        type="primary" 
        @click="showCreateModal = true"
        v-if="authStore.hasPermission('company.create') && authStore.isPlatformAdmin"
      >
        <PlusOutlined />
        创建公司
      </a-button>
    </div>

    <!-- 公司列表 -->
    <a-table 
      :columns="columns" 
      :data-source="companies" 
      :loading="loading"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          <a-tag :color="record.type === '直营' ? 'blue' : 'green'">
            {{ record.type }}
          </a-tag>
        </template>
        
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === 'active' ? 'success' : 'default'">
            {{ record.status === 'active' ? '启用' : '禁用' }}
          </a-tag>
        </template>
        
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button 
              size="small" 
              @click="viewCompany(record)"
              v-if="authStore.hasPermission('company.view')"
            >
              查看
            </a-button>
            <a-button 
              size="small" 
              type="primary" 
              @click="editCompany(record)"
              v-if="authStore.hasPermission('company.edit')"
            >
              编辑
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 创建公司弹窗 -->
    <a-modal
      v-model:open="showCreateModal"
      title="创建公司"
      :ok-button-props="{ loading: submitting }"
      @ok="handleCreateCompany"
    >
      <a-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        layout="vertical"
      >
        <a-form-item label="公司名称" name="company_name">
          <a-input v-model:value="createForm.company_name" placeholder="请输入公司名称" />
        </a-form-item>
        
        <a-form-item label="公司类型" name="company_type">
          <a-select v-model:value="createForm.company_type" placeholder="请选择公司类型">
            <a-select-option value="直营">直营</a-select-option>
            <a-select-option value="加盟">加盟</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="联系人" name="contact_name">
          <a-input v-model:value="createForm.contact_name" placeholder="请输入联系人姓名" />
        </a-form-item>
        
        <a-form-item label="联系邮箱" name="contact_email">
          <a-input 
            v-model:value="createForm.contact_email" 
            placeholder="请输入联系邮箱（可选）"
            type="email"
          />
        </a-form-item>
        
        <a-form-item label="联系电话" name="contact_phone">
          <a-input 
            v-model:value="createForm.contact_phone" 
            placeholder="请输入联系电话（可选）"
            addon-before="+62"
          />
        </a-form-item>
        
        <a-divider>管理员账号信息</a-divider>
        
        <a-form-item label="管理员姓名" name="admin_name">
          <a-input v-model:value="createForm.admin_name" placeholder="请输入管理员姓名" />
        </a-form-item>
        
        <a-form-item label="管理员邮箱" name="admin_email">
          <a-input 
            v-model:value="createForm.admin_email" 
            placeholder="请输入管理员邮箱"
            type="email"
          />
        </a-form-item>
        
        <a-form-item label="管理员手机号" name="admin_phone">
          <a-input 
            v-model:value="createForm.admin_phone" 
            placeholder="请输入管理员手机号（可选）"
            addon-before="+62"
          />
        </a-form-item>
        
        <a-form-item label="初始密码" name="admin_password">
          <a-input-password v-model:value="createForm.admin_password" placeholder="请设置初始密码" />
        </a-form-item>
        
        <a-form-item label="账户级别" name="admin_account_level">
          <a-select 
            v-model:value="createForm.admin_account_level" 
            placeholder="请选择管理员账户级别"
            :disabled="!authStore.isPlatformAdmin"
          >
            <a-select-option value="company">公司级账户</a-select-option>
            <a-select-option value="store" v-if="authStore.isPlatformAdmin">门店级账户</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 查看公司弹窗 -->
    <a-modal
      v-model:open="showViewModal"
      title="公司详情"
      :footer="null"
      width="600px"
    >
      <a-descriptions bordered>
        <a-descriptions-item label="公司名称" :span="3">
          {{ currentCompany?.name }}
        </a-descriptions-item>
        <a-descriptions-item label="公司类型" :span="3">
          <a-tag :color="currentCompany?.type === '直营' ? 'blue' : 'green'">
            {{ currentCompany?.type }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="联系人" :span="3">
          {{ currentCompany?.contact_name }}
        </a-descriptions-item>
        <a-descriptions-item label="联系邮箱" :span="3">
          {{ currentCompany?.contact_email || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="联系电话" :span="3">
          {{ currentCompany?.contact_phone || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="门店数" :span="3">
          {{ currentCompany?.store_count }}
        </a-descriptions-item>
        <a-descriptions-item label="员工数" :span="3">
          {{ currentCompany?.user_count }}
        </a-descriptions-item>
        <a-descriptions-item label="状态" :span="3">
          <a-tag :color="currentCompany?.status === 'active' ? 'success' : 'default'">
            {{ currentCompany?.status === 'active' ? '启用' : '禁用' }}
          </a-tag>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>

    <!-- 编辑公司弹窗 -->
    <a-modal
      v-model:open="showEditModal"
      title="编辑公司"
      :ok-button-props="{ loading: submitting }"
      @ok="handleEditSubmit"
    >
      <a-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        layout="vertical"
      >
        <a-form-item label="公司名称" name="name">
          <a-input v-model:value="editForm.name" placeholder="请输入公司名称" />
        </a-form-item>
        
        <a-form-item label="联系人" name="contact_name">
          <a-input v-model:value="editForm.contact_name" placeholder="请输入联系人姓名" />
        </a-form-item>
        
        <a-form-item label="联系邮箱" name="contact_email">
          <a-input 
            v-model:value="editForm.contact_email" 
            placeholder="请输入联系邮箱（可选）"
            type="email"
          />
        </a-form-item>
        
        <a-form-item label="联系电话" name="contact_phone">
          <a-input 
            v-model:value="editForm.contact_phone" 
            placeholder="请输入联系电话（可选）"
            addon-before="+62"
          />
        </a-form-item>
        
        <a-form-item label="状态" name="status">
          <a-select v-model:value="editForm.status">
            <a-select-option value="active">启用</a-select-option>
            <a-select-option value="inactive">禁用</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue'
import { message, Tag, Button } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { companyAPI } from '@/api/company'

const authStore = useAuthStore()

const loading = ref(false)
const submitting = ref(false)
const showCreateModal = ref(false)
const showViewModal = ref(false)
const showEditModal = ref(false)
const companies = ref([])
const createFormRef = ref()
const editFormRef = ref()
const currentCompany = ref(null)

// 表格列配置
const columns = [
  {
    title: '公司名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    customRender: ({ text }) => text || '-'
  },
  {
    title: '联系人',
    dataIndex: 'contact_name',
    key: 'contact_name',
    customRender: ({ text }) => text || '-'
  },
  {
    title: '联系电话',
    dataIndex: 'contact_phone',
    key: 'contact_phone',
    customRender: ({ text }) => text || '-'
  },
  {
    title: '联系邮箱',
    dataIndex: 'contact_email',
    key: 'contact_email',
    customRender: ({ text }) => text || '-'
  },
  {
    title: '门店数量',
    dataIndex: 'store_count',
    key: 'store_count',
    customRender: ({ text }) => text || 0
  },
  {
    title: '用户数量',
    dataIndex: 'user_count',
    key: 'user_count',
    customRender: ({ text }) => text || 0
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    customRender: ({ text }) => {
      const statusMap = {
        active: { text: '正常', color: 'success' },
        inactive: { text: '停用', color: 'error' }
      }
      const status = statusMap[text] || { text: '未知', color: 'default' }
      return h(Tag, { color: status.color }, () => status.text)
    }
  },
  {
    title: '操作',
    key: 'action',
    customRender: ({ record }) => {
      const canEdit = authStore.hasPermission('company.edit') || 
                     authStore.hasPermission('company.*') ||
                     authStore.isPlatformAdmin
      
      return h('div', { class: 'action-buttons' }, [
        h(Button, {
          type: 'link',
          onClick: () => showCompanyDetail(record)
        }, () => '查看'),
        canEdit && h(Button, {
          type: 'link',
          onClick: () => handleEdit(record)
        }, () => '编辑')
      ])
    }
  }
]

// 创建表单数据
const createForm = reactive({
  company_name: '',
  company_type: '加盟',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  admin_name: '',
  admin_email: '',
  admin_phone: '',
  admin_password: '',
  admin_account_level: 'company'
})

// 编辑表单数据
const editForm = reactive({
  name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  status: 'active'
})

// 印尼手机号验证函数
const validateIndonesianPhone = (rule, value) => {
  if (!value) return Promise.resolve() // 手机号是可选的
  
  const phoneRegex = /^8[1-9][0-9]{6,9}$/
  if (!phoneRegex.test(value)) {
    return Promise.reject(new Error('请输入有效的印尼手机号（8开头，8-12位数字）'))
  }
  return Promise.resolve()
}

// 表单验证规则
const createRules = {
  company_name: [
    { required: true, message: '请输入公司名称' }
  ],
  contact_name: [
    { required: true, message: '请输入联系人姓名' }
  ],
  contact_email: [
    { type: 'email', message: '请输入正确的邮箱格式' }
  ],
  contact_phone: [
    { validator: validateIndonesianPhone }
  ],
  admin_name: [
    { required: true, message: '请输入管理员姓名' }
  ],
  admin_email: [
    { required: true, message: '请输入管理员邮箱' },
    { type: 'email', message: '请输入正确的邮箱格式' }
  ],
  admin_phone: [
    { validator: validateIndonesianPhone }
  ],
  admin_password: [
    { required: true, message: '请输入初始密码' },
    { min: 6, message: '密码长度至少6位' }
  ],
  admin_account_level: [
    { required: true, message: '请选择管理员账户级别' }
  ]
}

// 编辑表单验证规则
const editRules = {
  name: [
    { required: true, message: '请输入公司名称' }
  ],
  contact_name: [
    { required: true, message: '请输入联系人姓名' }
  ],
  contact_email: [
    { type: 'email', message: '请输入正确的邮箱格式' }
  ],
  contact_phone: [
    { validator: validateIndonesianPhone }
  ]
}

// 获取公司列表
const fetchCompanies = async () => {
  try {
    loading.value = true
    const response = await companyAPI.getCompanyList()
    
    if (response.success && response.data) {
      // 直接使用后端返回的数据，不需要在前端做权限过滤
      companies.value = Array.isArray(response.data) ? response.data : [response.data]
    } else {
      companies.value = []
      message.warning('暂无公司数据')
    }
  } catch (error) {
    console.error('获取公司列表失败:', error)
    message.error('获取公司列表失败')
    companies.value = []
  } finally {
    loading.value = false
  }
}

// 创建公司
const handleCreateCompany = async () => {
  try {
    await createFormRef.value.validate()
    
    // 映射字段名到后端期望的格式
    const submitData = {
      name: createForm.company_name,
      type: createForm.company_type,
      contact_name: createForm.contact_name,
      contact_email: createForm.contact_email,
      contact_phone: createForm.contact_phone,
      admin_name: createForm.admin_name,
      admin_email: createForm.admin_email,
      admin_password: createForm.admin_password,
      admin_account_level: createForm.admin_account_level
    }
    
    // 处理手机号格式
    if (submitData.contact_phone && submitData.contact_phone.length > 0) {
      // 如果用户输入的是8开头的号码，加上0前缀
      if (submitData.contact_phone.startsWith('8')) {
        submitData.contact_phone = `0${submitData.contact_phone}`
      }
    }
    
    submitting.value = true
    const response = await companyAPI.createCompany(submitData)
    console.log('创建公司响应:', response) // 添加调试日志
    
    message.success('公司创建成功')
    showCreateModal.value = false
    
    // 重置表单
    Object.keys(createForm).forEach(key => {
      if (key === 'company_type') {
        createForm[key] = '加盟'
      } else if (key === 'admin_account_level') {
        createForm[key] = 'company'
      } else {
        createForm[key] = ''
      }
    })
    
    // 刷新列表
    await fetchCompanies()
    
  } catch (error) {
    console.error('创建公司失败:', error)
    
    // 处理验证错误
    if (error.response && error.response.status === 400 && error.response.data.details) {
      const details = error.response.data.details
      const errorMessages = details.map(detail => detail.msg).join('；')
      message.error(`参数验证失败：${errorMessages}`)
    } else if (error.response && error.response.data.error) {
      message.error(error.response.data.error)
    } else {
      message.error('创建公司失败')
    }
  } finally {
    submitting.value = false
  }
}

// 查看公司
const viewCompany = (record) => {
  showViewModal.value = true
  currentCompany.value = record
}

// 编辑公司
const editCompany = (record) => {
  showEditModal.value = true
  currentCompany.value = record
  editForm.name = record.name
  editForm.contact_name = record.contact_name
  editForm.contact_email = record.contact_email
  editForm.contact_phone = record.contact_phone
  editForm.status = record.status
}

// 处理编辑提交
const handleEditSubmit = async () => {
  try {
    await editFormRef.value.validate()
    
    submitting.value = true
    const response = await companyAPI.updateCompany(currentCompany.value.id, editForm)
    
    message.success('更新公司信息成功')
    showEditModal.value = false
    
    // 刷新列表
    await fetchCompanies()
    
  } catch (error) {
    console.error('更新公司信息失败:', error)
    if (error.response?.data?.error) {
      message.error(error.response.data.error)
    } else {
      message.error('更新公司信息失败')
    }
  } finally {
    submitting.value = false
  }
}

// 查看公司详情
const showCompanyDetail = (company) => {
  currentCompany.value = company
  showViewModal.value = true
}

// 编辑公司
const handleEdit = async (company) => {
  showEditModal.value = true
  currentCompany.value = company
  editForm.name = company.name
  editForm.contact_name = company.contact_name
  editForm.contact_email = company.contact_email
  editForm.contact_phone = company.contact_phone
  editForm.status = company.status
}

onMounted(() => {
  fetchCompanies()
})
</script>

<style scoped>
.company-view {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
}
</style> 