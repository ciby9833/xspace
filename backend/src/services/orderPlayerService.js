//订单参与玩家服务
const BaseService = require('../core/BaseService');
const orderPlayerModel = require('../models/orderPlayerModel');
const orderModel = require('../models/orderModel');
const PermissionChecker = require('../utils/permissions');

class OrderPlayerService extends BaseService {
  constructor() {
    super(orderPlayerModel, '订单参与玩家');
  }

  // 创建订单参与玩家
  async createPlayer(playerData, user) {
    await PermissionChecker.requirePermission(user, 'order.edit');
    
    // 检查订单是否存在且用户有权限访问
    const order = await this.validateOrderAccess(playerData.order_id, user);
    
    // 检查玩家序号是否已存在
    const existingPlayer = await this.model.findByOrderAndPlayerOrder(
      playerData.order_id, 
      playerData.player_order
    );
    
    if (existingPlayer) {
      throw new Error('玩家序号已存在');
    }
    
    const player = await this.model.create({
      ...playerData,
      created_by: user.id
    });
    
    return this.formatTimeFields(player);
  }

  // 批量创建订单参与玩家
  async createPlayersBatch(playersData, user) {
    await PermissionChecker.requirePermission(user, 'order.edit');
    
    const { order_id, players } = playersData;
    
    // 检查订单是否存在且用户有权限访问
    await this.validateOrderAccess(order_id, user);
    
    // 检查玩家序号是否重复
    const playerOrders = players.map(p => p.player_order);
    const duplicateOrders = playerOrders.filter((order, index) => 
      playerOrders.indexOf(order) !== index
    );
    
    if (duplicateOrders.length > 0) {
      throw new Error(`玩家序号重复: ${duplicateOrders.join(', ')}`);
    }
    
    // 批量创建
    const createdPlayers = await this.model.createBatch(
      players.map(player => ({
        ...player,
        order_id,
        created_by: user.id
      }))
    );
    
    return this.formatTimeFieldsArray(createdPlayers);
  }

  // 获取订单的所有参与玩家
  async getPlayersByOrderId(orderId, withPayments = false, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单是否存在且用户有权限访问
    await this.validateOrderAccess(orderId, user);
    
    const players = await this.model.findByOrderId(orderId, withPayments);
    
    return this.formatTimeFieldsArray(players);
  }

