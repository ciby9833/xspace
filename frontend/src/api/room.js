import request from '@/utils/request'

export const roomAPI = {
  // 获取房间列表
  getRoomList(params = {}) {
    return request({
      url: '/api/room',
      method: 'get',
      params
    })
  },

  // 获取房间详情
  getRoomDetail(roomId) {
    return request({
      url: `/api/room/${roomId}`,
      method: 'get'
    })
  },

  // 创建房间
  createRoom(data) {
    return request({
      url: '/api/room',
      method: 'post',
      data
    })
  },

  // 批量创建房间
  batchCreateRooms(data) {
    return request({
      url: '/api/room/batch',
      method: 'post',
      data: {
        operation: 'batchCreate',
        ...data
      }
    })
  },

  // 更新房间信息
  updateRoom(roomId, data) {
    return request({
      url: `/api/room/${roomId}`,
      method: 'put',
      data
    })
  },

  // 删除房间
  deleteRoom(roomId) {
    return request({
      url: `/api/room/${roomId}`,
      method: 'delete'
    })
  },

  // 获取可选择的门店列表
  getAvailableStores() {
    return request({
      url: '/api/room/available-stores',
      method: 'get'
    })
  },

  // 上传房间图片
  uploadRoomImages(roomId, formData) {
    return request({
      url: `/api/room/${roomId}/images`,
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 删除房间图片
  deleteRoomImage(roomId, imageId) {
    return request({
      url: `/api/room/${roomId}/images/${imageId}`,
      method: 'delete'
    })
  },

  // 更新图片排序
  updateImageOrder(roomId, imageOrders) {
    return request({
      url: `/api/room/${roomId}/images/order`,
      method: 'put',
      data: { imageOrders }
    })
  },

  // 批量操作
  batchOperation(data) {
    return request({
      url: '/api/room/batch',
      method: 'post',
      data
    })
  },

  // 获取房间统计信息
  getRoomStats(params = {}) {
    return request({
      url: '/api/room/stats',
      method: 'get',
      params
    })
  }
} 