//支付记录服务
const BaseService = require('../core/BaseService');
const orderPaymentModel = require('../models/orderPaymentModel');
const orderModel = require('../models/orderModel');
const orderPlayerModel = require('../models/orderPlayerModel');
const PermissionChecker = require('../utils/permissions');
const { getFileUrl } = require('../utils/upload');

class OrderPaymentService extends BaseService {
  constructor() {
    super(orderPaymentModel, '支付记录');
  }

  // 创建支付记录
  async createPayment(paymentData, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    // 检查订单是否存在且用户有权限访问
    const order = await this.validateOrderAccess(paymentData.order_id, user);
    
    const payment = await this.model.create({
      ...paymentData,
      created_by: user.id
    });
    
    return this.formatTimeFields(payment);
  }

  // 创建支付记录并更新玩家状态
  async createPaymentAndUpdateStatus(paymentData, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    const { order_id, player_ids, payment_method, amount, payer_name, payer_phone, payment_proof_urls, notes } = paymentData;
    
    // 检查订单是否存在且用户有权限访问
    await this.validateOrderAccess(order_id, user);
    
    // 创建支付记录
    const payment = await this.model.createAndUpdatePlayerStatus({
      order_id,
      covers_player_ids: player_ids,  // 修正字段名
      payment_method,
      payment_amount: amount,  // 修正字段名
      payer_name,
      payer_phone,
      payment_proof_images: payment_proof_urls || [],  // 修正字段名并确保是数组
      notes,
      created_by: user.id
    });
    
    return this.formatTimeFields(payment);
  }

  // 🆕 上传支付凭证
  async uploadPaymentProof(files, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    const { uploadOrderImages, getFileUrl } = require('../utils/upload');
    const uploadedImages = [];
    
    // 处理上传的文件
    for (const file of files) {
      try {
        const imageUrl = getFileUrl(file.filename, 'order');
        uploadedImages.push({
          url: imageUrl,
          name: file.originalname,
          type: 'payment_proof',
          size: file.size
        });
      } catch (error) {
        console.error('处理上传文件失败:', error);
        throw new Error(`文件上传失败: ${file.originalname}`);
      }
    }
    
    return {
      images: uploadedImages,
      count: uploadedImages.length
    };
  }

  // 🆕 为现有支付记录添加/更新凭证
  async updatePaymentProof(paymentId, proofImages, mode = 'replace', user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    // 获取支付记录详情以验证权限
    const payment = await this.model.findById(paymentId);
    if (!payment) {
      throw new Error('支付记录不存在');
    }
    
    // 验证用户是否有权限操作该订单
    await this.validateOrderAccess(payment.order_id, user);
    
    let updatedPayment;
    if (mode === 'append') {
      // 追加模式：在现有凭证基础上添加新的
      updatedPayment = await this.model.addPaymentProof(paymentId, proofImages);
    } else {
      // 替换模式：完全替换现有凭证
      updatedPayment = await this.model.updatePaymentProof(paymentId, proofImages);
    }
    
    return this.formatTimeFields(updatedPayment);
  }

  // 获取订单的所有支付记录
  async getPaymentsByOrderId(orderId, withPlayers = false, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单是否存在且用户有权限访问
    await this.validateOrderAccess(orderId, user);
    
    const payments = await this.model.findByOrderId(orderId, withPlayers);
    
    // 🆕 格式化支付记录，包括图片格式转换
    const formattedPayments = this.formatTimeFieldsArray(payments).map(payment => {
      return this.formatPaymentImages(payment);
    });
    
    return formattedPayments;
  }

