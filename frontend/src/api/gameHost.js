import request from '../utils/request';

// Game Host订单处理API

/**
 * 获取Game Host订单列表
 * @param {Object} params - 查询参数
 * @param {string} params.start_date - 开始日期
 * @param {string} params.end_date - 结束日期
 * @param {string} params.order_type - 订单类型（剧本杀/密室）
 * @param {string} params.status - 订单状态
 * @param {string} params.customer_name - 客户姓名
 * @param {string} params.customer_phone - 客户电话
 * @param {string} params.store_id - 门店ID
 */
export const getGameHostOrders = (params) => {
  return request({
    url: '/api/game-host/orders',
    method: 'get',
    params
  });
};

/**
 * 获取当前进行中的订单
 */
export const getCurrentOrder = () => {
  return request({
    url: '/api/game-host/current-order',
    method: 'get'
  });
};

/**
 * 获取订单详情
 * @param {string} orderId - 订单ID
 */
export const getOrderById = (orderId) => {
  return request({
    url: `/api/game-host/orders/${orderId}`,
    method: 'get'
  });
};

/**
 * 开始游戏
 * @param {string} orderId - 订单ID
 */
export const startGame = (orderId) => {
  return request({
    url: `/api/game-host/orders/${orderId}/start`,
    method: 'post'
  });
};

/**
 * 完成游戏
 * @param {string} orderId - 订单ID
 * @param {Object} data - 完成数据
 * @param {string} data.game_host_notes - Game Host备注
 */
export const completeGame = (orderId, data = {}) => {
  return request({
    url: `/api/game-host/orders/${orderId}/complete`,
    method: 'post',
    data
  });
};

/**
 * 更新订单信息
 * @param {string} orderId - 订单ID
 * @param {Object} data - 更新数据
 * @param {number} data.player_count - 玩家人数
 * @param {number} data.support_player_count - 补位人数
 * @param {string} data.language - 客户语言
 * @param {boolean} data.internal_support - 是否内部补位
 * @param {string} data.room_id - 房间ID
 * @param {string} data.script_id - 剧本ID
 * @param {string} data.escape_room_id - 密室ID
 * @param {string} data.game_host_notes - Game Host备注
 */
export const updateOrder = (orderId, data) => {
  return request({
    url: `/api/game-host/orders/${orderId}`,
    method: 'put',
    data
  });
};

/**
 * 获取今日统计
 */
export const getTodayStats = () => {
  return request({
    url: '/api/game-host/stats/today',
    method: 'get'
  });
};

/**
 * 获取可用房间列表
 * @param {string} storeId - 门店ID（可选）
 */
export const getAvailableRooms = (storeId) => {
  return request({
    url: '/api/game-host/resources/rooms',
    method: 'get',
    params: storeId ? { storeId } : {}
  });
};

/**
 * 获取可用剧本列表
 * @param {string} storeId - 门店ID（可选）
 */
export const getAvailableScripts = (storeId) => {
  return request({
    url: '/api/game-host/resources/scripts',
    method: 'get',
    params: storeId ? { storeId } : {}
  });
};

/**
 * 获取可用密室列表
 * @param {string} storeId - 门店ID（可选）
 */
export const getAvailableEscapeRooms = (storeId) => {
  return request({
    url: '/api/game-host/resources/escape-rooms',
    method: 'get',
    params: storeId ? { storeId } : {}
  });
};

/**
 * 获取订单历史记录（分页）
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.startDate - 开始日期
 * @param {string} params.endDate - 结束日期
 * @param {string} params.status - 订单状态
 */
export const getOrderHistory = (params) => {
  return request({
    url: '/api/game-host/orders/history',
    method: 'get',
    params
  });
}; 