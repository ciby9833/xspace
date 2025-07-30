// 账户层级定义（只控制数据范围，不控制功能权限）
const ACCOUNT_LEVELS = {
  PLATFORM: 'platform',    // 平台级账户 - 可访问所有数据
  COMPANY: 'company',      // 公司级账户 - 可访问本公司数据
  STORE: 'store'          // 门店级账户 - 可访问本门店数据
};

// 数据权限范围（基于账户层级自动确定）
const DATA_SCOPES = {
  ALL: 'all',             // 所有数据（平台级）
  COMPANY: 'company',     // 本公司数据（公司级）
  STORE: 'store'         // 本门店数据（门店级）
};

// 账户层级对应的数据范围（层级 = 数据范围）
const LEVEL_DATA_SCOPE_MAP = {
  [ACCOUNT_LEVELS.PLATFORM]: DATA_SCOPES.ALL,
  [ACCOUNT_LEVELS.COMPANY]: DATA_SCOPES.COMPANY,
  [ACCOUNT_LEVELS.STORE]: DATA_SCOPES.STORE
};

// 账户创建权限规则
const ACCOUNT_CREATION_RULES = {
  [ACCOUNT_LEVELS.PLATFORM]: {
    canCreate: [ACCOUNT_LEVELS.PLATFORM, ACCOUNT_LEVELS.COMPANY], // 平台账户可创建平台和公司账户
    description: '可创建平级账户和下级公司账户'
  },
  [ACCOUNT_LEVELS.COMPANY]: {
    canCreate: [ACCOUNT_LEVELS.COMPANY, ACCOUNT_LEVELS.STORE], // 公司账户可创建公司和门店账户
    description: '可创建平级账户和下级门店账户'
  },
  [ACCOUNT_LEVELS.STORE]: {
    canCreate: [ACCOUNT_LEVELS.STORE], // 门店账户只能创建门店账户
    description: '只能创建门店账户'
  }
};

// 角色层级访问规则（支持上级管理下级）
const ROLE_LEVEL_ACCESS_RULES = {
  [ACCOUNT_LEVELS.PLATFORM]: {
    canView: [ACCOUNT_LEVELS.PLATFORM, ACCOUNT_LEVELS.COMPANY, ACCOUNT_LEVELS.STORE], // 平台级用户可以看到所有层级角色
    canManage: [ACCOUNT_LEVELS.PLATFORM, ACCOUNT_LEVELS.COMPANY, ACCOUNT_LEVELS.STORE], // 平台级用户可以管理所有层级角色
    canCreate: [ACCOUNT_LEVELS.PLATFORM, ACCOUNT_LEVELS.COMPANY, ACCOUNT_LEVELS.STORE], // 平台级用户可以创建所有层级角色
    description: '可以查看、管理和创建所有层级的角色'
  },
  [ACCOUNT_LEVELS.COMPANY]: {
    canView: [ACCOUNT_LEVELS.COMPANY, ACCOUNT_LEVELS.STORE], // 公司级用户可以看到公司级和门店级角色
    canManage: [ACCOUNT_LEVELS.COMPANY, ACCOUNT_LEVELS.STORE], // 公司级用户可以管理公司级和门店级角色
    canCreate: [ACCOUNT_LEVELS.COMPANY, ACCOUNT_LEVELS.STORE], // 公司级用户可以创建公司级和门店级角色
    description: '可以查看、管理和创建公司级和门店级角色'
  },
  [ACCOUNT_LEVELS.STORE]: {
    canView: [ACCOUNT_LEVELS.STORE], // 门店级用户只能看到门店级角色
    canManage: [ACCOUNT_LEVELS.STORE], // 门店级用户只能管理门店级角色
    canCreate: [ACCOUNT_LEVELS.STORE], // 门店级用户只能创建门店级角色
    description: '只能查看、管理和创建门店级角色'
  }
};

