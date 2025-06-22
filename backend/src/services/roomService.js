const roomModel = require('../models/roomModel');
const storeModel = require('../models/storeModel');
const { ACCOUNT_LEVELS } = require('../config/permissions');
const { deleteFile, getFileUrl } = require('../utils/upload');

class RoomService {
  // 获取房间列表
  async getList(filters = {}, user) {
    try {
      // 权限验证
      if (!user) {
        throw new Error('权限不足');
      }

      let rooms = [];

      // 根据用户层级确定查询范围
      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        // 平台级用户可以查看所有房间
        rooms = await roomModel.findAllWithCompanyInfo(filters);
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        // 公司级用户只能查看本公司的房间
        if (!user.company_id) {
          throw new Error('权限不足');
        }
        rooms = await roomModel.findByCompanyId(user.company_id, filters);
      } else {
        // 门店级用户只能查看关联门店的房间
        if (!user.company_id) {
          throw new Error('权限不足');
        }
        
        // 获取用户关联的门店
        const userStores = await storeModel.getAccessibleStores(
          user.user_id, 
          user.account_level, 
          user.company_id
        );
        
        if (userStores.length === 0) {
          return [];
        }

        // 如果指定了门店ID，验证权限
        if (filters.store_id) {
          const hasAccess = userStores.some(store => store.id === filters.store_id);
          if (!hasAccess) {
            throw new Error('权限不足');
          }
          rooms = await roomModel.findByStoreId(filters.store_id, filters);
        } else {
          // 获取所有关联门店的房间
          const allRooms = [];
          for (const store of userStores) {
            const storeRooms = await roomModel.findByStoreId(store.id, filters);
            allRooms.push(...storeRooms);
          }
          rooms = allRooms;
        }
      }

      return rooms;
    } catch (error) {
      console.error('获取房间列表失败:', error);
      throw error;
    }
  }

  // 获取房间详情
  async getById(roomId, user) {
    try {
      // 权限验证
      if (!user) {
        throw new Error('权限不足');
      }

      const room = await roomModel.findById(roomId);
      
      if (!room) {
        throw new Error('房间不存在');
      }

      // 权限检查
      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        // 平台级用户可以查看所有房间
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        // 公司级用户只能查看本公司的房间
        if (!user.company_id || room.company_id !== user.company_id) {
          throw new Error('权限不足');
        }
      } else {
        // 门店级用户只能查看关联门店的房间
        if (!user.company_id || room.company_id !== user.company_id) {
          throw new Error('权限不足');
        }
        
        // 验证门店访问权限
        const userStores = await storeModel.getAccessibleStores(
          user.user_id, 
          user.account_level, 
          user.company_id
        );
        
        const hasAccess = userStores.some(store => store.id === room.store_id);
        if (!hasAccess) {
          throw new Error('权限不足');
        }
      }

      // 获取房间图片并添加完整URL
      const images = await roomModel.getRoomImages(roomId);
      room.images = images.map(image => ({
        ...image,
        full_url: getFileUrl(image.image_name, 'room')
      }));

      return room;
    } catch (error) {
      console.error('获取房间详情失败:', error);
      throw error;
    }
  }

  // 创建房间
  async create(roomData, user) {
    try {
      // 权限验证
      if (!user) {
        throw new Error('权限不足');
      }

      // 验证必填字段
      const requiredFields = ['store_id', 'name', 'room_type', 'capacity'];
      for (const field of requiredFields) {
        if (!roomData[field]) {
          throw new Error(`${field} 是必填字段`);
        }
      }

      // 验证房间类型
      const validRoomTypes = ['剧本杀', '密室', '混合'];
      if (!validRoomTypes.includes(roomData.room_type)) {
        throw new Error('房间类型无效');
      }

      // 验证房间状态
      const validStatuses = ['正常', '维护', '关闭'];
      if (roomData.status && !validStatuses.includes(roomData.status)) {
        throw new Error('房间状态无效');
      }

      // 验证容量
      if (roomData.capacity < 1 || roomData.capacity > 50) {
        throw new Error('房间容量应在1-50之间');
      }

      // 权限检查 - 验证门店访问权限
      const store = await storeModel.findById(roomData.store_id);
      if (!store) {
        throw new Error('门店不存在');
      }

      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        // 平台级用户可以为任何门店创建房间
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        // 公司级用户只能为本公司的门店创建房间
        if (!user.company_id || store.company_id !== user.company_id) {
          throw new Error('权限不足');
        }
      } else {
        // 门店级用户只能为关联的门店创建房间
        if (!user.company_id || store.company_id !== user.company_id) {
          throw new Error('权限不足');
        }
        
        const userStores = await storeModel.getAccessibleStores(
          user.user_id, 
          user.account_level, 
          user.company_id
        );
        
        const hasAccess = userStores.some(userStore => userStore.id === roomData.store_id);
        if (!hasAccess) {
          throw new Error('权限不足');
        }
      }

      // 检查房间名称唯一性
      const isNameUnique = await roomModel.checkNameUnique(roomData.store_id, roomData.name);
      if (!isNameUnique) {
        throw new Error('房间名称已存在');
      }

      const room = await roomModel.create(roomData);
      return room;
    } catch (error) {
      console.error('创建房间失败:', error);
      throw error;
    }
  }

  // 更新房间
  async update(roomId, updateData, user) {
    try {
      // 权限验证
      if (!user) {
        throw new Error('权限不足');
      }

      // 检查房间是否存在
      const existingRoom = await roomModel.findById(roomId);
      if (!existingRoom) {
        throw new Error('房间不存在');
      }

      // 权限检查
      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        // 平台级用户可以更新所有房间
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        // 公司级用户只能更新本公司的房间
        if (!user.company_id || existingRoom.company_id !== user.company_id) {
          throw new Error('权限不足');
        }
      } else {
        // 门店级用户只能更新关联门店的房间
        if (!user.company_id || existingRoom.company_id !== user.company_id) {
          throw new Error('权限不足');
        }
        
        const userStores = await storeModel.getAccessibleStores(
          user.user_id, 
          user.account_level, 
          user.company_id
        );
        
        const hasAccess = userStores.some(store => store.id === existingRoom.store_id);
        if (!hasAccess) {
          throw new Error('权限不足');
        }
      }

      // 验证房间类型（如果提供）
      if (updateData.room_type) {
        const validRoomTypes = ['剧本杀', '密室', '混合'];
        if (!validRoomTypes.includes(updateData.room_type)) {
          throw new Error('房间类型无效');
        }
      }

      // 验证房间状态（如果提供）
      if (updateData.status) {
        const validStatuses = ['正常', '维护', '关闭'];
        if (!validStatuses.includes(updateData.status)) {
          throw new Error('房间状态无效');
        }
      }

      // 验证容量（如果提供）
      if (updateData.capacity && (updateData.capacity < 1 || updateData.capacity > 50)) {
        throw new Error('房间容量应在1-50之间');
      }

      // 检查房间名称唯一性（如果更新了名称）
      if (updateData.name && updateData.name !== existingRoom.name) {
        const isNameUnique = await roomModel.checkNameUnique(
          existingRoom.store_id, 
          updateData.name, 
          roomId
        );
        if (!isNameUnique) {
          throw new Error('房间名称已存在');
        }
      }

      // 移除不允许更新的字段
      const { store_id, id, created_at, company_id, ...allowedUpdateData } = updateData;

      const updatedRoom = await roomModel.update(roomId, allowedUpdateData);
      return updatedRoom;
    } catch (error) {
      console.error('更新房间失败:', error);
      throw error;
    }
  }

  // 删除房间
  async delete(roomId, user) {
    try {
      // 权限验证
      if (!user) {
        throw new Error('权限不足');
      }

      // 检查房间是否存在
      const existingRoom = await roomModel.findById(roomId);
      if (!existingRoom) {
        throw new Error('房间不存在');
      }

      // 权限检查
      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        // 平台级用户可以删除所有房间
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        // 公司级用户只能删除本公司的房间
        if (!user.company_id || existingRoom.company_id !== user.company_id) {
          throw new Error('权限不足');
        }
      } else {
        // 门店级用户只能删除关联门店的房间
        if (!user.company_id || existingRoom.company_id !== user.company_id) {
          throw new Error('权限不足');
        }
        
        const userStores = await storeModel.getAccessibleStores(
          user.user_id, 
          user.account_level, 
          user.company_id
        );
        
        const hasAccess = userStores.some(store => store.id === existingRoom.store_id);
        if (!hasAccess) {
          throw new Error('权限不足');
        }
      }

      // 获取房间图片并删除物理文件
      const images = await roomModel.getRoomImages(roomId);
      for (const image of images) {
        deleteFile(image.image_name, 'room');
      }

      await roomModel.delete(roomId);
      return { success: true };
    } catch (error) {
      console.error('删除房间失败:', error);
      throw error;
    }
  }

  // 获取可选择的门店列表
  async getAvailableStores(user) {
    try {
      if (!user) {
        throw new Error('权限不足');
      }

      let stores = [];

      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        // 平台级用户可以看到所有门店
        stores = await storeModel.findAllWithCompanyInfo();
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        // 公司级用户只能看到本公司的门店
        if (!user.company_id) {
          throw new Error('权限不足');
        }
        stores = await storeModel.findByCompanyId(user.company_id);
      } else {
        // 门店级用户只能看到关联的门店
        if (!user.company_id) {
          throw new Error('权限不足');
        }
        stores = await storeModel.getAccessibleStores(
          user.user_id, 
          user.account_level, 
          user.company_id
        );
      }

      return stores;
    } catch (error) {
      console.error('获取可选门店列表失败:', error);
      throw error;
    }
  }

  // 上传房间图片
  async uploadImages(roomId, imageFiles, user) {
    try {
      // 权限验证
      if (!user) {
        throw new Error('权限不足');
      }

      // 检查房间是否存在并验证权限
      const room = await this.getById(roomId, user);
      if (!room) {
        throw new Error('房间不存在或权限不足');
      }

      // 检查图片数量限制
      const existingImages = await roomModel.getRoomImages(roomId);
      if (existingImages.length + imageFiles.length > 15) {
        throw new Error('房间图片最多15张');
      }

      const uploadedImages = [];
      
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const imageData = {
          image_url: file.url,
          image_name: file.filename, // 使用实际的文件名
          sort_order: existingImages.length + i,
          is_primary: existingImages.length === 0 && i === 0 // 第一张图片设为主图
        };
        
        const uploadedImage = await roomModel.addRoomImage(roomId, imageData);
        // 添加完整URL
        uploadedImage.full_url = getFileUrl(uploadedImage.image_name, 'room');
        uploadedImages.push(uploadedImage);
      }

      return uploadedImages;
    } catch (error) {
      console.error('上传房间图片失败:', error);
      throw error;
    }
  }

  // 删除房间图片
  async deleteImage(roomId, imageId, user) {
    try {
      // 权限验证
      if (!user) {
        throw new Error('权限不足');
      }

      // 检查房间是否存在并验证权限
      const room = await this.getById(roomId, user);
      if (!room) {
        throw new Error('房间不存在或权限不足');
      }

      // 获取图片信息
      const images = await roomModel.getRoomImages(roomId);
      const imageToDelete = images.find(img => img.id === parseInt(imageId));
      
      if (!imageToDelete) {
        throw new Error('图片不存在');
      }

      // 删除数据库记录
      const deletedImage = await roomModel.deleteRoomImage(imageId);
      
      // 删除物理文件
      if (deletedImage && deletedImage.image_name) {
        deleteFile(deletedImage.image_name, 'room');
      }

      return deletedImage;
    } catch (error) {
      console.error('删除房间图片失败:', error);
      throw error;
    }
  }

  // 更新图片排序
  async updateImageOrder(roomId, imageOrders, user) {
    try {
      // 权限验证
      if (!user) {
        throw new Error('权限不足');
      }

      // 检查房间是否存在并验证权限
      const room = await this.getById(roomId, user);
      if (!room) {
        throw new Error('房间不存在或权限不足');
      }

      await roomModel.updateImageOrder(roomId, imageOrders);
      return { success: true };
    } catch (error) {
      console.error('更新图片排序失败:', error);
      throw error;
    }
  }

  // 批量更新房间状态
  async batchUpdateStatus(roomIds, status, user) {
    try {
      // 权限验证
      if (!user) {
        throw new Error('权限不足');
      }

      // 验证状态
      const validStatuses = ['正常', '维护', '关闭'];
      if (!validStatuses.includes(status)) {
        throw new Error('房间状态无效');
      }

      let companyId = null;
      
      // 根据用户层级设置权限限制
      if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        companyId = user.company_id;
      } else if (user.account_level === ACCOUNT_LEVELS.STORE) {
        // 门店级用户需要额外验证每个房间的权限
        for (const roomId of roomIds) {
          const room = await roomModel.findById(roomId);
          if (!room) continue;
          
          const userStores = await storeModel.getAccessibleStores(
            user.user_id, 
            user.account_level, 
            user.company_id
          );
          
          const hasAccess = userStores.some(store => store.id === room.store_id);
          if (!hasAccess) {
            throw new Error('权限不足');
          }
        }
        companyId = user.company_id;
      }

      const result = await roomModel.batchUpdateStatus(roomIds, status, companyId);
      return result;
    } catch (error) {
      console.error('批量更新房间状态失败:', error);
      throw error;
    }
  }

  // 批量创建房间
  async batchCreate(roomsData, user) {
    try {
      // 权限验证
      if (!user) {
        throw new Error('权限不足');
      }

      if (!Array.isArray(roomsData) || roomsData.length === 0) {
        throw new Error('请提供要创建的房间数据');
      }

      const results = [];
      const errors = [];

      // 逐个创建房间
      for (let i = 0; i < roomsData.length; i++) {
        const roomData = roomsData[i];
        try {
          // 验证必填字段
          const requiredFields = ['store_id', 'name', 'room_type', 'capacity'];
          for (const field of requiredFields) {
            if (!roomData[field]) {
              throw new Error(`第${i + 1}行：${field} 是必填字段`);
            }
          }

          // 验证房间类型
          const validRoomTypes = ['剧本杀', '密室', '混合'];
          if (!validRoomTypes.includes(roomData.room_type)) {
            throw new Error(`第${i + 1}行：房间类型无效`);
          }

          // 验证容量
          if (roomData.capacity < 1 || roomData.capacity > 50) {
            throw new Error(`第${i + 1}行：房间容量应在1-50之间`);
          }

          // 权限检查 - 验证门店访问权限
          const store = await storeModel.findById(roomData.store_id);
          if (!store) {
            throw new Error(`第${i + 1}行：门店不存在`);
          }

          if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
            // 平台级用户可以为任何门店创建房间
          } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
            // 公司级用户只能为本公司的门店创建房间
            if (!user.company_id || store.company_id !== user.company_id) {
              throw new Error(`第${i + 1}行：权限不足`);
            }
          } else {
            // 门店级用户只能为关联的门店创建房间
            if (!user.company_id || store.company_id !== user.company_id) {
              throw new Error(`第${i + 1}行：权限不足`);
            }
            
            const userStores = await storeModel.getAccessibleStores(
              user.user_id, 
              user.account_level, 
              user.company_id
            );
            
            const hasAccess = userStores.some(userStore => userStore.id === roomData.store_id);
            if (!hasAccess) {
              throw new Error(`第${i + 1}行：权限不足`);
            }
          }

          // 检查房间名称唯一性
          const isNameUnique = await roomModel.checkNameUnique(roomData.store_id, roomData.name);
          if (!isNameUnique) {
            throw new Error(`第${i + 1}行：房间名称已存在`);
          }

          // 创建房间
          const room = await roomModel.create(roomData);
          results.push(room);
        } catch (error) {
          errors.push({
            index: i + 1,
            data: roomData,
            error: error.message
          });
        }
      }

      // 如果有错误，抛出详细错误信息
      if (errors.length > 0) {
        const errorMessages = errors.map(err => err.error).join('; ');
        throw new Error(`批量创建失败：${errorMessages}`);
      }

      return {
        success: true,
        created_count: results.length,
        rooms: results
      };
    } catch (error) {
      console.error('批量创建房间失败:', error);
      throw error;
    }
  }

  // 获取房间统计信息
  async getStats(user, storeId = null) {
    try {
      // 权限验证
      if (!user) {
        throw new Error('权限不足');
      }

      let stats;

      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        // 平台级用户可以查看所有统计
        stats = await roomModel.getRoomStats(storeId);
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        // 公司级用户只能查看本公司的统计
        if (!user.company_id) {
          throw new Error('权限不足');
        }
        stats = await roomModel.getRoomStats(storeId, user.company_id);
      } else {
        // 门店级用户只能查看关联门店的统计
        if (!user.company_id) {
          throw new Error('权限不足');
        }
        
        if (storeId) {
          // 验证门店访问权限
          const userStores = await storeModel.getAccessibleStores(
            user.user_id, 
            user.account_level, 
            user.company_id
          );
          
          const hasAccess = userStores.some(store => store.id === storeId);
          if (!hasAccess) {
            throw new Error('权限不足');
          }
          
          stats = await roomModel.getRoomStats(storeId);
        } else {
          stats = await roomModel.getRoomStats(null, user.company_id);
        }
      }

      return stats;
    } catch (error) {
      console.error('获取房间统计失败:', error);
      throw error;
    }
  }
}

module.exports = new RoomService(); 