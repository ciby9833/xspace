import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '@/api/auth'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(null)
  const permissions = ref([])

  // 计算属性
  const isLoggedIn = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role || '')
  const companyId = computed(() => user.value?.company_id || '')
  
  // 账户级别相关计算属性（基于简化的层级系统）
  const accountLevel = computed(() => user.value?.account_level || 'store')
  const isPlatformAdmin = computed(() => accountLevel.value === 'platform')
  const isCompanyAdmin = computed(() => accountLevel.value === 'company')
  const isStoreAdmin = computed(() => accountLevel.value === 'store')

  // 登录
  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials)
      
      // 检查响应格式
      if (!response || !response.token) {
        throw new Error('登录响应格式错误')
      }
      
      // 直接使用响应中的 token 和 user
      token.value = response.token
      user.value = response.user
      permissions.value = response.user?.permissions || []
      
      // 保存到本地存储，并添加时间戳
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      localStorage.setItem('loginTime', Date.now().toString())
      
      console.log('🔑 登录成功，用户信息:', {
        role: response.user?.role,
        account_level: response.user?.account_level,
        company_id: response.user?.company_id,
        permissions: response.user?.permissions
      })
      
      return response
    } catch (error) {
      console.error('登录失败:', error)
      // 清除可能存在的旧数据
      token.value = ''
      user.value = null
      permissions.value = []
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('loginTime')
      throw error
    }
  }

  // 退出登录
  const logout = async () => {
    try {
      // 调用后端logout接口
      await authAPI.logout()
    } catch (error) {
      console.warn('后端登出失败:', error)
    } finally {
      // 无论后端是否成功，都清除前端状态
      token.value = ''
      user.value = null
      permissions.value = []
      
      // 清除本地存储
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('loginTime')
      
      // 只在不是登录页面时才跳转
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    }
  }

  // 获取用户信息（从后端获取最新信息）
  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getUserProfile()
      // 适配新的响应结构
      const userInfo = response.data || response
      
      user.value = userInfo
      permissions.value = userInfo?.permissions || []
      
      // 更新本地存储
      localStorage.setItem('user', JSON.stringify(userInfo))
      return userInfo
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  }

  // 权限检查（基于后端动态权限系统）
  const hasPermission = (permission) => {
    // 如果没有用户信息，返回false
    if (!user.value) {
      return false
    }
    
    // 兼容旧的role字段（超级管理员）
    if (user.value.role === 'superadmin') {
      return true
    }
    
    // 平台管理员拥有所有权限
    if (isPlatformAdmin.value) {
      return true
    }
    
    // 检查具体权限（从后端获取的权限列表）
    if (permissions.value && permissions.value.includes(permission)) {
      return true
    }
    
    // 检查通配符权限（如 user.* 包含 user.view）
    if (permissions.value) {
      const modulePermission = permission.split('.')[0] + '.*'
      if (permissions.value.includes(modulePermission)) {
        return true
      }
    }
    
    // 特殊权限兼容处理
    if (permission === 'dashboard.view') {
      // 仪表板权限：所有登录用户都有
      return true
    }
    
    return false
  }

  // 检查是否可以访问某个菜单
  const canAccessMenu = (menuKey) => {
    const menuPermissions = {
      '/dashboard': 'dashboard.view',
      '/company': 'company.view',
      '/stores': 'store.view',
      '/users': 'user.view',
      '/scripts': 'script.view',
      '/escape-rooms': 'escape_room.view',
      '/orders': 'order.view',
      '/booking': 'order.view',  // 预订界面使用订单查看权限
      '/game-host': 'game_host.view',  // Game Host界面权限
      '/permissions': 'system.role'  // 修正：权限管理页面需要 system.role 权限
    }
    
    const requiredPermission = menuPermissions[menuKey]
    if (!requiredPermission) {
      return true // 没有配置权限要求的菜单默认可访问
    }
    
    return hasPermission(requiredPermission)
  }

  // 检查账户级别权限
  const hasAccountLevel = (requiredLevel) => {
    const levels = {
      'store': 1,
      'company': 2,
      'platform': 3
    }
    
    const userLevel = levels[accountLevel.value] || 1
    const required = levels[requiredLevel] || 1
    
    return userLevel >= required
  }

  // 检查是否可以创建指定账户级别的用户
  const canCreateAccountLevel = (targetLevel) => {
    const creationRules = {
      'platform': ['platform', 'company', 'store'], // 平台可创建所有级别
      'company': ['company', 'store'],               // 公司可创建公司和门店
      'store': ['store']                             // 门店只能创建门店
    }
    
    const allowedLevels = creationRules[accountLevel.value] || []
    return allowedLevels.includes(targetLevel)
  }

  // 获取可创建的账户级别列表
  const getCreatableAccountLevels = () => {
    const creationRules = {
      'platform': [
        { value: 'platform', label: '平台级账户', description: '可管理所有数据' },
        { value: 'company', label: '公司级账户', description: '可管理本公司数据' },
        { value: 'store', label: '门店级账户', description: '可管理本门店数据' }
      ],
      'company': [
        { value: 'company', label: '公司级账户', description: '可管理本公司数据' },
        { value: 'store', label: '门店级账户', description: '可管理本门店数据' }
      ],
      'store': [
        { value: 'store', label: '门店级账户', description: '可管理本门店数据' }
      ]
    }
    
    return creationRules[accountLevel.value] || []
  }

  // 检查是否可以管理指定用户
  const canManageUser = (targetUser) => {
    // 不能管理比自己级别高的用户
    const levelHierarchy = { 'store': 1, 'company': 2, 'platform': 3 }
    const currentLevel = levelHierarchy[accountLevel.value] || 1
    const targetLevel = levelHierarchy[targetUser.account_level] || 1
    
    if (currentLevel < targetLevel) {
      return false
    }
    
    // 公司级用户只能管理本公司用户
    if (accountLevel.value === 'company' && targetUser.company_id !== companyId.value) {
      return false
    }
    
    // 门店级用户只能管理本门店用户
    if (accountLevel.value === 'store' && targetUser.account_level !== 'store') {
      return false
    }
    
    return true
  }

  // 初始化用户信息（从本地存储恢复）
  const initAuth = () => {
    const savedUser = localStorage.getItem('user')
    const loginTime = localStorage.getItem('loginTime')
    
    if (savedUser && token.value && loginTime) {
      try {
        // 检查登录时间是否过期（30天）
        const now = Date.now()
        const loginTimestamp = parseInt(loginTime)
        const maxAge = 30 * 24 * 60 * 60 * 1000 // 30天
        
        if (now - loginTimestamp > maxAge) {
          console.log('登录已过期，清除本地状态')
          logout()
          return
        }
        
        user.value = JSON.parse(savedUser)
        permissions.value = user.value?.permissions || []
        
        console.log('🔄 从本地存储恢复用户信息:', {
          role: user.value?.role,
          account_level: user.value?.account_level,
          company_id: user.value?.company_id
        })
      } catch (error) {
        console.error('解析用户信息失败:', error)
        logout()
      }
    }
  }

  // 验证token有效性（可选：定期调用后端验证）
  const validateToken = async () => {
    try {
      await fetchUserProfile()
      return true
    } catch (error) {
      if (error.response?.status === 401) {
        logout()
        return false
      }
      return true // 其他错误不认为是token失效
    }
  }

  return {
    // 状态
    token,
    user,
    permissions,
    // 计算属性
    isLoggedIn,
    userRole,
    companyId,
    accountLevel,
    isPlatformAdmin,
    isCompanyAdmin,
    isStoreAdmin,
    // 方法
    login,
    logout,
    fetchUserProfile,
    hasPermission,
    canAccessMenu,
    hasAccountLevel,
    canCreateAccountLevel,
    getCreatableAccountLevels,
    canManageUser,
    initAuth,
    validateToken
  }
}) 