  // 获取单个支付记录详情
  async getPaymentDetail(paymentId, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const payment = await this.model.findById(paymentId);
    if (!payment) {
      throw new Error('支付记录不存在');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(payment.order_id, user);
    
    // 🆕 格式化支付记录，包括图片格式转换
    const formattedPayment = this.formatTimeFields(payment);
    return this.formatPaymentImages(formattedPayment);
  }

  // 更新支付记录
  async updatePayment(paymentId, updateData, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    const existingPayment = await this.model.findById(paymentId);
    if (!existingPayment) {
      throw new Error('支付记录不存在');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(existingPayment.order_id, user);
    
    const updatedPayment = await this.model.update(paymentId, {
      ...updateData,
      updated_by: user.id,
      updated_at: new Date()
    });
    
    return this.formatTimeFields(updatedPayment);
  }

  // 更新支付状态
  async updatePaymentStatus(paymentId, paymentStatus, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    const payment = await this.model.findById(paymentId);
    if (!payment) {
      throw new Error('支付记录不存在');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(payment.order_id, user);
    
    const updatedPayment = await this.model.updatePaymentStatus(paymentId, paymentStatus);
    
    return this.formatTimeFields(updatedPayment);
  }

  // 确认支付
  async confirmPayment(paymentId, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    const payment = await this.model.findById(paymentId);
    if (!payment) {
      throw new Error('支付记录不存在');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(payment.order_id, user);
    
    const confirmedPayment = await this.model.confirmPayment(paymentId);
    
    return this.formatTimeFields(confirmedPayment);
  }

  // 删除支付记录
  async deletePayment(paymentId, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    const payment = await this.model.findById(paymentId);
    if (!payment) {
      throw new Error('支付记录不存在');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(payment.order_id, user);
    
    await this.model.delete(paymentId);
    
    return { deleted: true };
  }

  // 获取支付统计信息
  async getPaymentStats(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单访问权限
    await this.validateOrderAccess(orderId, user);
    
    const stats = await this.model.getPaymentStats(orderId);
    
    return stats;
  }

  // 获取公司支付统计
  async getCompanyPaymentStats(user, startDate, endDate) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const stats = await this.model.getCompanyPaymentStats(company_id, startDate, endDate);
    
    return stats;
  }

  // 获取支付方式统计
  async getPaymentMethodStats(user, startDate, endDate) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const stats = await this.model.getPaymentMethodStats(company_id, startDate, endDate);
    
    return stats;
  }

  // 获取付款人统计
  async getPaymentsByPayer(user, startDate, endDate) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const stats = await this.model.getPaymentsByPayer(company_id, startDate, endDate);
    
    return this.formatTimeFieldsArray(stats);
  }

  // 合并支付记录
  async mergePayments(paymentIds, mergeData, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    // 检查所有支付记录是否存在并且用户有权限
    const payments = await this.model.findByIds(paymentIds);
    if (payments.length !== paymentIds.length) {
      throw new Error('没有找到要合并的支付记录');
    }
    
    // 检查所有支付记录是否属于同一订单
    const orderIds = [...new Set(payments.map(p => p.order_id))];
    if (orderIds.length > 1) {
      throw new Error('只能合并同一订单的支付记录');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(orderIds[0], user);
    
    const mergedPayment = await this.model.mergePayments(paymentIds, {
      ...mergeData,
      updated_by: user.id
    });
    
    return this.formatTimeFields(mergedPayment);
  }

  // 上传支付凭证
  async uploadPaymentProof(paymentId, files, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    const payment = await this.model.findById(paymentId);
    if (!payment) {
      throw new Error('支付记录不存在');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(payment.order_id, user);
    
    // 处理文件上传
    const proofUrls = files.map(file => getFileUrl(file.filename, 'order'));
    
    // 更新支付记录
    const existingProofUrls = payment.payment_proof_urls || [];
    const newProofUrls = [...existingProofUrls, ...proofUrls];
    
    const updatedPayment = await this.model.update(paymentId, {
      payment_proof_urls: newProofUrls,
      updated_by: user.id,
      updated_at: new Date()
    });
    
    return this.formatTimeFields(updatedPayment);
  }

  // 验证订单访问权限
  async validateOrderAccess(orderId, user) {
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new Error('订单不存在');
    }
    
    // 检查公司权限
    if (order.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    // 检查门店权限（如果用户是门店级别）
    if (user.account_level === 'store' && user.store_ids) {
      const hasStoreAccess = user.store_ids.includes(order.store_id);
      if (!hasStoreAccess) {
        throw new Error('权限不足');
      }
    }
    
    return order;
  }

  // 获取支付方式列表
  async getPaymentMethods(user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const methods = await this.model.getPaymentMethods();
    
    return methods;
  }

  // 获取热门付款人
  async getTopPayers(user, limit = 10) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const topPayers = await this.model.getTopPayers(company_id, limit);
    
    return topPayers;
  }

  // 获取支付趋势
  async getPaymentTrends(user, startDate, endDate, granularity = 'day') {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const trends = await this.model.getPaymentTrends(company_id, startDate, endDate, granularity);
    
    return trends;
  }

  // 获取未完成支付的订单
  async getUnpaidOrders(user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const unpaidOrders = await this.model.getUnpaidOrders(company_id);
    
    return this.formatTimeFieldsArray(unpaidOrders);
  }

  // 获取部分支付的订单
  async getPartialPaidOrders(user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const partialPaidOrders = await this.model.getPartialPaidOrders(company_id);
    
    return this.formatTimeFieldsArray(partialPaidOrders);
  }

  // 获取退款记录
  async getRefunds(user, startDate, endDate) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const refunds = await this.model.getRefunds(company_id, startDate, endDate);
    
    return this.formatTimeFieldsArray(refunds);
  }

  // 处理退款
  async processRefund(paymentId, refundData, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    const payment = await this.model.findById(paymentId);
    if (!payment) {
      throw new Error('支付记录不存在');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(payment.order_id, user);
    
    const refundRecord = await this.model.processRefund(paymentId, {
      ...refundData,
      processed_by: user.id
    });
    
    return this.formatTimeFields(refundRecord);
  }

  // 获取支付记录历史
  async getPaymentHistory(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单访问权限
    await this.validateOrderAccess(orderId, user);
    
    const history = await this.model.getPaymentHistory(orderId);
    
    return this.formatTimeFieldsArray(history);
  }

  // 验证支付金额
  async validatePaymentAmount(orderId, amount, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单访问权限
    const order = await this.validateOrderAccess(orderId, user);
    
    const paymentStats = await this.model.getPaymentStats(orderId);
    const remainingAmount = parseFloat(order.total_amount || 0) - parseFloat(paymentStats.paid_amount || 0);
    
    return {
      is_valid: parseFloat(amount) <= remainingAmount,
      remaining_amount: remainingAmount,
      total_amount: parseFloat(order.total_amount || 0),
      paid_amount: parseFloat(paymentStats.paid_amount || 0)
    };
  }

  // 自动匹配支付记录
  async autoMatchPayments(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    // 检查订单访问权限
    await this.validateOrderAccess(orderId, user);
    
    const matchedPayments = await this.model.autoMatchPayments(orderId);
    
    return this.formatTimeFieldsArray(matchedPayments);
  }

  // 导出支付数据
  async exportPaymentData(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单访问权限
    await this.validateOrderAccess(orderId, user);
    
    const payments = await this.model.findByOrderId(orderId, true);
    
    // 格式化导出数据
    const exportData = payments.map(payment => ({
      支付ID: payment.id,
      订单ID: payment.order_id,
      支付方式: payment.payment_method,
      支付金额: payment.amount,
      付款人姓名: payment.payer_name,
      付款人电话: payment.payer_phone,
      支付状态: this.getPaymentStatusText(payment.payment_status),
      确认时间: payment.confirmed_at ? this.formatTimeFields(payment).confirmed_at : '',
      备注: payment.notes,
      创建时间: this.formatTimeFields(payment).created_at
    }));
    
    return exportData;
  }

  // 获取支付状态文本
  getPaymentStatusText(status) {
    const statusMap = {
      pending: '待确认',
      confirmed: '已确认',
      failed: '失败',
      refunded: '已退款'
    };
    
    return statusMap[status] || status;
  }

  // 发送支付提醒
  async sendPaymentReminder(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    // 检查订单访问权限
    const order = await this.validateOrderAccess(orderId, user);
    
    // 获取未支付的玩家
    const unpaidPlayers = await orderPlayerModel.findUnpaidPlayers(orderId);
    
    // 这里可以集成短信或邮件服务发送提醒
    // 暂时返回需要提醒的玩家信息
    
    return {
      order_id: orderId,
      unpaid_players: unpaidPlayers,
      reminder_sent: true,
      sent_at: new Date().toISOString()
    };
  }

  // 计算支付手续费
  async calculatePaymentFee(paymentMethod, amount) {
    const feeRates = {
      'wechat': 0.006,  // 微信支付手续费
      'alipay': 0.006,  // 支付宝手续费
      'bank_transfer': 0.001,  // 银行转账手续费
      'cash': 0,  // 现金无手续费
      'credit_card': 0.025  // 信用卡手续费
    };
    
    const feeRate = feeRates[paymentMethod] || 0;
    const fee = parseFloat(amount) * feeRate;
    
    return {
      fee_rate: feeRate,
      fee_amount: Math.round(fee * 100) / 100,  // 保留两位小数
      net_amount: parseFloat(amount) - fee
    };
  }

  // 批量处理支付
  async batchProcessPayments(paymentIds, action, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    const payments = await this.model.findByIds(paymentIds);
    const results = [];
    
    for (const payment of payments) {
      try {
        // 检查订单访问权限
        await this.validateOrderAccess(payment.order_id, user);
        
        let result;
        switch (action) {
          case 'confirm':
            result = await this.model.confirmPayment(payment.id);
            break;
          case 'reject':
            result = await this.model.updatePaymentStatus(payment.id, 'failed');
            break;
          default:
            throw new Error('不支持的操作');
        }
        
        results.push({
          payment_id: payment.id,
          success: true,
          data: this.formatTimeFields(result)
        });
      } catch (error) {
        results.push({
          payment_id: payment.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // 🆕 格式化支付记录的图片数据
  formatPaymentImages(payment) {
    const formatted = { ...payment };
    
    // 将 payment_proof_images 转换为标准的 images 格式
    if (payment.payment_proof_images && Array.isArray(payment.payment_proof_images)) {
      formatted.images = payment.payment_proof_images.map((img, index) => {
        let imageData;
        
        // 如果是字符串，尝试解析JSON
        if (typeof img === 'string') {
          try {
            imageData = JSON.parse(img);
          } catch (e) {
            console.warn('解析payment_proof_images失败:', e);
            // 如果解析失败，假设是URL字符串
            imageData = { url: img, name: `image_${index}`, type: 'proof' };
          }
        } else if (typeof img === 'object') {
          imageData = img;
        } else {
          imageData = { url: img, name: `image_${index}`, type: 'proof' };
        }
        
        // 标准化字段名称
        return {
          id: imageData.id || `payment_proof_${payment.id}_${index}`,
          image_url: imageData.url || imageData.image_url,
          image_name: imageData.name || imageData.image_name || `payment_proof_${index}`,
          image_type: imageData.type || imageData.image_type || 'proof',
          sort_order: imageData.sort_order || index,
          server_path: imageData.server_path || imageData.path
        };
      });
      
      // 移除原始的 payment_proof_images 字段
      delete formatted.payment_proof_images;
    } else {
      formatted.images = [];
    }
    
    return formatted;
  }

  // 🤖 获取订单AI识别结果
  async getOrderRecognitionResult(orderId, user) {
    // 检查权限
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单是否存在且用户有权限访问
    const order = await this.validateOrderAccess(orderId, user);
    
    const pool = require('../database/connection');
    const client = await pool.connect();
    
    try {
      // 获取订单AI识别结果
      const orderResult = await client.query(`
        SELECT 
          id,
          enable_multi_payment,
          ai_recognition_status,
          ai_recognition_result,
          ai_recognition_error,
          ai_recognition_at,
          ai_recognition_confidence,
          ai_total_recognized_amount,
          ai_total_confidence_score,
          ai_recognition_summary
        FROM orders 
        WHERE id = $1
      `, [orderId]);
      
      const orderData = orderResult.rows[0];
      
      let result = {
        order_id: orderId,
        enable_multi_payment: orderData.enable_multi_payment,
        order_recognition: {
          status: orderData.ai_recognition_status || 'pending',
          result: orderData.ai_recognition_result,
          error: orderData.ai_recognition_error,
          recognized_at: orderData.ai_recognition_at,
          confidence: orderData.ai_recognition_confidence,
          // 🆕 新增总金额相关字段
          total_recognized_amount: orderData.ai_total_recognized_amount,
          total_confidence_score: orderData.ai_total_confidence_score,
          recognition_summary: orderData.ai_recognition_summary
        },
        payments_recognition: []
      };
      
      if (orderData.enable_multi_payment) {
        // 多笔支付：获取每个支付记录的AI识别结果
        const paymentsResult = await client.query(`
          SELECT 
            id,
            payer_name,
            payment_amount,
            ai_recognition_status,
            ai_recognition_result,
            ai_recognition_error,
            ai_recognition_at,
            ai_recognition_confidence
          FROM order_payments 
          WHERE order_id = $1
          ORDER BY created_at
        `, [orderId]);
        
        result.payments_recognition = paymentsResult.rows.map(payment => ({
          payment_id: payment.id,
          payer_name: payment.payer_name,
          payment_amount: payment.payment_amount,
          status: payment.ai_recognition_status || 'pending',
          result: payment.ai_recognition_result,
          error: payment.ai_recognition_error,
          recognized_at: payment.ai_recognition_at,
          confidence: payment.ai_recognition_confidence
        }));
      }
      
      return result;
      
    } finally {
      client.release();
    }
  }
}

module.exports = new OrderPaymentService(); 