/**
 * 基础服务类
 * 提供所有服务共用的基础功能
 */
class BaseService {
  constructor(model, resourceName) {
    this.model = model;
    this.resourceName = resourceName;
  }

  /**
   * 格式化时间字段
   * @param {Object} data - 包含时间字段的数据对象
   * @returns {Object} 格式化后的数据对象
   */
  formatTimeFields(data) {
    if (!data) return data;

    const timeFields = ['created_at', 'updated_at', 'last_login_at'];
    const formatted = { ...data };

    timeFields.forEach(field => {
      if (formatted[field]) {
        formatted[field] = new Date(formatted[field]).toISOString();
      }
    });

    return formatted;
  }

  /**
   * 格式化时间字段（数组）
   * @param {Array} dataArray - 数据对象数组
   * @returns {Array} 格式化后的数据对象数组
   */
  formatTimeFieldsArray(dataArray) {
    if (!Array.isArray(dataArray)) return dataArray;
    return dataArray.map(item => this.formatTimeFields(item));
  }

  /**
   * 创建资源
   * @param {Object} data - 要创建的数据
   * @returns {Promise<Object>} 创建的资源
   */
  async create(data) {
    const result = await this.model.create(data);
    return this.formatTimeFields(result);
  }

  /**
   * 更新资源
   * @param {string|number} id - 资源ID
   * @param {Object} data - 要更新的数据
   * @returns {Promise<Object>} 更新后的资源
   */
  async update(id, data) {
    const result = await this.model.update(id, data);
    return this.formatTimeFields(result);
  }

  /**
   * 删除资源
   * @param {string|number} id - 资源ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async delete(id) {
    return await this.model.delete(id);
  }

  /**
   * 获取单个资源
   * @param {string|number} id - 资源ID
   * @returns {Promise<Object>} 资源对象
   */
  async findById(id) {
    const result = await this.model.findById(id);
    return this.formatTimeFields(result);
  }

  /**
   * 获取所有资源
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 资源对象数组
   */
  async findAll(options = {}) {
    const results = await this.model.findAll(options);
    return this.formatTimeFieldsArray(results);
  }

  /**
   * 分页查询
   * @param {Object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.pageSize - 每页数量
   * @returns {Promise<Object>} 分页结果
   */
  async paginate(options = {}) {
    const { page = 1, pageSize = 10, ...queryOptions } = options;
    const results = await this.model.paginate(page, pageSize, queryOptions);
    
    return {
      ...results,
      data: this.formatTimeFieldsArray(results.data)
    };
  }

  /**
   * 检查资源是否存在
   * @param {string|number} id - 资源ID
   * @returns {Promise<boolean>} 是否存在
   */
  async exists(id) {
    return await this.model.exists(id);
  }

  /**
   * 获取资源数量
   * @param {Object} options - 查询选项
   * @returns {Promise<number>} 资源数量
   */
  async count(options = {}) {
    return await this.model.count(options);
  }

  /**
   * 批量创建资源
   * @param {Array} dataArray - 要创建的数据数组
   * @returns {Promise<Array>} 创建的资源数组
   */
  async bulkCreate(dataArray) {
    const results = await this.model.bulkCreate(dataArray);
    return this.formatTimeFieldsArray(results);
  }

  /**
   * 批量更新资源
   * @param {Array} dataArray - 要更新的数据数组
   * @returns {Promise<Array>} 更新后的资源数组
   */
  async bulkUpdate(dataArray) {
    const results = await this.model.bulkUpdate(dataArray);
    return this.formatTimeFieldsArray(results);
  }

  /**
   * 批量删除资源
   * @param {Array} ids - 要删除的资源ID数组
   * @returns {Promise<boolean>} 是否全部删除成功
   */
  async bulkDelete(ids) {
    return await this.model.bulkDelete(ids);
  }
}

module.exports = BaseService; 