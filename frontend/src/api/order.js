import request from '@/utils/request'

export const orderAPI = {
  // 获取订单列表
  getList(params = {}) {
    return request({
      url: '/api/order',
      method: 'get',
      params
    })
  },

  // 获取门店订单列表
  getStoreOrders(storeId, params = {}) {
    return request({
      url: `/api/order/store/${storeId}`,
      method: 'get',
      params
    })
  },

  // 获取订单详情
  getById(id) {
    return request({
      url: `/api/order/${id}`,
      method: 'get'
    })
  },

  // 创建订单
  create(data) {
    return request({
      url: '/api/order',
      method: 'post',
      data
    })
  },

  // 更新订单
  update(id, data) {
    return request({
      url: `/api/order/${id}`,
      method: 'put',
      data
    })
  },

  // 删除订单
  delete(id) {
    return request({
      url: `/api/order/${id}`,
      method: 'delete'
    })
  },

  // 获取订单统计
  getStats() {
    return request({
      url: '/api/order/stats',
      method: 'get'
    })
  },

  // 获取门店统计
  getStoreStats(storeId) {
    return request({
      url: `/api/order/store/${storeId}/stats`,
      method: 'get'
    })
  },

  // 获取门店可用资源
  getStoreResources(storeId) {
    return request({
      url: `/api/order/store/${storeId}/resources`,
      method: 'get'
    })
  },

  // 🆕 获取用户可选门店列表
  getAvailableStores() {
    return request({
      url: '/api/order/available-stores',
      method: 'get'
    })
  },

  // 🆕 获取房间占用情况
  getRoomOccupancy(storeId, roomId, params = {}) {
    return request({
      url: `/api/order/store/${storeId}/rooms/${roomId}/occupancy`,
      method: 'get',
      params
    })
  },

  // 🆕 检查房间可用性
  checkRoomAvailability(storeId, roomId, params = {}) {
    return request({
      url: `/api/order/store/${storeId}/rooms/${roomId}/availability`,
      method: 'get',
      params
    })
  },

  // 获取订单配置
  getConfigs(configType = '') {
    return request({
      url: `/api/order/configs/${configType}`,
      method: 'get'
    })
  },

  // 批量操作订单
  batchOperation(data) {
    return request({
      url: '/api/order/batch',
      method: 'post',
      data
    })
  },

  // 上传订单图片
  uploadImages(formData) {
    return request({
      url: '/api/order/upload-images',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 添加订单图片
  addOrderImages(orderId, data) {
    return request({
      url: `/api/order/${orderId}/images`,
      method: 'post',
      data
    })
  },

  // 删除订单图片
  deleteImage(orderId, imageId) {
    return request({
      url: `/api/order/${orderId}/images/${imageId}`,
      method: 'delete'
    })
  },

  // 导出订单
  exportOrders(params = {}) {
    return request({
      url: '/api/order/export',
      method: 'get',
      params,
      responseType: 'blob' // 重要：设置响应类型为blob
    })
  },

  // 🆕 更新订单状态
  updateStatus(id, status) {
    return request({
      url: `/api/order/${id}/status`,
      method: 'put',
      data: { status }
    })
  },

  // 🆕 开始游戏
  startGame(id) {
    return request({
      url: `/api/order/${id}/start`,
      method: 'put'
    })
  },

  // 🆕 完成游戏
  completeGame(id) {
    return request({
      url: `/api/order/${id}/complete`,
      method: 'put'
    })
  },

  // 🆕 处理退款
  processRefund(id, data) {
    return request({
      url: `/api/order/${id}/refund`,
      method: 'put',
      data
    })
  },

  // 🆕 更新订单支付信息
  updatePayment(id, data) {
    return request({
      url: `/api/order/${id}/payment`,
      method: 'put',
      data
    })
  }
}

// 🆕 预订界面专用API

// 获取可预订项目列表（剧本+密室统一）
export const getBookingItems = (params) => {
  return request({
    url: '/api/order/booking/items',
    method: 'get',
    params
  })
}

// 获取预订页面可选门店列表
export const getBookingStores = () => {
  return request({
    url: '/api/order/available-stores',
    method: 'get'
  })
}

// 获取预订项目详情页数据
export const getBookingItemDetail = (itemType, itemId) => {
  return request({
    url: `/api/order/booking/item/${itemType}/${itemId}`,
    method: 'get'
  })
}

// 获取门店房间时间表
export const getStoreRoomSchedule = (storeId, params) => {
  return request({
    url: `/api/order/booking/store/${storeId}/schedule`,
    method: 'get',
    params
  })
}

// 预检查预订可用性
export const preCheckBooking = (data) => {
  return request({
    url: '/api/order/booking/pre-check',
    method: 'post',
    data
  })
}

// 🆕 检查自定义时间段可用性
export const checkCustomTimeSlot = (storeId, roomId, params) => {
  return request({
    url: `/api/order/booking/store/${storeId}/rooms/${roomId}/custom-check`,
    method: 'get',
    params
  })
} 