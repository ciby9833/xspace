import request from '@/utils/request'

export const permissionAPI = {
  // 获取权限结构（模块和权限）
  getPermissionStructure() {
    return request.get('/api/permissions/structure')
  },

  // 获取角色列表（支持层级查询）
  getRoles(companyId = null) {
    const params = companyId ? { company_id: companyId } : {}
    return request.get('/api/permissions/roles', { params })
  },

  // 获取角色详情
  getRoleDetails(roleId) {
    return request.get(`/api/permissions/roles/${roleId}`)
  },

  // 创建角色
  createRole(data) {
    return request.post('/api/permissions/roles', data)
  },

  // 更新角色
  updateRole(roleId, data) {
    return request.put(`/api/permissions/roles/${roleId}`, data)
  },

  // 删除角色
  deleteRole(roleId) {
    return request.delete(`/api/permissions/roles/${roleId}`)
  },

  // 分配权限给角色
  assignPermissions(roleId, permissionIds) {
    return request.put(`/api/permissions/roles/${roleId}/permissions`, {
      permission_ids: permissionIds
    })
  },

  // 更新用户角色
  updateUserRole(userId, roleId) {
    return request.put(`/api/permissions/users/${userId}/role`, {
      role_id: roleId
    })
  },

  // 获取用户权限
  getUserPermissions(userId) {
    return request.get(`/api/permissions/users/${userId}/permissions`)
  },

  // 获取可创建的角色层级
  getCreatableRoleLevels() {
    return request.get('/api/permissions/role-levels/creatable')
  },

  // 获取公司列表（用于角色归属选择）
  getCompaniesForRole() {
    return request.get('/api/permissions/companies/for-role')
  },

  // 检查用户对特定资源的访问权限
  checkResourceAccess(resourceType, resourceId) {
    return request.get('/api/permissions/check-access', {
      params: { resource_type: resourceType, resource_id: resourceId }
    })
  },

  // 获取权限统计信息
  getPermissionStats() {
    return request.get('/api/permissions/stats')
  }
} 