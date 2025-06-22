import request from '@/utils/request'

// 获取密室列表
export const getEscapeRoomList = (params) => {
  return request({
    url: '/api/escape-room',
    method: 'get',
    params
  })
}

// 获取密室详情
export const getEscapeRoomDetail = (id) => {
  return request({
    url: `/api/escape-room/${id}`,
    method: 'get'
  })
}

// 创建密室
export const createEscapeRoom = (data) => {
  return request({
    url: '/api/escape-room',
    method: 'post',
    data
  })
}

// 更新密室
export const updateEscapeRoom = (id, data) => {
  return request({
    url: `/api/escape-room/${id}`,
    method: 'put',
    data
  })
}

// 删除密室
export const deleteEscapeRoom = (id) => {
  return request({
    url: `/api/escape-room/${id}`,
    method: 'delete'
  })
}

// 上传密室图片
export const uploadEscapeRoomImages = (formData) => {
  return request({
    url: '/api/escape-room/upload-images',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 删除单张密室图片
export const deleteEscapeRoomImage = (escapeRoomId, imageUrl) => {
  return request({
    url: `/api/escape-room/${escapeRoomId}/images`,
    method: 'delete',
    data: { imageUrl }
  })
}

// 获取门店密室列表
export const getStoreEscapeRooms = (storeId) => {
  return request({
    url: `/api/escape-room/store/${storeId}`,
    method: 'get'
  })
}

// 配置门店密室
export const configureStoreEscapeRoom = (storeId, escapeRoomId, data) => {
  return request({
    url: `/api/escape-room/store/${storeId}/${escapeRoomId}`,
    method: 'post',
    data
  })
}

// 获取密室统计
export const getEscapeRoomStats = () => {
  return request({
    url: '/api/escape-room/stats/overview',
    method: 'get'
  })
}

// 批量操作
export const batchOperation = (data) => {
  return request({
    url: '/api/escape-room/batch',
    method: 'post',
    data
  })
}

// 获取公司门店列表（用于密室配置）
export const getCompanyStores = () => {
  return request({
    url: '/api/escape-room/company-stores',
    method: 'get'
  })
}

// 批量配置门店密室
export const batchConfigureStores = (escapeRoomId, storeConfigs) => {
  return request({
    url: `/api/escape-room/${escapeRoomId}/configure-stores`,
    method: 'post',
    data: { storeConfigs }
  })
}

// 获取密室的门店配置
export const getEscapeRoomStoreConfigs = (escapeRoomId) => {
  return request({
    url: `/api/escape-room/${escapeRoomId}/store-configs`,
    method: 'get'
  })
} 