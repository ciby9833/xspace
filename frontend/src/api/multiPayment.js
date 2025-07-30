//多支付API
import request from '@/utils/request'

// 订单参与玩家API
export const orderPlayerAPI = {
  /**
   * 获取订单参与玩家列表
   * @param {Object} params - 查询参数
   * @param {string} params.order_id - 订单ID
   * @param {string} params.role_name - 角色名称
   * @param {string} params.payment_status - 支付状态
   * @param {number} params.page - 页码
   * @param {number} params.page_size - 每页数量
   */
  getList(params = {}) {
    return request({
      url: '/api/order-players',
      method: 'get',
      params
    })
  },

  /**
   * 获取订单参与玩家详情
   * @param {string} id - 参与玩家ID
   */
  getById(id) {
    return request({
      url: `/api/order-players/${id}`,
      method: 'get'
    })
  },

  /**
   * 创建订单参与玩家
   * @param {Object} data - 参与玩家数据
   * @param {string} data.order_id - 订单ID
   * @param {string} data.role_name - 角色名称
   * @param {string} data.player_name - 玩家姓名
   * @param {string} data.player_phone - 玩家电话
   * @param {number} data.role_price - 角色价格
   * @param {string} data.payment_status - 支付状态
   */
  create(data) {
    return request({
      url: '/api/order-players',
      method: 'post',
      data
    })
  },

  /**
   * 更新订单参与玩家
   * @param {string} id - 参与玩家ID
   * @param {Object} data - 更新数据
   */
  update(id, data) {
    return request({
      url: `/api/order-players/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除订单参与玩家
   * @param {string} id - 参与玩家ID
   */
  delete(id) {
    return request({
      url: `/api/order-players/${id}`,
      method: 'delete'
    })
  },

  /**
   * 获取指定订单的参与玩家
   * @param {string} orderId - 订单ID
   * @param {Object} params - 查询参数
   */
  getByOrderId(orderId, params = {}) {
    return request({
      url: `/api/order-players/order/${orderId}`,
      method: 'get',
      params
    })
  },

  /**
   * 批量创建订单参与玩家
   * @param {Array} data - 参与玩家数据数组
   */
  batchCreate(data) {
    return request({
      url: '/api/order-players/batch',
      method: 'post',
      data
    })
  },

  /**
   * 批量更新支付状态
   * @param {Object} data - 批量更新数据
   * @param {Array} data.player_ids - 玩家ID数组
   * @param {string} data.payment_status - 支付状态
   */
  batchUpdatePaymentStatus(data) {
    return request({
      url: '/api/order-players/batch/payment-status',
      method: 'put',
      data
    })
  },

  /**
   * 获取订单参与玩家统计
   * @param {Object} params - 查询参数
   * @param {string} params.order_id - 订单ID
   * @param {string} params.company_id - 公司ID
   * @param {string} params.store_id - 门店ID
   */
  getStats(params = {}) {
    return request({
      url: '/api/order-players/stats',
      method: 'get',
      params
    })
  },

  /**
   * 获取角色统计
   * @param {Object} params - 查询参数
   * @param {string} params.company_id - 公司ID
   * @param {string} params.store_id - 门店ID
   */
  getRoleStats(params = {}) {
    return request({
      url: '/api/order-players/stats/roles',
      method: 'get',
      params
    })
  },

  /**
   * 获取支付状态统计
   * @param {Object} params - 查询参数
   * @param {string} params.company_id - 公司ID
   * @param {string} params.store_id - 门店ID
   */
  getPaymentStats(params = {}) {
    return request({
      url: '/api/order-players/stats/payment',
      method: 'get',
      params
    })
  }
}

// 支付记录API
export const orderPaymentAPI = {
  /**
   * 获取支付记录列表
   * @param {Object} params - 查询参数
   * @param {string} params.order_id - 订单ID
   * @param {string} params.payer_name - 支付人姓名
   * @param {string} params.payment_status - 支付状态
   * @param {number} params.page - 页码
   * @param {number} params.page_size - 每页数量
   */
  getList(params = {}) {
    return request({
      url: '/api/order-payments',
      method: 'get',
      params
    })
  },

  /**
   * 获取支付记录详情
   * @param {string} id - 支付记录ID
   */
  getById(id) {
    return request({
      url: `/api/order-payments/${id}`,
      method: 'get'
    })
  },

  /**
   * 创建支付记录
   * @param {Object} data - 支付记录数据
   * @param {string} data.order_id - 订单ID
   * @param {string} data.payer_name - 支付人姓名
   * @param {string} data.payer_phone - 支付人电话
   * @param {number} data.payment_amount - 支付金额
   * @param {string} data.payment_method - 支付方式
   * @param {Array} data.covered_player_ids - 覆盖的玩家ID数组
   */
  create(data) {
    return request({
      url: '/api/order-payments',
      method: 'post',
      data
    })
  },

  /**
   * 更新支付记录
   * @param {string} id - 支付记录ID
   * @param {Object} data - 更新数据
   */
  update(id, data) {
    return request({
      url: `/api/order-payments/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除支付记录
   * @param {string} id - 支付记录ID
   */
  delete(id) {
    return request({
      url: `/api/order-payments/${id}`,
      method: 'delete'
    })
  },

  /**
   * 获取指定订单的支付记录
   * @param {string} orderId - 订单ID
   * @param {Object} params - 查询参数
   */
  getByOrderId(orderId, params = {}) {
    return request({
      url: `/api/order-payments/order/${orderId}`,
      method: 'get',
      params
    })
  },

  /**
   * 确认支付
   * @param {string} id - 支付记录ID
   * @param {Object} data - 确认数据
   * @param {string} data.confirmation_notes - 确认备注
   */
  confirmPayment(id, data = {}) {
    return request({
      url: `/api/order-payments/${id}/confirm`,
      method: 'post',
      data
    })
  },

  /**
   * 取消支付
   * @param {string} id - 支付记录ID
   * @param {Object} data - 取消数据
   * @param {string} data.cancellation_reason - 取消原因
   */
  cancelPayment(id, data = {}) {
    return request({
      url: `/api/order-payments/${id}/cancel`,
      method: 'post',
      data
    })
  },

  /**
   * 合并支付记录
   * @param {Object} data - 合并数据
   * @param {Array} data.payment_ids - 支付记录ID数组
   * @param {string} data.target_payment_id - 目标支付记录ID
   */
  mergePayments(data) {
    return request({
      url: '/api/order-payments/merge',
      method: 'post',
      data
    })
  },

  /**
   * 拆分支付记录
   * @param {string} id - 支付记录ID
   * @param {Object} data - 拆分数据
   * @param {Array} data.split_details - 拆分详情
   */
  splitPayment(id, data) {
    return request({
      url: `/api/order-payments/${id}/split`,
      method: 'post',
      data
    })
  },

  /**
   * 获取支付统计
   * @param {Object} params - 查询参数
   * @param {string} params.company_id - 公司ID
   * @param {string} params.store_id - 门店ID
   * @param {string} params.start_date - 开始日期
   * @param {string} params.end_date - 结束日期
   */
  getStats(params = {}) {
    return request({
      url: '/api/order-payments/stats',
      method: 'get',
      params
    })
  },

  /**
   * 获取支付方式统计
   * @param {Object} params - 查询参数
   */
  getPaymentMethodStats(params = {}) {
    return request({
      url: '/api/order-payments/stats/methods',
      method: 'get',
      params
    })
  },

  /**
   * 获取支付状态统计
   * @param {Object} params - 查询参数
   */
  getPaymentStatusStats(params = {}) {
    return request({
      url: '/api/order-payments/stats/status',
      method: 'get',
      params
    })
  },

  /**
   * 🆕 上传支付凭证
   * @param {FormData} formData - 包含文件的表单数据
   */
  uploadPaymentProof(formData) {
    return request({
      url: '/api/order-payments/upload-proof',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 🆕 创建支付记录并更新玩家状态
   * @param {Object} data - 支付数据
   * @param {string} data.order_id - 订单ID
   * @param {Array} data.player_ids - 玩家ID数组
   * @param {string} data.payment_method - 支付方式
   * @param {number} data.amount - 支付金额
   * @param {string} data.payer_name - 支付人姓名
   * @param {string} data.payer_phone - 支付人电话
   * @param {Array} data.payment_proof_urls - 支付凭证URL数组
   * @param {string} data.notes - 备注
   */
  createPaymentWithPlayerUpdate(data) {
    return request({
      url: '/api/order-payments/with-status-update',
      method: 'post',
      data
    })
  },

  /**
   * 🆕 更新支付记录的凭证
   * @param {string} paymentId - 支付记录ID
   * @param {Object} data - 凭证数据
   * @param {Array} data.proof_images - 凭证图片URL数组
   * @param {string} data.mode - 更新模式：'replace' 或 'append'
   */
  updatePaymentProof(paymentId, data) {
    return request({
      url: `/api/order-payments/${paymentId}/proof`,
      method: 'put',
      data
    })
  }
}

// 角色定价模板API
export const rolePricingTemplateAPI = {
  /**
   * 获取角色定价模板列表
   * @param {Object} params - 查询参数
   * @param {string} params.role_name - 角色名称
   * @param {string} params.company_id - 公司ID
   * @param {string} params.store_id - 门店ID
   * @param {boolean} params.is_active - 是否激活
   * @param {number} params.page - 页码
   * @param {number} params.page_size - 每页数量
   */
  getList(params = {}) {
    return request({
      url: '/api/role-pricing-templates',
      method: 'get',
      params
    })
  },

  /**
   * 获取角色定价模板详情
   * @param {string} id - 模板ID
   */
  getById(id) {
    return request({
      url: `/api/role-pricing-templates/${id}`,
      method: 'get'
    })
  },

  /**
   * 创建角色定价模板
   * @param {Object} data - 模板数据
   * @param {string} data.role_name - 角色名称
   * @param {string} data.discount_type - 折扣类型
   * @param {number} data.discount_value - 折扣值
   * @param {Array} data.store_ids - 门店ID数组
   * @param {string} data.description - 描述
   */
  create(data) {
    return request({
      url: '/api/role-pricing-templates',
      method: 'post',
      data
    })
  },

  /**
   * 更新角色定价模板
   * @param {string} id - 模板ID
   * @param {Object} data - 更新数据
   */
  update(id, data) {
    return request({
      url: `/api/role-pricing-templates/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除角色定价模板
   * @param {string} id - 模板ID
   */
  delete(id) {
    return request({
      url: `/api/role-pricing-templates/${id}`,
      method: 'delete'
    })
  },

  /**
   * 获取公司角色定价模板
   * @param {string} companyId - 公司ID
   * @param {Object} params - 查询参数
   */
  getByCompanyId(companyId, params = {}) {
    return request({
      url: `/api/role-pricing-templates/company/${companyId}`,
      method: 'get',
      params
    })
  },

  /**
   * 获取门店角色定价模板
   * @param {string} storeId - 门店ID
   * @param {Object} params - 查询参数
   */
  getByStoreId(storeId, params = {}) {
    return request({
      url: `/api/role-pricing-templates/store/${storeId}`,
      method: 'get',
      params
    })
  },

  /**
   * 批量创建角色定价模板
   * @param {Array} data - 模板数据数组
   */
  batchCreate(data) {
    return request({
      url: '/api/role-pricing-templates/batch',
      method: 'post',
      data
    })
  },

  /**
   * 批量更新激活状态
   * @param {Object} data - 批量更新数据
   * @param {Array} data.template_ids - 模板ID数组
   * @param {boolean} data.is_active - 是否激活
   */
  batchUpdateStatus(data) {
    return request({
      url: '/api/role-pricing-templates/batch/status',
      method: 'put',
      data
    })
  },

  /**
   * 计算角色价格
   * @param {Object} data - 计算数据
   * @param {string} data.role_name - 角色名称
   * @param {number} data.base_price - 基础价格
   * @param {string} data.company_id - 公司ID
   * @param {string} data.store_id - 门店ID
   */
  calculatePrice(data) {
    return request({
      url: '/api/role-pricing-templates/calculate',
      method: 'post',
      data
    })
  },

  /**
   * 获取角色定价统计
   * @param {Object} params - 查询参数
   * @param {string} params.company_id - 公司ID
   * @param {string} params.store_id - 门店ID
   */
  getStats(params = {}) {
    return request({
      url: '/api/role-pricing-templates/stats',
      method: 'get',
      params
    })
  },

  /**
   * 获取角色使用统计
   * @param {Object} params - 查询参数
   */
  getRoleUsageStats(params = {}) {
    return request({
      url: '/api/role-pricing-templates/stats/usage',
      method: 'get',
      params
    })
  },

  /**
   * 获取折扣类型统计
   * @param {Object} params - 查询参数
   */
  getDiscountTypeStats(params = {}) {
    return request({
      url: '/api/role-pricing-templates/stats/discount-types',
      method: 'get',
      params
    })
  },

  /**
   * 复制角色定价模板
   * @param {string} id - 模板ID
   * @param {Object} data - 复制数据
   * @param {string} data.new_role_name - 新角色名称
   * @param {string} data.target_company_id - 目标公司ID
   * @param {Array} data.target_store_ids - 目标门店ID数组
   */
  copy(id, data) {
    return request({
      url: `/api/role-pricing-templates/${id}/copy`,
      method: 'post',
      data
    })
  },

  /**
   * 导出角色定价模板
   * @param {Object} params - 查询参数
   */
  export(params = {}) {
    return request({
      url: '/api/role-pricing-templates/export',
      method: 'get',
      params,
      responseType: 'blob'
    })
  },

  /**
   * 导入角色定价模板
   * @param {FormData} formData - 上传的文件数据
   */
  import(formData) {
    return request({
      url: '/api/role-pricing-templates/import',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 🆕 专门为下单场景获取角色定价模板（下单专用接口）
   * @param {string} storeId - 门店ID
   * @param {Object} params - 查询参数（可选）
   * @returns {Promise} 返回适合下单界面的角色定价模板列表
   */
  getTemplatesForOrder(storeId, params = {}) {
    return request({
      url: `/api/role-pricing-templates/for-order/${storeId}`,
      method: 'get',
      params
    })
  }
}

// 定价日历API
export const pricingCalendarAPI = {
  /**
   * 获取定价日历列表
   * @param {Object} params - 查询参数
   * @param {string} params.date_type - 日期类型
   * @param {string} params.company_id - 公司ID
   * @param {string} params.store_id - 门店ID
   * @param {string} params.start_date - 开始日期
   * @param {string} params.end_date - 结束日期
   * @param {boolean} params.is_active - 是否激活
   * @param {number} params.page - 页码
   * @param {number} params.page_size - 每页数量
   */
  getList(params = {}) {
    return request({
      url: '/api/pricing-calendar',
      method: 'get',
      params
    })
  },

  /**
   * 获取定价日历详情
   * @param {string} id - 日历ID
   */
  getById(id) {
    return request({
      url: `/api/pricing-calendar/${id}`,
      method: 'get'
    })
  },

  /**
   * 创建定价日历
   * @param {Object} data - 日历数据
   * @param {string} data.date_type - 日期类型
   * @param {string} data.specific_date - 具体日期
   * @param {string} data.discount_type - 折扣类型
   * @param {number} data.discount_value - 折扣值
   * @param {Array} data.store_ids - 门店ID数组
   * @param {string} data.description - 描述
   */
  create(data) {
    return request({
      url: '/api/pricing-calendar',
      method: 'post',
      data
    })
  },

  /**
   * 更新定价日历
   * @param {string} id - 日历ID
   * @param {Object} data - 更新数据
   */
  update(id, data) {
    return request({
      url: `/api/pricing-calendar/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除定价日历
   * @param {string} id - 日历ID
   */
  delete(id) {
    return request({
      url: `/api/pricing-calendar/${id}`,
      method: 'delete'
    })
  },

  /**
   * 获取公司定价日历
   * @param {string} companyId - 公司ID
   * @param {Object} params - 查询参数
   */
  getByCompanyId(companyId, params = {}) {
    return request({
      url: `/api/pricing-calendar/company/${companyId}`,
      method: 'get',
      params
    })
  },

  /**
   * 获取门店定价日历
   * @param {string} storeId - 门店ID
   * @param {Object} params - 查询参数
   */
  getByStoreId(storeId, params = {}) {
    return request({
      url: `/api/pricing-calendar/store/${storeId}`,
      method: 'get',
      params
    })
  },

  /**
   * 获取指定日期的定价规则
   * @param {Object} params - 查询参数
   * @param {string} params.date - 日期
   * @param {string} params.company_id - 公司ID
   * @param {string} params.store_id - 门店ID
   */
  getByDate(params) {
    return request({
      url: '/api/pricing-calendar/date',
      method: 'get',
      params
    })
  },

  /**
   * 批量创建定价日历
   * @param {Array} data - 日历数据数组
   */
  batchCreate(data) {
    return request({
      url: '/api/pricing-calendar/batch',
      method: 'post',
      data
    })
  },

  /**
   * 批量更新激活状态
   * @param {Object} data - 批量更新数据
   * @param {Array} data.calendar_ids - 日历ID数组
   * @param {boolean} data.is_active - 是否激活
   */
  batchUpdateStatus(data) {
    return request({
      url: '/api/pricing-calendar/batch/status',
      method: 'put',
      data
    })
  },

  /**
   * 计算日期价格
   * @param {Object} data - 计算数据
   * @param {string} data.date - 日期
   * @param {number} data.base_price - 基础价格
   * @param {string} data.company_id - 公司ID
   * @param {string} data.store_id - 门店ID
   */
  calculatePrice(data) {
    return request({
      url: '/api/pricing-calendar/calculate',
      method: 'post',
      data
    })
  },

  /**
   * 获取定价日历统计
   * @param {Object} params - 查询参数
   * @param {string} params.company_id - 公司ID
   * @param {string} params.store_id - 门店ID
   * @param {string} params.start_date - 开始日期
   * @param {string} params.end_date - 结束日期
   */
  getStats(params = {}) {
    return request({
      url: '/api/pricing-calendar/stats',
      method: 'get',
      params
    })
  },

  /**
   * 获取日期类型统计
   * @param {Object} params - 查询参数
   */
  getDateTypeStats(params = {}) {
    return request({
      url: '/api/pricing-calendar/stats/date-types',
      method: 'get',
      params
    })
  },

  /**
   * 获取折扣类型统计
   * @param {Object} params - 查询参数
   */
  getDiscountTypeStats(params = {}) {
    return request({
      url: '/api/pricing-calendar/stats/discount-types',
      method: 'get',
      params
    })
  },

  /**
   * 自动生成节假日定价
   * @param {Object} data - 生成数据
   * @param {number} data.year - 年份
   * @param {Array} data.holiday_types - 节假日类型数组
   * @param {string} data.discount_type - 折扣类型
   * @param {number} data.discount_value - 折扣值
   * @param {Array} data.store_ids - 门店ID数组
   */
  generateHolidayPricing(data) {
    return request({
      url: '/api/pricing-calendar/generate/holidays',
      method: 'post',
      data
    })
  },

  /**
   * 复制定价日历
   * @param {string} id - 日历ID
   * @param {Object} data - 复制数据
   * @param {string} data.target_date - 目标日期
   * @param {string} data.target_company_id - 目标公司ID
   * @param {Array} data.target_store_ids - 目标门店ID数组
   */
  copy(id, data) {
    return request({
      url: `/api/pricing-calendar/${id}/copy`,
      method: 'post',
      data
    })
  },

  /**
   * 导出定价日历
   * @param {Object} params - 查询参数
   */
  export(params = {}) {
    return request({
      url: '/api/pricing-calendar/export',
      method: 'get',
      params,
      responseType: 'blob'
    })
  },

  /**
   * 导入定价日历
   * @param {FormData} formData - 上传的文件数据
   */
  import(formData) {
    return request({
      url: '/api/pricing-calendar/import',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}

// 统一导出所有API
export default {
  orderPlayerAPI,
  orderPaymentAPI,
  rolePricingTemplateAPI,
  pricingCalendarAPI
} 