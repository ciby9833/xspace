import request from '@/utils/request'

export const userAPI = {
  // 获取用户列表
  getList(params = {}) {
    return request({
      url: '/api/user',
      method: 'get',
      params
    })
  },

  // 向后兼容的方法名
  getUserList(params = {}) {
    return this.getList(params)
  },

  // 获取用户详情
  getById(id) {
    return request({
      url: `/api/user/${id}`,
      method: 'get'
    })
  },

  // 向后兼容的方法名
  getUserDetail(id) {
    return this.getById(id)
  },

  // 创建用户
  create(data) {
    return request({
      url: '/api/user',
      method: 'post',
      data
    })
  },

  // 向后兼容的方法名
  createUser(data) {
    return this.create(data)
  },

  // 更新用户
  update(id, data) {
    return request({
      url: `/api/user/${id}`,
      method: 'put',
      data
    })
  },

  // 向后兼容的方法名
  updateUser(id, data) {
    return this.update(id, data)
  },

  // 删除用户
  delete(id) {
    return request({
      url: `/api/user/${id}`,
      method: 'delete'
    })
  },

  // 向后兼容的方法名
  deleteUser(id) {
    return this.delete(id)
  },

  // 重置密码
  resetPassword(id, data) {
    return request({
      url: `/api/user/${id}/reset-password`,
      method: 'post',
      data
    })
  },

  // 获取用户权限
  getUserPermissions(id) {
    return request({
      url: `/api/user/${id}/permissions`,
      method: 'get'
    })
  },

  // 更新用户权限
  updateUserPermissions(id, data) {
    return request({
      url: `/api/user/${id}/permissions`,
      method: 'put',
      data
    })
  },

  // 新增：获取可管理的角色列表
  getManageableRoles() {
    return request.get('/api/user/manageable-roles')
  },

  // 新增：根据账户层级获取角色列表
  getRolesByAccountLevel(accountLevel, companyId = null) {
    const params = { account_level: accountLevel }
    if (companyId) {
      params.company_id = companyId
    }
    return request.get('/api/user/roles-by-level', { params })
  },

  // 新增：获取可选公司列表（用于创建用户时选择）
  getAvailableCompanies() {
    return request.get('/api/user/available-companies')
  },

  // 新增：获取可选门店列表（用于创建用户时选择）
  getAvailableStores(companyId) {
    const params = companyId ? { company_id: companyId } : {}
    return request.get('/api/user/available-stores', { params })
  },

  // 获取可创建的账户级别列表
  getCreatableAccountLevels() {
    return request.get('/api/user/creatable-account-levels')
  },

  // 获取可选岗位列表
  getAvailablePositions() {
    return request.get('/api/user/available-positions')
  }
}

// 🆕 获取门店关联的用户（用于Game Host选择）
export const getUsersByStore = (storeId) => {
  return request({
    url: `/api/user/store/${storeId}`,
    method: 'get'
  })
}

// 保持向后兼容
export const getUserList = userAPI.getList
export const getUserProfile = userAPI.getById
export const createUser = userAPI.create
export const updateUser = userAPI.update
export const deleteUser = userAPI.delete 