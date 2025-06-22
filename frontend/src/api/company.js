import request from '@/utils/request'

export const companyAPI = {
  // 获取公司列表
  getCompanyList() {
    return request.get('/api/company')
  },

  // 创建公司
  createCompany(data) {
    return request.post('/api/company', data)
  },

  // 获取公司详情
  getCompanyDetail(id) {
    return request.get(`/api/company/${id}`)
  },

  // 更新公司信息
  updateCompany(id, data) {
    return request.put(`/api/company/${id}`, data)
  }
} 