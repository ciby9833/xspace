import request from '@/utils/request'

export const authAPI = {
  // 登录
  login(data) {
    return request.post('/api/auth/login', data)
  },

  // 退出登录
  logout() {
    return request.post('/api/auth/logout')
  },

  // 获取当前用户信息
  getUserProfile() {
    return request.get('/api/user/profile')
  }
} 