  // 获取单个参与玩家详情
  async getPlayerDetail(playerId, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const player = await this.model.findById(playerId);
    if (!player) {
      throw new Error('参与玩家不存在');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(player.order_id, user);
    
    return this.formatTimeFields(player);
  }

  // 更新参与玩家信息
  async updatePlayer(playerId, updateData, user) {
    await PermissionChecker.requirePermission(user, 'order.edit');
    
    const existingPlayer = await this.model.findById(playerId);
    if (!existingPlayer) {
      throw new Error('参与玩家不存在');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(existingPlayer.order_id, user);
    
    // 如果更新玩家序号，检查是否重复
    if (updateData.player_order && updateData.player_order !== existingPlayer.player_order) {
      const duplicatePlayer = await this.model.findByOrderAndPlayerOrder(
        existingPlayer.order_id,
        updateData.player_order
      );
      
      if (duplicatePlayer) {
        throw new Error('玩家序号已存在');
      }
    }
    
    const updatedPlayer = await this.model.update(playerId, {
      ...updateData,
      updated_by: user.id,
      updated_at: new Date()
    });
    
    return this.formatTimeFields(updatedPlayer);
  }

  // 更新参与玩家支付状态
  async updatePaymentStatus(playerId, paymentStatus, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    const player = await this.model.findById(playerId);
    if (!player) {
      throw new Error('参与玩家不存在');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(player.order_id, user);
    
    const updatedPlayer = await this.model.updatePaymentStatus(playerId, paymentStatus);
    
    return this.formatTimeFields(updatedPlayer);
  }

  // 批量更新支付状态
  async updatePaymentStatusBatch(playerIds, paymentStatus, user) {
    await PermissionChecker.requirePermission(user, 'order.payment');
    
    // 检查所有玩家的访问权限
    const players = await this.model.findByIds(playerIds);
    const orderIds = [...new Set(players.map(p => p.order_id))];
    
    for (const orderId of orderIds) {
      await this.validateOrderAccess(orderId, user);
    }
    
    const updatedPlayers = await this.model.updatePaymentStatusBatch(playerIds, paymentStatus);
    
    return this.formatTimeFieldsArray(updatedPlayers);
  }

  // 删除参与玩家
  async deletePlayer(playerId, user) {
    await PermissionChecker.requirePermission(user, 'order.edit');
    
    const player = await this.model.findById(playerId);
    if (!player) {
      throw new Error('参与玩家不存在');
    }
    
    // 检查订单访问权限
    await this.validateOrderAccess(player.order_id, user);
    
    await this.model.delete(playerId);
    
    return { deleted: true };
  }

  // 获取订单的支付统计信息
  async getPaymentStats(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单访问权限
    await this.validateOrderAccess(orderId, user);
    
    const stats = await this.model.getPaymentStats(orderId);
    
    return stats;
  }

  // 获取角色使用统计
  async getRoleStats(user, startDate, endDate) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const stats = await this.model.getRoleStats(company_id, startDate, endDate);
    
    return stats;
  }

  // 获取下一个玩家序号
  async getNextPlayerOrder(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单访问权限
    await this.validateOrderAccess(orderId, user);
    
    const nextOrder = await this.model.getNextPlayerOrder(orderId);
    
    return nextOrder;
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

  // 获取玩家参与的订单统计
  async getPlayerOrderStats(user, startDate, endDate) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const stats = await this.model.getPlayerOrderStats(company_id, startDate, endDate);
    
    return stats;
  }

  // 获取热门角色排行
  async getPopularRoles(user, limit = 10) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const popularRoles = await this.model.getPopularRoles(company_id, limit);
    
    return popularRoles;
  }

  // 获取玩家参与历史
  async getPlayerHistory(customerInfo, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { company_id } = user;
    const history = await this.model.getPlayerHistory(company_id, customerInfo);
    
    return this.formatTimeFieldsArray(history);
  }

  // 检查玩家序号可用性
  async checkPlayerOrderAvailability(orderId, playerOrder, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单访问权限
    await this.validateOrderAccess(orderId, user);
    
    const existingPlayer = await this.model.findByOrderAndPlayerOrder(orderId, playerOrder);
    
    return {
      available: !existingPlayer,
      existing_player: existingPlayer ? this.formatTimeFields(existingPlayer) : null
    };
  }

  // 获取订单玩家摘要
  async getOrderPlayerSummary(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单访问权限
    await this.validateOrderAccess(orderId, user);
    
    const summary = await this.model.getOrderPlayerSummary(orderId);
    
    return summary;
  }

  // 复制玩家到其他订单
  async copyPlayersToOrder(sourceOrderId, targetOrderId, user) {
    await PermissionChecker.requirePermission(user, 'order.edit');
    
    // 检查两个订单的访问权限
    await this.validateOrderAccess(sourceOrderId, user);
    await this.validateOrderAccess(targetOrderId, user);
    
    const sourcePlayers = await this.model.findByOrderId(sourceOrderId);
    
    // 创建新的玩家记录
    const newPlayers = sourcePlayers.map(player => ({
      order_id: targetOrderId,
      player_order: player.player_order,
      player_name: player.player_name,
      player_phone: player.player_phone,
      selected_role: player.selected_role,
      role_price: player.role_price,
      discount_amount: player.discount_amount,
      final_price: player.final_price,
      payment_status: 'pending',
      notes: player.notes,
      created_by: user.id
    }));
    
    const createdPlayers = await this.model.createBatch(newPlayers);
    
    return this.formatTimeFieldsArray(createdPlayers);
  }

  // 重新计算所有玩家价格
  async recalculatePlayerPrices(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.edit');
    
    // 检查订单访问权限
    const order = await this.validateOrderAccess(orderId, user);
    
    const players = await this.model.findByOrderId(orderId);
    
    // 这里可以集成角色定价和日期定价逻辑
    const updatedPlayers = [];
    
    for (const player of players) {
      // 重新计算价格逻辑
      const recalculatedPrice = await this.calculatePlayerPrice(player, order);
      
      const updatedPlayer = await this.model.update(player.id, {
        role_price: recalculatedPrice.role_price,
        discount_amount: recalculatedPrice.discount_amount,
        final_price: recalculatedPrice.final_price,
        updated_by: user.id,
        updated_at: new Date()
      });
      
      updatedPlayers.push(updatedPlayer);
    }
    
    return this.formatTimeFieldsArray(updatedPlayers);
  }

  // 计算玩家价格（私有方法）
  async calculatePlayerPrice(player, order) {
    // 基础价格
    let basePrice = parseFloat(order.price || 0);
    
    // 角色价格调整
    let rolePrice = basePrice;
    let discountAmount = 0;
    
    // 这里可以集成角色定价模板和日期定价日历的逻辑
    // 暂时使用简单的计算逻辑
    
    const finalPrice = Math.max(0, rolePrice - discountAmount);
    
    return {
      role_price: rolePrice,
      discount_amount: discountAmount,
      final_price: finalPrice
    };
  }

  // 导出玩家数据
  async exportPlayerData(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 检查订单访问权限
    await this.validateOrderAccess(orderId, user);
    
    const players = await this.model.findByOrderId(orderId, true);
    
    // 格式化导出数据
    const exportData = players.map(player => ({
      玩家序号: player.player_order,
      玩家姓名: player.player_name,
      联系电话: player.player_phone,
      选择角色: player.selected_role,
      角色价格: player.role_price,
      折扣金额: player.discount_amount,
      最终价格: player.final_price,
      支付状态: this.getPaymentStatusText(player.payment_status),
      备注: player.notes,
      创建时间: this.formatTimeFields(player).created_at
    }));
    
    return exportData;
  }

  // 获取支付状态文本
  getPaymentStatusText(status) {
    const statusMap = {
      pending: '待支付',
      paid: '已支付',
      partial: '部分支付',
      refunded: '已退款'
    };
    
    return statusMap[status] || status;
  }
}

module.exports = new OrderPlayerService(); 