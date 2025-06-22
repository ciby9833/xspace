import request from '@/utils/request'

// 门店API
export const storeAPI = {
  // 获取门店列表
  getStoreList(params = {}) {
    return request.get('/api/stores', { params })
  },

  // 获取门店详情
  getStoreDetail(storeId) {
    return request.get(`/api/stores/${storeId}`)
  },

  // 创建门店
  createStore(data) {
    return request.post('/api/stores', data)
  },

  // 更新门店信息
  updateStore(storeId, data) {
    return request.put(`/api/stores/${storeId}`, data)
  },

  // 删除门店
  deleteStore(storeId) {
    return request.delete(`/api/stores/${storeId}`)
  },

  // 获取门店用户列表
  getStoreUsers(storeId) {
    return request.get(`/api/stores/${storeId}/users`)
  },

  // 获取可选择的公司列表
  getAvailableCompanies() {
    return request.get('/api/stores/companies')
  }
}

export default storeAPI 