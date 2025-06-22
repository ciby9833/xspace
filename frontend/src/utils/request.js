import axios from 'axios'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000', // 添加fallback
  timeout: 10000,
  withCredentials: true
})

// 防止重复显示错误消息
let isShowingError = false

// 请求拦截器
request.interceptors.request.use(
  config => {
    const authStore = useAuthStore()
    
    // 添加调试日志
    console.log('发送请求:', config.method?.toUpperCase(), config.url)
    console.log('完整URL:', config.baseURL + config.url)
    
    // 添加认证token
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    console.log('响应成功:', response.config.url, response.data)
    return response.data
  },
  error => {
    console.error('响应错误:', error)
    
    // 防止重复显示错误消息
    if (isShowingError) {
      return Promise.reject(error)
    }
    
    if (error.response) {
      const { status, data } = error.response
      const isLoginRequest = error.config.url.includes('/auth/login')
      
      switch (status) {
        case 401:
          // 登录请求的401错误特殊处理
          if (isLoginRequest) {
            message.error(data.error || '邮箱或密码错误')
          } else {
            // 非登录请求的401错误
          const authStore = useAuthStore()
          if (data.error?.includes('过期') || data.error?.includes('expired')) {
            message.error('登录已过期，请重新登录')
          } else {
            message.error('登录状态无效，请重新登录')
          }
          authStore.logout()
          }
          break
        case 403:
          // 优化权限错误提示
          if (data.error?.includes('account_level')) {
            message.error('您的账户级别不足，无法执行此操作')
          } else if (data.error?.includes('data_scope')) {
            message.error('您没有权限访问此范围内的数据')
          } else {
          message.error(data.error || '权限不足')
          }
          break
        case 404:
          message.error('请求的资源不存在')
          break
        case 500:
          message.error('服务器内部错误')
          break
        default:
          message.error(data.error || '网络错误')
      }
    } else {
      message.error('网络连接失败')
    }
    
    // 设置错误显示标志
    isShowingError = true
    setTimeout(() => {
      isShowingError = false
    }, 3000) // 3秒后重置标志
    
    return Promise.reject(error)
  }
)

export default request 