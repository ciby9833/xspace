const escapeRoomModel = require('../models/escapeRoomModel');
const { ACCOUNT_LEVELS } = require('../config/permissions');

class EscapeRoomService {
  // 🔧 解析 JSON 字段的辅助方法
  parseJsonField(field, defaultValue = []) {
    if (!field) return defaultValue;
    
    // 如果已经是数组，直接返回
    if (Array.isArray(field)) {
      return field;
    }
    
    // 如果是字符串，尝试解析
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : defaultValue;
      } catch (e) {
        console.warn('JSON 解析失败:', field, e.message);
        return defaultValue;
      }
    }
    
    return defaultValue;
  }
  // 获取密室列表
  async getList(filters = {}, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      // 根据用户层级确定查询范围
      let companyId = user.company_id;
      
      // 平台级用户可以查看所有公司的密室（如果指定了公司ID）
      if (user.account_level === ACCOUNT_LEVELS.PLATFORM && filters.company_id) {
        companyId = filters.company_id;
      }

      // 🆕 优化筛选条件处理
      const processedFilters = {
        // 恐怖等级筛选
        horror_level: filters.horror_level,
        
        // 状态筛选 - 确保正确处理布尔值
        is_active: filters.is_active !== undefined ? 
          (filters.is_active === 'true' || filters.is_active === true) : undefined,
        
        // 人数筛选 - 确保转换为数字
        min_players: filters.min_players ? parseInt(filters.min_players) : undefined,
        max_players: filters.max_players ? parseInt(filters.max_players) : undefined,
        
        // 🆕 价格范围筛选
        min_price: filters.min_price !== undefined && filters.min_price !== null ? 
          parseFloat(filters.min_price) : undefined,
        max_price: filters.max_price !== undefined && filters.max_price !== null ? 
          parseFloat(filters.max_price) : undefined,
        
        // 🆕 时长筛选
        min_duration: filters.min_duration ? parseInt(filters.min_duration) : undefined,
        max_duration: filters.max_duration ? parseInt(filters.max_duration) : undefined,
        
        // 🆕 NPC数量筛选
        min_npc_count: filters.min_npc_count !== undefined && filters.min_npc_count !== null ? 
          parseInt(filters.min_npc_count) : undefined,
        max_npc_count: filters.max_npc_count !== undefined && filters.max_npc_count !== null ? 
          parseInt(filters.max_npc_count) : undefined,
        
        // 🆕 关键词搜索
        keyword: filters.keyword ? filters.keyword.trim() : undefined
      };

      // 移除undefined值，避免传递给数据库
      Object.keys(processedFilters).forEach(key => {
        if (processedFilters[key] === undefined) {
          delete processedFilters[key];
        }
      });

      const escapeRooms = await escapeRoomModel.findByCompanyId(companyId, processedFilters);
      
      // 🔧 处理 JSON 字段，确保前端接收到正确的数据格式
      const processedEscapeRooms = escapeRooms.map(escapeRoom => ({
        ...escapeRoom,
        // 处理 supported_languages 字段
        supported_languages: this.parseJsonField(escapeRoom.supported_languages, ['IND']),
        // 处理 cover_images 字段
        cover_images: this.parseJsonField(escapeRoom.cover_images, []),
        // 处理 npc_roles 字段
        npc_roles: this.parseJsonField(escapeRoom.npc_roles, [])
      }));
      
      return {
        list: processedEscapeRooms,
        total: processedEscapeRooms.length,
        filters: processedFilters
      };
    } catch (error) {
      console.error('获取密室列表失败:', error);
      throw error;
    }
  }

  // 获取密室详情
  async getById(escapeRoomId, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      let companyId = user.company_id;
      
      // 平台级用户可以查看所有密室
      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        companyId = null;
      }

      const escapeRoom = await escapeRoomModel.findById(escapeRoomId, companyId);
      
      if (!escapeRoom) {
        throw new Error('密室不存在');
      }

      // 非平台级用户只能查看自己公司的密室
      if (user.account_level !== ACCOUNT_LEVELS.PLATFORM && 
          escapeRoom.company_id !== user.company_id) {
        throw new Error('权限不足');
      }

      // 🔧 处理 JSON 字段
      const processedEscapeRoom = {
        ...escapeRoom,
        supported_languages: this.parseJsonField(escapeRoom.supported_languages, ['IND']),
        cover_images: this.parseJsonField(escapeRoom.cover_images, []),
        npc_roles: this.parseJsonField(escapeRoom.npc_roles, [])
      };

      return processedEscapeRoom;
    } catch (error) {
      console.error('获取密室详情失败:', error);
      throw error;
    }
  }

  // 创建密室
  async create(escapeRoomData, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      // 验证必填字段
      const requiredFields = ['name', 'horror_level', 'min_players', 'max_players', 'duration'];
      for (const field of requiredFields) {
        if (!escapeRoomData[field]) {
          throw new Error(`${field} 是必填字段`);
        }
      }

      // 验证恐怖等级
      const validHorrorLevels = ['非恐', '微恐', '中恐', '重恐'];
      if (!validHorrorLevels.includes(escapeRoomData.horror_level)) {
        throw new Error('恐怖等级无效');
      }

      // 验证人数范围
      if (escapeRoomData.min_players > escapeRoomData.max_players) {
        throw new Error('最少人数不能大于最多人数');
      }

      // 设置公司ID
      const createData = {
        ...escapeRoomData,
        company_id: user.company_id
      };

      const escapeRoom = await escapeRoomModel.create(createData);
      
      // 🔧 处理 JSON 字段
      const processedEscapeRoom = {
        ...escapeRoom,
        supported_languages: this.parseJsonField(escapeRoom.supported_languages, ['IND']),
        cover_images: this.parseJsonField(escapeRoom.cover_images, []),
        npc_roles: this.parseJsonField(escapeRoom.npc_roles, [])
      };
      
      return processedEscapeRoom;
    } catch (error) {
      console.error('创建密室失败:', error);
      throw error;
    }
  }

  // 更新密室
  async update(escapeRoomId, updateData, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      // 检查密室是否存在且属于当前用户的公司
      const existingEscapeRoom = await escapeRoomModel.findById(escapeRoomId, user.company_id);
      if (!existingEscapeRoom) {
        throw new Error('密室不存在或权限不足');
      }

      // 验证恐怖等级（如果提供）
      if (updateData.horror_level) {
        const validHorrorLevels = ['非恐', '微恐', '中恐', '重恐'];
        if (!validHorrorLevels.includes(updateData.horror_level)) {
          throw new Error('恐怖等级无效');
        }
      }

      // 验证人数范围（如果提供）
      const minPlayers = updateData.min_players || existingEscapeRoom.min_players;
      const maxPlayers = updateData.max_players || existingEscapeRoom.max_players;
      if (minPlayers > maxPlayers) {
        throw new Error('最少人数不能大于最多人数');
      }

      // 移除不允许更新的字段
      const { company_id, id, created_at, ...allowedUpdateData } = updateData;

      const updatedEscapeRoom = await escapeRoomModel.update(escapeRoomId, allowedUpdateData);
      
      // 🔧 处理 JSON 字段
      const processedEscapeRoom = {
        ...updatedEscapeRoom,
        supported_languages: this.parseJsonField(updatedEscapeRoom.supported_languages, ['IND']),
        cover_images: this.parseJsonField(updatedEscapeRoom.cover_images, []),
        npc_roles: this.parseJsonField(updatedEscapeRoom.npc_roles, [])
      };
      
      return processedEscapeRoom;
    } catch (error) {
      console.error('更新密室失败:', error);
      throw error;
    }
  }

  // 删除密室
  async delete(escapeRoomId, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      // 检查密室是否存在且属于当前用户的公司
      const existingEscapeRoom = await escapeRoomModel.findById(escapeRoomId, user.company_id);
      if (!existingEscapeRoom) {
        throw new Error('密室不存在或权限不足');
      }

      await escapeRoomModel.delete(escapeRoomId);
      return { success: true };
    } catch (error) {
      console.error('删除密室失败:', error);
      throw error;
    }
  }

  // 获取门店密室列表
  async getStoreEscapeRooms(storeId, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      const escapeRooms = await escapeRoomModel.findByStoreId(storeId);
      
      // 🔧 处理 JSON 字段
      const processedEscapeRooms = escapeRooms.map(escapeRoom => ({
        ...escapeRoom,
        supported_languages: this.parseJsonField(escapeRoom.supported_languages, ['IND']),
        cover_images: this.parseJsonField(escapeRoom.cover_images, []),
        npc_roles: this.parseJsonField(escapeRoom.npc_roles, [])
      }));
      
      return processedEscapeRooms;
    } catch (error) {
      console.error('获取门店密室列表失败:', error);
      throw error;
    }
  }

  // 配置门店密室
  async configureStoreEscapeRoom(storeId, escapeRoomId, config, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      // 检查密室是否存在且属于当前用户的公司
      const escapeRoom = await escapeRoomModel.findById(escapeRoomId, user.company_id);
      if (!escapeRoom) {
        throw new Error('密室不存在或权限不足');
      }

      const result = await escapeRoomModel.configureForStore(storeId, escapeRoomId, config);
      return result;
    } catch (error) {
      console.error('配置门店密室失败:', error);
      throw error;
    }
  }

  // 获取密室统计
  async getStats(user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      const horrorLevelStats = await escapeRoomModel.getHorrorLevelStats(user.company_id);
      
      return {
        horror_level_stats: horrorLevelStats,
        total_escape_rooms: horrorLevelStats.reduce((sum, stat) => sum + parseInt(stat.count), 0)
      };
    } catch (error) {
      console.error('获取密室统计失败:', error);
      throw error;
    }
  }

  // 批量更新状态
  async batchUpdateStatus(escapeRoomIds, isActive, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      const result = await escapeRoomModel.batchUpdateStatus(escapeRoomIds, isActive, user.company_id);
      return result;
    } catch (error) {
      console.error('批量更新密室状态失败:', error);
      throw error;
    }
  }

  // 批量删除
  async batchDelete(escapeRoomIds, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      const result = await escapeRoomModel.batchDelete(escapeRoomIds, user.company_id);
      return result;
    } catch (error) {
      console.error('批量删除密室失败:', error);
      throw error;
    }
  }

  // 获取公司门店列表
  async getCompanyStores(user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      const stores = await escapeRoomModel.getCompanyStores(user.company_id);
      return stores;
    } catch (error) {
      console.error('获取门店列表失败:', error);
      throw error;
    }
  }

  // 批量配置门店密室
  async batchConfigureStores(escapeRoomId, storeConfigs, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      // 检查密室是否存在且属于当前用户的公司
      const escapeRoom = await escapeRoomModel.findById(escapeRoomId, user.company_id);
      if (!escapeRoom) {
        throw new Error('密室不存在或权限不足');
      }

      const result = await escapeRoomModel.batchConfigureStores(escapeRoomId, storeConfigs);
      return result;
    } catch (error) {
      console.error('批量配置门店密室失败:', error);
      throw error;
    }
  }

  // 获取密室的门店配置
  async getEscapeRoomStoreConfigs(escapeRoomId, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      // 检查密室是否存在且属于当前用户的公司
      const escapeRoom = await escapeRoomModel.findById(escapeRoomId, user.company_id);
      if (!escapeRoom) {
        throw new Error('密室不存在或权限不足');
      }

      const configs = await escapeRoomModel.getEscapeRoomStoreConfigs(escapeRoomId);
      return configs;
    } catch (error) {
      console.error('获取密室门店配置失败:', error);
      throw error;
    }
  }

  // 删除密室图片
  async deleteImage(escapeRoomId, imageUrl, user) {
    try {
      // 权限验证
      if (!user || !user.company_id) {
        throw new Error('权限不足');
      }

      // 检查密室是否存在且属于当前用户的公司
      const escapeRoom = await escapeRoomModel.findById(escapeRoomId, user.company_id);
      if (!escapeRoom) {
        throw new Error('密室不存在或权限不足');
      }

      // 从图片数组中移除指定图片
      const currentImages = Array.isArray(escapeRoom.cover_images) ? escapeRoom.cover_images : [];
      const updatedImages = currentImages.filter(img => img !== imageUrl);

      // 更新密室
      const result = await escapeRoomModel.update(escapeRoomId, { cover_images: updatedImages });
      
      // 🔧 处理 JSON 字段
      const processedResult = {
        ...result,
        supported_languages: this.parseJsonField(result.supported_languages, ['IND']),
        cover_images: this.parseJsonField(result.cover_images, []),
        npc_roles: this.parseJsonField(result.npc_roles, [])
      };
      
      return processedResult;
    } catch (error) {
      console.error('删除密室图片失败:', error);
      throw error;
    }
  }
}

module.exports = new EscapeRoomService(); 