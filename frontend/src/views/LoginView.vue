<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>{{ appTitle }}</h1>
        <p>请登录您的账户</p>
      </div>
      
      <a-form
        :model="loginForm"
        :rules="rules"
        @finish="handleLogin"
        layout="vertical"
      >
        <a-form-item label="邮箱" name="email">
          <a-input 
            v-model:value="loginForm.email"
            placeholder="请输入邮箱"
            size="large"
            type="email"
          />
        </a-form-item>
        
        <a-form-item label="密码" name="password">
          <a-input-password 
            v-model:value="loginForm.password"
            placeholder="请输入密码"
            size="large"
          />
        </a-form-item>
        
        <a-form-item>
          <a-button 
            type="primary" 
            html-type="submit" 
            size="large"
            :loading="loading"
            block
          >
            登录
          </a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const appTitle = import.meta.env.VITE_APP_TITLE || 'XSpace 管理系统'

const loading = ref(false)

// 表单数据
const loginForm = reactive({
  email: '',
  password: ''
})

// 表单验证规则
const rules = {
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入正确的邮箱格式' }
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码长度至少6位' }
  ]
}

// 处理登录
const handleLogin = async () => {
  if (loading.value) return // 防止重复提交
  
  loading.value = true
  
  try {
    const response = await authStore.login(loginForm)
    
    console.log('登录成功，用户信息:', {
      id: response.user?.id,
      name: response.user?.name,
      email: response.user?.email,
      role: response.user?.role,
      account_level: response.user?.account_level,
      company_id: response.user?.company_id,
      company_name: response.user?.company_name
    })
    
    message.success(`欢迎回来，${response.user?.name || '用户'}！`)
    
    // 根据用户级别跳转到合适的页面
    const redirectPath = getRedirectPath(response.user?.account_level)
    router.push(redirectPath)
    
  } catch (error) {
    console.error('登录失败:', error)
    // 错误消息已在 request.js 中处理，这里不需要重复显示
  } finally {
    loading.value = false
  }
}

// 根据账户级别确定重定向路径
const getRedirectPath = (accountLevel) => {
  switch (accountLevel) {
    case 'platform':
      return '/dashboard' // 平台管理员看到完整仪表板
    case 'company':
      return '/users'     // 公司管理员直接进入用户管理
    case 'store':
      return '/users'     // 门店管理员也进入用户管理
    default:
      return '/dashboard'
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-box {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 24px;
}

.login-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}
</style> 