// 权限模块结构（纯功能权限，无继承关系）
const PERMISSION_MODULES = {
  system: {
    name: '系统管理',
    permissions: [
      'system.view',        // 查看系统信息
      'system.manage',      // 系统管理
      'system.permission',  // 权限管理
      'system.role'         // 角色管理
    ]
  },
  company: {
    name: '公司管理',
    permissions: [
      'company.view',       // 查看公司
      'company.create',     // 创建公司
      'company.edit',       // 编辑公司
      'company.delete',     // 删除公司
      'company.manage'      // 公司管理（包含所有公司操作）
    ]
  },
  user: {
    name: '用户管理',
    permissions: [
      'user.view',          // 查看用户
      'user.create',        // 创建用户
      'user.edit',          // 编辑用户
      'user.delete',        // 删除用户
      'user.manage'         // 用户管理（包含所有用户操作）
    ]
  },
  store: {
    name: '门店管理',
    permissions: [
      'store.view',         // 查看门店
      'store.create',       // 创建门店
      'store.edit',         // 编辑门店
      'store.delete',       // 删除门店
      'store.manage'        // 门店管理（包含所有门店操作）
    ]
  },
  script: {
    name: '剧本管理',
    permissions: [
      'script.view',        // 查看剧本
      'script.create',      // 创建剧本
      'script.edit',        // 编辑剧本
      'script.delete',      // 删除剧本
      'script.manage'       // 剧本管理（包含所有剧本操作）
    ]
  },
  escape_room: {
    name: '密室管理',
    permissions: [
      'escape_room.view',   // 查看密室
      'escape_room.create', // 创建密室
      'escape_room.edit',   // 编辑密室
      'escape_room.delete', // 删除密室
      'escape_room.manage'  // 密室管理（包含所有密室操作）
    ]
  },
  room: {
    name: '房间管理',
    permissions: [
      'room.view',          // 查看房间
      'room.create',        // 创建房间
      'room.edit',          // 编辑房间
      'room.delete',        // 删除房间
      'room.manage'         // 房间管理（包含所有房间操作）
    ]
  },
  order: {
    name: '订单管理',
    permissions: [
      'order.view',         // 查看订单
      'order.create',       // 创建订单
      'order.edit',         // 编辑订单
      'order.delete',       // 删除订单
      'order.assign',       // 分配订单
      'order.payment.summary', // 查看订单支付汇总
      'order.manage'        // 订单管理（包含所有订单操作）
    ]
  },
  game_host: {
    name: 'Game Host',
    permissions: [
      'game_host.view',     // 查看Game Host订单
      'game_host.start',    // 开始游戏
      'game_host.complete', // 完成游戏
      'game_host.update',   // 更新订单信息
      'game_host.manage'    // Game Host管理（包含所有Game Host操作）
    ]
  },
  order_player: {
    name: '订单参与玩家',
    permissions: [
      'order.player.view',    // 查看订单参与玩家
      'order.player.create',  // 创建订单参与玩家
      'order.player.edit',    // 编辑订单参与玩家
      'order.player.delete',  // 删除订单参与玩家
      'order.player.manage'   // 订单参与玩家管理（包含所有操作）
    ]
  },
  order_payment: {
    name: '支付记录',
    permissions: [
      'order.payment.view',    // 查看支付记录
      'order.payment.create',  // 创建支付记录
      'order.payment.edit',    // 编辑支付记录
      'order.payment.delete',  // 删除支付记录
      'order.payment.confirm', // 确认支付
      'order.payment.manage'   // 支付记录管理（包含所有操作）
    ]
  },
  role_pricing: {
    name: '角色定价模板',
    permissions: [
      'role.pricing.view',    // 查看角色定价模板
      'role.pricing.create',  // 创建角色定价模板
      'role.pricing.edit',    // 编辑角色定价模板
      'role.pricing.delete',  // 删除角色定价模板
      'role.pricing.manage'   // 角色定价模板管理（包含所有操作）
    ]
  },
  pricing_calendar: {
    name: '定价日历',
    permissions: [
      'pricing.calendar.view',    // 查看定价日历
      'pricing.calendar.create',  // 创建定价日历
      'pricing.calendar.edit',    // 编辑定价日历
      'pricing.calendar.delete',  // 删除定价日历
      'pricing.calendar.manage'   // 定价日历管理（包含所有操作）
    ]
  }
};

module.exports = {
  ACCOUNT_LEVELS,
  DATA_SCOPES,
  LEVEL_DATA_SCOPE_MAP,
  ACCOUNT_CREATION_RULES,
  ROLE_LEVEL_ACCESS_RULES,
  PERMISSION_MODULES
}; 