import request from '@/utils/request'

// 获取剧本列表
export const getScriptList = (params) => {
  return request({
    url: '/api/script',
    method: 'get',
    params
  })
}

// 获取剧本详情
export const getScriptDetail = (id) => {
  return request({
    url: `/api/script/${id}`,
    method: 'get'
  })
}

// 创建剧本
export const createScript = (data) => {
  return request({
    url: '/api/script',
    method: 'post',
    data
  })
}

// 更新剧本
export const updateScript = (id, data) => {
  return request({
    url: `/api/script/${id}`,
    method: 'put',
    data
  })
}

// 删除剧本
export const deleteScript = (id) => {
  return request({
    url: `/api/script/${id}`,
    method: 'delete'
  })
}

// 🆕 上传剧本图片
export const uploadScriptImages = (formData) => {
  return request({
    url: '/api/script/upload-images',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 🆕 删除单张剧本图片
export const deleteScriptImage = (scriptId, imageUrl) => {
  return request({
    url: `/api/script/${scriptId}/image`,
    method: 'delete',
    data: { imageUrl }
  })
}

// 获取门店剧本列表
export const getStoreScripts = (storeId) => {
  return request({
    url: `/api/script/store/${storeId}`,
    method: 'get'
  })
}

// 配置门店剧本
export const configureStoreScript = (storeId, scriptId, data) => {
  return request({
    url: `/api/script/store/${storeId}/${scriptId}`,
    method: 'post',
    data
  })
}

// 获取剧本统计
export const getScriptStats = () => {
  return request({
    url: '/api/script/stats',
    method: 'get'
  })
}

// 批量操作
export const batchOperation = (data) => {
  return request({
    url: '/api/script/batch',
    method: 'post',
    data
  })
}

// 🆕 获取公司门店列表（用于剧本配置）
export const getCompanyStores = () => {
  return request({
    url: '/api/script/company-stores',
    method: 'get'
  })
}

// 🆕 批量配置门店剧本
export const batchConfigureStores = (scriptId, storeConfigs) => {
  return request({
    url: `/api/script/${scriptId}/stores`,
    method: 'post',
    data: { storeConfigs }
  })
}

// 🆕 获取剧本的门店配置
export const getScriptStoreConfigs = (scriptId) => {
  return request({
    url: `/api/script/${scriptId}/stores`,
    method: 'get'
  })
} 