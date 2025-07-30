//定价日历控制器
const PricingCalendarModel = require('../models/pricingCalendarModel');
const { validationResult } = require('express-validator');

class PricingCalendarController {
  /**
   * 创建定价日历
   */
  async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { company_id } = req.user;
      const calendarData = {
        ...req.body,
        company_id
      };

      const result = await PricingCalendarModel.create(calendarData);

      res.status(201).json({
        success: true,
        message: '定价日历创建成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建定价日历失败:', error);
      res.status(500).json({
        success: false,
        error: '创建定价日历失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取定价日历列表（带分页）
   */
  async getList(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { company_id } = req.user;
      const params = {
        ...req.query,
        page: parseInt(req.query.page) || 1,
        page_size: parseInt(req.query.page_size) || 10
      };

      const result = await PricingCalendarModel.findByCompanyIdWithPagination(company_id, params);

      res.json({
        success: true,
        data: {
          data: result.data,
          total: result.total,
          current: result.current,
          pageSize: result.pageSize
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取定价日历列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取定价日历列表失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取定价日历详情
   */
  async getById(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { id } = req.params;
      const result = await PricingCalendarModel.findById(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: '定价日历不存在',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取定价日历详情失败:', error);
      res.status(500).json({
        success: false,
        error: '获取定价日历详情失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 更新定价日历
   */
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { id } = req.params;
      const result = await PricingCalendarModel.update(id, req.body);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: '定价日历不存在',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: '定价日历更新成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新定价日历失败:', error);
      res.status(500).json({
        success: false,
        error: '更新定价日历失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 删除定价日历
   */
  async delete(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { id } = req.params;
      const result = await PricingCalendarModel.delete(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: '定价日历不存在',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: '定价日历删除成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除定价日历失败:', error);
      res.status(500).json({
        success: false,
        error: '删除定价日历失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 批量更新状态
   */
  async batchUpdateStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { calendar_ids, is_active } = req.body;
      const result = await PricingCalendarModel.batchUpdateStatus(calendar_ids, is_active);

      res.json({
        success: true,
        message: '批量更新状态成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('批量更新状态失败:', error);
      res.status(500).json({
        success: false,
        error: '批量更新状态失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取定价日历统计
   */
  async getStats(req, res) {
    try {
      const { company_id } = req.user;
      const result = await PricingCalendarModel.getStats(company_id);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取定价日历统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取定价日历统计失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 根据日期获取定价规则
   */
  async getByDate(req, res) {
    try {
      const { company_id } = req.user;
      const { date } = req.query;
      const { store_id } = req.query;
      
      const result = await PricingCalendarModel.findByDate(company_id, date, store_id);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('根据日期获取定价规则失败:', error);
      res.status(500).json({
        success: false,
        error: '根据日期获取定价规则失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 根据日期范围获取定价规则
   */
  async getByDateRange(req, res) {
    try {
      const { company_id } = req.user;
      const { start_date, end_date, store_id } = req.query;
      
      const result = await PricingCalendarModel.findByDateRange(company_id, start_date, end_date, store_id);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('根据日期范围获取定价规则失败:', error);
      res.status(500).json({
        success: false,
        error: '根据日期范围获取定价规则失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new PricingCalendarController(); 