<template>
  <div class="user-view">
    <div class="page-header">
      <h2>用户管理</h2>
      <a-button 
        type="primary" 
        @click="showCreateModal = true"
        v-if="canManageUsers"
      >
        <PlusOutlined />
        添加用户
      </a-button>
    </div>

    <!-- 筛选区域 -->
    <a-card class="filter-card" style="margin-bottom: 16px;">
      <a-form layout="inline" :model="filterForm" @finish="handleFilter">
        <a-form-item label="姓名">
          <a-input 
            v-model:value="filterForm.name" 
            placeholder="请输入姓名"
            style="width: 150px"
            allow-clear
          />
        </a-form-item>
        
        <a-form-item label="邮箱">
          <a-input 
            v-model:value="filterForm.email" 
            placeholder="请输入邮箱"
            style="width: 180px"
            allow-clear
          />
        </a-form-item>
        
        <a-form-item label="岗位">
          <a-select 
            v-model:value="filterForm.position" 
            placeholder="选择岗位"
            style="width: 150px"
            allow-clear
          >
            <a-select-option 
              v-for="position in availablePositions" 
              :key="position.value" 
              :value="position.value"
            >
              {{ position.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="角色">
          <a-select 
            v-model:value="filterForm.role_id" 
            placeholder="选择角色"
            style="width: 150px"
            allow-clear
          >
            <a-select-option 
              v-for="role in allRoles" 
              :key="role.id" 
              :value="role.id"
            >
              {{ role.display_name || role.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="门店">
          <a-select 
            v-model:value="filterForm.store_id" 
            placeholder="选择门店"
            style="width: 150px"
            allow-clear
          >
            <a-select-option 
              v-for="store in availableStores" 
              :key="store.id" 
              :value="store.id"
            >
              {{ store.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="状态">
          <a-select 
            v-model:value="filterForm.is_active" 
            placeholder="选择状态"
            style="width: 120px"
            allow-clear
          >
            <a-select-option :value="true">启用</a-select-option>
            <a-select-option :value="false">禁用</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit">
            查询
          </a-button>
          <a-button @click="resetFilter" style="margin-left: 8px">
            重置
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 用户列表 -->
    <a-table 
      :columns="columns" 
      :data-source="users" 
      :loading="loading"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'account_level'">
          <a-tag :color="getAccountLevelColor(record.account_level)">
            {{ getAccountLevelLabel(record.account_level) }}
          </a-tag>
        </template>
        
        <template v-if="column.key === 'role'">
          <a-tag :color="getRoleColor(record.role_display_name || record.role_name)">
            {{ record.role_display_name || record.role_name || '-' }}
          </a-tag>
        </template>
        
        <template v-if="column.key === 'is_active'">
          <a-tag :color="record.is_active ? 'success' : 'default'">
            {{ record.is_active ? '启用' : '禁用' }}
          </a-tag>
        </template>
        
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button size="small" @click="viewUser(record)">
              查看
            </a-button>
            <a-button 
              size="small" 
              type="primary" 
              @click="editUser(record)"
              v-if="canEditUser(record)"
            >
              编辑
            </a-button>
            <a-button 
              size="small" 
              @click="resetPassword(record)"
              v-if="canEditUser(record)"
            >
              重置密码
            </a-button>
            <a-popconfirm
              title="确定要删除这个用户吗？"
              @confirm="deleteUser(record)"
              v-if="canDeleteUser(record)"
            >
              <a-button size="small" danger>
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 创建用户弹窗 -->
    <a-modal
      v-model:open="showCreateModal"
      title="添加用户"
      :ok-button-props="{ loading: submitting }"
      @ok="handleCreateUser"
      width="600px"
    >
      <a-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        layout="vertical"
      >
        <a-form-item label="姓名" name="name">
          <a-input v-model:value="createForm.name" placeholder="请输入姓名" />
        </a-form-item>
        
        <a-form-item label="邮箱" name="email">
          <a-input 
            v-model:value="createForm.email" 
            placeholder="请输入邮箱"
            type="email"
          />
        </a-form-item>
        
        <a-form-item label="手机号" name="phone">
          <a-input 
            v-model:value="createForm.phone" 
            placeholder="请输入印尼手机号（可选）"
            addon-before="+62"
          />
        </a-form-item>
        
        <a-form-item label="岗位" name="position">
          <a-select 
            v-model:value="createForm.position" 
            placeholder="请选择岗位（可选）"
            allow-clear
          >
            <a-select-option 
              v-for="position in availablePositions" 
              :key="position.value" 
              :value="position.value"
            >
              {{ position.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="账户级别" name="account_level">
          <a-select 
            v-model:value="createForm.account_level" 
            placeholder="请选择账户级别"
            :loading="accountLevelsLoading"
            @change="onAccountLevelChange"
          >
            <a-select-option 
              v-for="level in creatableAccountLevels" 
              :key="level" 
              :value="level"
            >
              {{ getAccountLevelLabel(level) }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item 
          label="公司" 
          name="company_id"
          v-if="needCompanySelection"
        >
          <a-select 
            v-model:value="createForm.company_id" 
            placeholder="请选择公司"
            :loading="companiesLoading"
            @change="onCompanyChange"
          >
            <a-select-option 
              v-for="company in availableCompanies" 
              :key="company.id" 
              :value="company.id"
            >
              {{ company.name }}
              <a-tag :color="company.type === '直营' ? 'blue' : 'green'" size="small" style="margin-left: 8px">
                {{ company.type }}
              </a-tag>
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item 
          label="门店" 
          name="store_id"
          v-if="needStoreSelection"
        >
          <a-select 
            v-model:value="createForm.store_id" 
            placeholder="请选择门店"
            :loading="storesLoading"
            mode="multiple"
            allow-clear
          >
            <a-select-option 
              v-for="store in availableStores" 
              :key="store.id" 
              :value="store.id"
            >
              {{ store.name }}
              <span v-if="store.address" style="color: #999; margin-left: 8px;">
                ({{ store.address }})
              </span>
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="角色" name="role_id">
          <a-select 
            v-model:value="createForm.role_id" 
            placeholder="请选择角色"
            :loading="rolesLoading"
          >
            <a-select-option 
              v-for="role in availableRoles" 
              :key="role.id" 
              :value="role.id"
            >
              {{ role.display_name || role.name }}
              <a-tag v-if="role.role_level" :color="getAccountLevelColor(role.role_level)" size="small" style="margin-left: 8px">
                {{ getAccountLevelLabel(role.role_level) }}
              </a-tag>
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="初始密码" name="password">
          <a-input-password 
            v-model:value="createForm.password" 
            placeholder="留空将使用默认密码 temp123456" 
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 用户详情弹窗 -->
    <a-modal
      v-model:open="showDetailModal"
      title="用户详情"
      :footer="null"
      width="600px"
    >
      <div v-if="selectedUser" class="user-detail">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="姓名">{{ selectedUser.name }}</a-descriptions-item>
          <a-descriptions-item label="邮箱">{{ selectedUser.email }}</a-descriptions-item>
          <a-descriptions-item label="手机号">{{ selectedUser.phone || '-' }}</a-descriptions-item>
          <a-descriptions-item label="岗位">{{ selectedUser.position || '-' }}</a-descriptions-item>
          <a-descriptions-item label="账户级别">
            <a-tag :color="getAccountLevelColor(selectedUser.account_level)">
              {{ getAccountLevelLabel(selectedUser.account_level) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="角色">
            <a-tag :color="getRoleColor(selectedUser.role_display_name || selectedUser.role_name)">
              {{ selectedUser.role_display_name || selectedUser.role_name || '-' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="公司">{{ selectedUser.company_name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="门店">
            <div v-if="selectedUser.stores && selectedUser.stores.length > 0">
              <a-tag v-for="store in selectedUser.stores" :key="store.id" color="green">
                {{ store.name }}
              </a-tag>
            </div>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="selectedUser.is_active ? 'success' : 'default'">
              {{ selectedUser.is_active ? '启用' : '禁用' }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">
            {{ selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="最后登录" span="2">
            {{ selectedUser.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString() : '从未登录' }}
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>

    <!-- 编辑用户弹窗 -->
    <a-modal
      v-model:open="showEditModal"
      title="编辑用户"
      :ok-button-props="{ loading: submitting }"
      @ok="handleEditUser"
      width="600px"
    >
      <a-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        layout="vertical"
      >
        <a-form-item label="姓名" name="name">
          <a-input v-model:value="editForm.name" placeholder="请输入姓名" />
        </a-form-item>
        
        <a-form-item label="邮箱" name="email">
          <a-input 
            v-model:value="editForm.email" 
            placeholder="请输入邮箱"
            type="email"
          />
        </a-form-item>
        
        <a-form-item label="手机号" name="phone">
          <a-input 
            v-model:value="editForm.phone" 
            placeholder="请输入印尼手机号（可选）"
            addon-before="+62"
          />
        </a-form-item>
        
        <a-form-item label="岗位" name="position">
          <a-select 
            v-model:value="editForm.position" 
            placeholder="请选择岗位（可选）"
            allow-clear
          >
            <a-select-option 
              v-for="position in availablePositions" 
              :key="position.value" 
              :value="position.value"
            >
              {{ position.label }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="账户级别" name="account_level">
          <a-select 
            v-model:value="editForm.account_level" 
            placeholder="请选择账户级别"
            :loading="accountLevelsLoading"
            :disabled="!canChangeUserAccountLevel(selectedUser)"
            @change="onEditAccountLevelChange"
          >
            <a-select-option 
              v-for="level in creatableAccountLevels" 
              :key="level" 
              :value="level"
            >
              {{ getAccountLevelLabel(level) }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="角色" name="role_id">
          <a-select 
            v-model:value="editForm.role_id" 
            placeholder="请选择角色"
            :loading="rolesLoading"
            :disabled="!canChangeUserRole(selectedUser)"
          >
            <a-select-option 
              v-for="role in availableRoles" 
              :key="role.id" 
              :value="role.id"
            >
              {{ role.display_name || role.name }}
              <a-tag v-if="role.role_level" :color="getAccountLevelColor(role.role_level)" size="small" style="margin-left: 8px">
                {{ getAccountLevelLabel(role.role_level) }}
              </a-tag>
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item 
          label="门店" 
          name="stores"
          v-if="editForm.account_level === 'store'"
        >
          <a-select 
            v-model:value="editForm.stores" 
            placeholder="请选择门店"
            :loading="storesLoading"
            mode="multiple"
            allow-clear
          >
            <a-select-option 
              v-for="store in availableStores" 
              :key="store.id" 
              :value="store.id"
            >
              {{ store.name }}
              <span v-if="store.address" style="color: #999; margin-left: 8px;">
                ({{ store.address }})
              </span>
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="状态" name="is_active">
          <a-switch 
            v-model:checked="editForm.is_active" 
            checked-children="启用" 
            un-checked-children="禁用" 
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 重置密码弹窗 -->
    <a-modal
      v-model:open="showResetPasswordModal"
      title="重置密码"
      :ok-button-props="{ loading: resettingPassword }"
      @ok="handleResetPassword"
    >
      <div style="margin-bottom: 16px;">
        <strong>用户：</strong>{{ selectedUser?.name }} ({{ selectedUser?.email }})
      </div>
      
      <a-form layout="vertical">
        <a-form-item label="新密码">
          <a-input-password 
            v-model:value="newPassword" 
            placeholder="请输入新密码，留空将使用默认密码 temp123456"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { userAPI } from '@/api/user'

const authStore = useAuthStore()

const loading = ref(false)
const submitting = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDetailModal = ref(false)
const showResetPasswordModal = ref(false)
const resettingPassword = ref(false)
const rolesLoading = ref(false)
const companiesLoading = ref(false)
const storesLoading = ref(false)
const accountLevelsLoading = ref(false)
const users = ref([])
const availableRoles = ref([])
const availableCompanies = ref([])
const availableStores = ref([])
const availablePositions = ref([])
const creatableAccountLevels = ref([])
const allRoles = ref([]) // 用于筛选的所有角色
const selectedUser = ref(null)
const newPassword = ref('')
const createFormRef = ref()
const editFormRef = ref()

// 表格列配置
const columns = [
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: '手机号',
    dataIndex: 'phone',
    key: 'phone',
    customRender: ({ text }) => text || '-'
  },
  {
    title: '岗位',
    dataIndex: 'position',
    key: 'position',
    customRender: ({ text }) => text || '-'
  },
  {
    title: '账户级别',
    dataIndex: 'account_level',
    key: 'account_level',
  },
  {
    title: '角色',
    dataIndex: 'role_display_name',
    key: 'role',
  },
  {
    title: '公司',
    dataIndex: 'company_name',
    key: 'company_name',
    customRender: ({ text }) => text || '-'
  },
  {
    title: '门店',
    dataIndex: 'stores',
    key: 'stores',
    customRender: ({ record }) => {
      if (record.stores && record.stores.length > 0) {
        return record.stores.map(store => store.name).join(', ')
      }
      return '-'
    }
  },
  {
    title: '状态',
    dataIndex: 'is_active',
    key: 'is_active',
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    customRender: ({ text }) => text ? new Date(text).toLocaleDateString() : '-'
  },
  {
    title: '操作',
    key: 'action',
  },
]

// 筛选表单数据
const filterForm = reactive({
  name: '',
  email: '',
  position: '',
  role_id: '',
  store_id: '',
  is_active: undefined
})

// 创建表单数据
const createForm = reactive({
  name: '',
  email: '',
  phone: '',
  position: '',
  account_level: '',
  role_id: '',
  store_id: [],
  password: '',
  company_id: ''
})

// 编辑表单数据
const editForm = reactive({
  name: '',
  email: '',
  phone: '',
  position: '',
  account_level: '',
  role_id: '',
  stores: [],
  is_active: true
})

// 计算属性
const needCompanySelection = computed(() => {
  return authStore.isPlatformAdmin && 
         createForm.account_level && 
         createForm.account_level !== 'platform'
})

const needStoreSelection = computed(() => {
  return createForm.account_level === 'store'
})

// 印尼手机号验证函数
const validateIndonesianPhone = (rule, value) => {
  if (!value) return Promise.resolve() // 手机号是可选的
  
  // 印尼手机号格式验证
  const phoneRegex = /^8[1-9][0-9]{6,9}$/
  if (!phoneRegex.test(value)) {
    return Promise.reject(new Error('请输入有效的印尼手机号（8开头，8-12位数字）'))
  }
  return Promise.resolve()
}

// 表单验证规则
const createRules = {
  name: [
    { required: true, message: '请输入姓名' }
  ],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入正确的邮箱格式' }
  ],
  phone: [
    { validator: validateIndonesianPhone }
  ],
  company_id: [
    { 
      required: computed(() => needCompanySelection.value), 
      message: '创建公司级或门店级账户时必须选择公司' 
    }
  ],
  account_level: [
    { required: true, message: '请选择账户级别' }
  ],
  role_id: [
    { required: true, message: '请选择角色' }
  ]
}

// 编辑表单验证规则
const editRules = {
  name: [
    { required: true, message: '请输入姓名' }
  ],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入正确的邮箱格式' }
  ],
  phone: [
    { validator: validateIndonesianPhone }
  ],
  account_level: [
    { required: true, message: '请选择账户级别' }
  ],
  role_id: [
    { required: true, message: '请选择角色' }
  ]
}

// 获取账户级别颜色
const getAccountLevelColor = (level) => {
  const colors = {
    'platform': 'purple',
    'company': 'blue',
    'store': 'green'
  }
  return colors[level] || 'default'
}

// 获取账户级别标签
const getAccountLevelLabel = (level) => {
  const labels = {
    'platform': '平台级',
    'company': '公司级',
    'store': '门店级'
  }
  return labels[level] || level
}

// 获取角色颜色
const getRoleColor = (role) => {
  const colors = {
    'superadmin': 'purple',
    'admin': 'blue',
    'manager': 'green',
    'supervisor': 'orange',
    'service': 'cyan',
    'host': 'gold'
  }
  return colors[role] || 'default'
}

// 检查是否可以管理用户
const canManageUsers = computed(() => {
  // 简化权限检查：基于账户层级
  return authStore.accountLevel === 'platform' || 
         authStore.accountLevel === 'company' || 
         authStore.accountLevel === 'store'
})

// 权限检查函数（基于账户层级）
const canEditUser = (user) => {
  // 不能编辑比自己级别高的用户
  const levelHierarchy = { 'store': 1, 'company': 2, 'platform': 3 }
  const currentLevel = levelHierarchy[authStore.accountLevel] || 1
  const targetLevel = levelHierarchy[user.account_level] || 1
  
  if (currentLevel < targetLevel) {
    return false
  }
  
  // 公司级用户只能编辑本公司用户
  if (authStore.accountLevel === 'company' && user.company_id !== authStore.companyId) {
    return false
  }
  
  // 门店级用户只能编辑本门店用户
  if (authStore.accountLevel === 'store' && user.account_level !== 'store') {
    return false
  }
  
  return true
}

const canChangeUserRole = (user) => {
  return canEditUser(user)
}

const canChangeUserAccountLevel = (user) => {
  // 只有平台级账户可以修改账户级别
  return authStore.isPlatformAdmin
}

const canDeleteUser = (user) => {
  // 不能删除自己
  if (user.id === authStore.user?.id) {
    return false
  }
  
  // 不能删除平台级用户
  if (user.account_level === 'platform') {
    return false
  }
  
  // 只有上级账户可以删除下级账户
  const levelHierarchy = { 'store': 1, 'company': 2, 'platform': 3 }
  const currentLevel = levelHierarchy[authStore.accountLevel] || 1
  const targetLevel = levelHierarchy[user.account_level] || 1
  
  return currentLevel > targetLevel
}

// 获取可创建的账户级别列表
const fetchCreatableAccountLevels = async () => {
  try {
    accountLevelsLoading.value = true
    const response = await userAPI.getCreatableAccountLevels()
    
    const data = response.data || response
    if (data.creatable_levels) {
      creatableAccountLevels.value = data.creatable_levels
    } else {
      // 使用前端的备用逻辑
      const levels = getCreatableAccountLevels()
      creatableAccountLevels.value = levels
    }
  } catch (error) {
    console.error('获取可创建账户级别失败:', error)
    // 使用前端的备用逻辑
    const levels = getCreatableAccountLevels()
    creatableAccountLevels.value = levels
  } finally {
    accountLevelsLoading.value = false
  }
}

// 前端备用逻辑：获取可创建的账户级别
const getCreatableAccountLevels = () => {
  const currentLevel = authStore.accountLevel
  
  if (currentLevel === 'platform') {
    return ['platform', 'company', 'store']
  } else if (currentLevel === 'company') {
    return ['company', 'store']
  } else {
    return ['store']
  }
}

// 获取角色列表 - 根据账户层级动态获取
const fetchRoles = async (accountLevel = null, companyId = null) => {
  try {
    rolesLoading.value = true
    
    if (accountLevel) {
      // 根据指定的账户层级获取角色
      const response = await userAPI.getRolesByAccountLevel(accountLevel, companyId)
      availableRoles.value = response.data || []
    } else {
      // 获取当前用户可管理的所有角色（向后兼容）
      const response = await userAPI.getManageableRoles()
      availableRoles.value = response.data || []
    }
  } catch (error) {
    console.error('获取角色列表失败:', error)
    message.error('获取角色列表失败')
  } finally {
    rolesLoading.value = false
  }
}

// 获取公司列表
const fetchCompanies = async () => {
  try {
    companiesLoading.value = true
    const response = await userAPI.getAvailableCompanies()
    availableCompanies.value = response.data || []
  } catch (error) {
    console.error('获取可选公司列表失败:', error)
    message.error('获取可选公司列表失败')
  } finally {
    companiesLoading.value = false
  }
}

// 获取门店列表
const fetchStores = async (companyId = null) => {
  try {
    storesLoading.value = true
    const response = await userAPI.getAvailableStores(companyId)
    availableStores.value = response.data || []
  } catch (error) {
    console.error('获取可选门店列表失败:', error)
    message.error('获取可选门店列表失败')
  } finally {
    storesLoading.value = false
  }
}

// 获取岗位列表
const fetchPositions = async () => {
  try {
    const response = await userAPI.getAvailablePositions()
    availablePositions.value = response.data || []
  } catch (error) {
    console.error('获取可选岗位列表失败:', error)
    message.error('获取可选岗位列表失败')
  }
}

// 获取用户列表
const fetchUsers = async (filters = {}) => {
  loading.value = true
  try {
    const response = await userAPI.getUserList(filters)
    users.value = response.data || []
  } catch (error) {
    console.error('获取用户列表失败:', error)
    message.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// 账户级别变化处理
const onAccountLevelChange = (value) => {
  // 清空公司、门店和角色选择
  createForm.company_id = ''
  createForm.store_id = []
  createForm.role_id = ''
  
  // 根据账户层级获取对应的角色
  const companyId = needCompanySelection.value ? createForm.company_id : authStore.companyId
  fetchRoles(value, companyId)
  
  // 如果是门店级，需要加载门店列表
  if (value === 'store') {
    const targetCompanyId = authStore.isPlatformAdmin ? createForm.company_id : authStore.companyId
    if (targetCompanyId) {
      fetchStores(targetCompanyId)
    }
  }
}

// 公司变化处理
const onCompanyChange = (companyId) => {
  // 清空门店和角色选择
  createForm.store_id = []
  createForm.role_id = ''
  
  // 重新获取角色（基于当前账户层级和新选择的公司）
  if (createForm.account_level) {
    fetchRoles(createForm.account_level, companyId)
  }
  
  // 如果是门店级，重新加载门店列表
  if (createForm.account_level === 'store') {
    fetchStores(companyId)
  }
}

// 编辑时账户级别变化处理
const onEditAccountLevelChange = (value) => {
  editForm.stores = []
  editForm.role_id = ''
  
  // 根据新的账户层级获取对应的角色
  const companyId = selectedUser.value?.company_id || authStore.companyId
  fetchRoles(value, companyId)
  
  if (value === 'store') {
    if (companyId) {
      fetchStores(companyId)
    }
  }
}

// 创建用户
const handleCreateUser = async () => {
  try {
    await createFormRef.value.validate()
    
    // 处理手机号格式（加上+62前缀）
    const submitData = { ...createForm }
    if (submitData.phone && !submitData.phone.startsWith('+62')) {
      submitData.phone = `+62${submitData.phone}`
    }
    
    // 处理公司ID：如果是空字符串则删除该字段
    if (!submitData.company_id || submitData.company_id.trim() === '') {
      if (authStore.companyId) {
        submitData.company_id = authStore.companyId
      } else {
        delete submitData.company_id
      }
    }
    
    // 处理门店ID：如果是空数组则删除该字段
    if (!submitData.store_id || (Array.isArray(submitData.store_id) && submitData.store_id.length === 0)) {
      delete submitData.store_id
    }
    
    submitting.value = true
    await userAPI.createUser(submitData)
    
    message.success('用户创建成功')
    showCreateModal.value = false
    
    // 重置表单
    Object.keys(createForm).forEach(key => {
      if (Array.isArray(createForm[key])) {
        createForm[key] = []
      } else {
        createForm[key] = ''
      }
    })
    
    // 刷新列表
    await fetchUsers()
    
  } catch (error) {
    console.error('创建用户失败:', error)
  } finally {
    submitting.value = false
  }
}

// 查看用户
const viewUser = async (record) => {
  try {
    const response = await userAPI.getUserDetail(record.id)
    selectedUser.value = response.data
    showDetailModal.value = true
  } catch (error) {
    console.error('获取用户详情失败:', error)
    message.error('获取用户详情失败')
  }
}

// 筛选处理
const handleFilter = () => {
  const filters = {}
  
  // 构建筛选参数
  Object.keys(filterForm).forEach(key => {
    if (filterForm[key] !== '' && filterForm[key] !== undefined && filterForm[key] !== null) {
      filters[key] = filterForm[key]
    }
  })
  
  fetchUsers(filters)
}

// 重置筛选
const resetFilter = () => {
  Object.keys(filterForm).forEach(key => {
    if (key === 'is_active') {
      filterForm[key] = undefined
    } else {
      filterForm[key] = ''
    }
  })
  fetchUsers()
}

// 编辑用户
const editUser = async (record) => {
  // 填充编辑表单
  editForm.name = record.name || ''
  editForm.email = record.email || ''
  editForm.phone = record.phone || ''
  editForm.position = record.position || ''
  editForm.account_level = record.account_level || ''
  editForm.role_id = record.role_id || ''
  editForm.stores = record.stores ? record.stores.map(s => s.id) : []
  editForm.is_active = record.is_active !== undefined ? record.is_active : true
  
  // 处理手机号格式（去掉+62前缀显示）
  if (editForm.phone && editForm.phone.startsWith('+62')) {
    editForm.phone = editForm.phone.substring(3)
  }
  
  selectedUser.value = record
  showEditModal.value = true
  
  // 根据用户的账户层级获取对应的角色列表
  await fetchRoles(record.account_level, record.company_id)
  
  // 如果是门店级用户，加载门店列表
  if (record.account_level === 'store') {
    fetchStores(record.company_id)
  }
}

// 处理编辑用户
const handleEditUser = async () => {
  try {
    await editFormRef.value.validate()
    
    // 处理手机号格式（加上+62前缀）
    const submitData = { ...editForm }
    if (submitData.phone && !submitData.phone.startsWith('+62')) {
      submitData.phone = `+62${submitData.phone}`
    }
    
    submitting.value = true
    await userAPI.updateUser(selectedUser.value.id, submitData)
    
    message.success('用户更新成功')
    showEditModal.value = false
    
    // 刷新列表
    await fetchUsers()
    
  } catch (error) {
    console.error('更新用户失败:', error)
    message.error(error.response?.data?.error || '更新用户失败')
  } finally {
    submitting.value = false
  }
}

// 删除用户
const deleteUser = async (record) => {
  try {
    await userAPI.deleteUser(record.id)
    message.success('用户删除成功')
    
    // 刷新用户列表
    await fetchUsers()
  } catch (error) {
    console.error('删除用户失败:', error)
    message.error(error.response?.data?.error || '删除用户失败')
  }
}

// 重置密码
const resetPassword = (user) => {
  selectedUser.value = user
  newPassword.value = ''
  showResetPasswordModal.value = true
}

// 处理重置密码
const handleResetPassword = async () => {
  try {
    resettingPassword.value = true
    await userAPI.resetUserPassword(selectedUser.value.id, newPassword.value)
    message.success('密码重置成功')
    showResetPasswordModal.value = false
  } catch (error) {
    console.error('重置密码失败:', error)
    message.error('重置密码失败')
  } finally {
    resettingPassword.value = false
  }
}

// 监听创建弹窗打开，清空表单
watch(showCreateModal, (newVal) => {
  if (newVal) {
    // 清空表单
    Object.keys(createForm).forEach(key => {
      if (Array.isArray(createForm[key])) {
        createForm[key] = []
      } else {
        createForm[key] = ''
      }
    })
    
    // 清空角色列表，等待用户选择账户层级后再加载
    availableRoles.value = []
    
    // 预加载门店列表（如果需要）
    if (authStore.accountLevel !== 'platform') {
      fetchStores(authStore.companyId)
    }
  }
})

onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchRoles(), // 初始加载时不指定层级，获取当前用户可管理的所有角色
    fetchCompanies(),
    fetchCreatableAccountLevels(),
    fetchPositions(),
    fetchStores() // 初始化时加载门店列表用于筛选
  ])
  
  // 同时获取所有角色用于筛选
  try {
    const response = await userAPI.getManageableRoles()
    allRoles.value = response.data || []
  } catch (error) {
    console.error('获取所有角色失败:', error)
  }
})
</script>

<style scoped>
.user-view {
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

.user-detail {
  margin-top: 16px;
}

.user-detail .ant-descriptions-item-label {
  font-weight: 600;
}
</style> 