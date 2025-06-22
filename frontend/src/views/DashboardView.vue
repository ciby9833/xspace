<template>
  <div class="dashboard">
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card title="用户总数" :bordered="false">
          <a-statistic 
            :value="stats.userCount" 
            :loading="loading"
            suffix="人"
          />
        </a-card>
      </a-col>
      
      <a-col :span="6" v-if="authStore.isPlatformAdmin">
        <a-card title="公司数量" :bordered="false">
          <a-statistic 
            :value="stats.companyCount" 
            :loading="loading"
            suffix="家"
          />
        </a-card>
      </a-col>
      
      <a-col :span="6" v-if="authStore.isPlatformAdmin || authStore.isCompanyAdmin">
        <a-card title="门店数量" :bordered="false">
          <a-statistic 
            :value="stats.storeCount" 
            :loading="loading"
            suffix="家"
          />
        </a-card>
      </a-col>
      
      <a-col :span="6">
        <a-card title="今日订单" :bordered="false">
          <a-statistic 
            :value="stats.todayOrders" 
            :loading="loading"
            suffix="单"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px;">
      <a-col :span="12">
        <a-card title="快速操作" :bordered="false">
          <a-space direction="vertical" style="width: 100%;">
            <a-button 
              type="primary" 
              size="large" 
              block
              @click="$router.push('/users')"
            >
              <UserOutlined />
              用户管理
            </a-button>
            
            <a-button 
              size="large" 
              block
              @click="$router.push('/company')"
              v-if="authStore.isPlatformAdmin"
            >
              <BankOutlined />
              公司管理
            </a-button>
            
            <a-button 
              size="large" 
              block
              @click="resetMyPassword"
            >
              <KeyOutlined />
              修改密码
            </a-button>
          </a-space>
        </a-card>
      </a-col>
      
      <a-col :span="12">
        <a-card title="用户信息" :bordered="false">
          <a-descriptions :column="1">
            <a-descriptions-item label="姓名">
              {{ authStore.user?.name || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="邮箱">
              {{ authStore.user?.email || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="账户级别">
              <a-tag :color="getAccountLevelColor(authStore.accountLevel)">
                {{ getAccountLevelLabel(authStore.accountLevel) }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="角色">
              <a-tag :color="getRoleColor(authStore.userRole)">
                {{ authStore.userRole || '-' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="公司" v-if="authStore.user?.company_name">
              {{ authStore.user?.company_name }}
            </a-descriptions-item>
            <a-descriptions-item label="门店" v-if="authStore.user?.stores && authStore.user.stores.length > 0">
              <div>
                <a-tag v-for="store in authStore.user.stores" :key="store.id" color="green">
                  {{ store.name }}
                </a-tag>
              </div>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>

    <!-- 修改密码弹窗 -->
    <a-modal
      v-model:open="showPasswordModal"
      title="修改密码"
      :ok-button-props="{ loading: changingPassword }"
      @ok="handleChangePassword"
    >
      <a-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        layout="vertical"
      >
        <a-form-item label="当前密码" name="currentPassword">
          <a-input-password 
            v-model:value="passwordForm.currentPassword" 
            placeholder="请输入当前密码"
          />
        </a-form-item>
        
        <a-form-item label="新密码" name="newPassword">
          <a-input-password 
            v-model:value="passwordForm.newPassword" 
            placeholder="请输入新密码"
          />
        </a-form-item>
        
        <a-form-item label="确认新密码" name="confirmPassword">
          <a-input-password 
            v-model:value="passwordForm.confirmPassword" 
            placeholder="请再次输入新密码"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { UserOutlined, BankOutlined, KeyOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { userAPI } from '@/api/user'

const authStore = useAuthStore()

const loading = ref(false)
const showPasswordModal = ref(false)
const changingPassword = ref(false)
const passwordFormRef = ref()

const stats = ref({
  userCount: 0,
  companyCount: 0,
  storeCount: 0,
  todayOrders: 0
})

// 修改密码表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 密码验证规则
const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码' },
    { min: 6, message: '密码长度至少6位' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码' },
    {
      validator: (rule, value) => {
        if (value !== passwordForm.newPassword) {
          return Promise.reject(new Error('两次输入的密码不一致'))
        }
        return Promise.resolve()
      }
    }
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

// 重置密码
const resetMyPassword = () => {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  showPasswordModal.value = true
}

// 处理修改密码
const handleChangePassword = async () => {
  try {
    await passwordFormRef.value.validate()
    
    changingPassword.value = true
    
    // 调用修改密码API
    await userAPI.resetUserPassword(authStore.user.id, passwordForm.newPassword)
    
    message.success('密码修改成功，请重新登录')
    showPasswordModal.value = false
    
    // 修改密码后需要重新登录
    setTimeout(() => {
      authStore.logout()
    }, 1500)
    
  } catch (error) {
    console.error('修改密码失败:', error)
    message.error('修改密码失败')
  } finally {
    changingPassword.value = false
  }
}

// 模拟获取统计数据
const fetchStats = async () => {
  loading.value = true
  try {
    // TODO: 调用真实API获取数据
    await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟API调用
    
    // 根据用户级别显示不同的统计数据
    if (authStore.isPlatformAdmin) {
      stats.value = {
        userCount: 156,
        companyCount: 12,
        storeCount: 45,
        todayOrders: 234
      }
    } else if (authStore.isCompanyAdmin) {
      stats.value = {
        userCount: 23,
        companyCount: 0, // 公司级不显示公司数量
        storeCount: 8,
        todayOrders: 67
      }
    } else {
      stats.value = {
        userCount: 5,
        companyCount: 0,
        storeCount: 0, // 门店级不显示门店数量
        todayOrders: 12
      }
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}
</style> 