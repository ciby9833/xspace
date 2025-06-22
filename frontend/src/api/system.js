import request from '@/utils/request'

export const systemAPI = {
  // 健康检查
  healthCheck() {
    return request.get('/api/health')
  }
} 