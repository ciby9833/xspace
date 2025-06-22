const express = require('express');
const { body, param } = require('express-validator');
const storeController = require('../controllers/storeController');
const { authenticateToken } = require('../utils/auth');

const router = express.Router();

// 验证规则
const createStoreValidation = [
  body('company_id')
    .optional()
    .isUUID()
    .withMessage('公司ID格式不正确'),
  body('name')
    .notEmpty()
    .withMessage('门店名称不能为空')
    .isLength({ min: 1, max: 255 })
    .withMessage('门店名称长度必须在1-255字符之间'),
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('地址长度不能超过500字符'),
  body('business_hours')
    .optional()
    .isObject()
    .withMessage('营业时间必须是对象格式'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('时区必须是字符串格式')
];

const updateStoreValidation = [
  param('storeId')
    .isUUID()
    .withMessage('门店ID格式不正确'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('门店名称长度必须在1-255字符之间'),
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('地址长度不能超过500字符'),
  body('business_hours')
    .optional()
    .isObject()
    .withMessage('营业时间必须是对象格式'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('时区必须是字符串格式'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('状态必须是布尔值')
];

const storeIdValidation = [
  param('storeId')
    .isUUID()
    .withMessage('门店ID格式不正确')
];

// 路由定义

/**
 * @route GET /api/stores
 * @desc 获取门店列表
 * @access Private
 * @query company_id - 可选，指定公司ID筛选门店
 */
router.get('/', authenticateToken, storeController.getStoreList);

/**
 * @route GET /api/stores/companies
 * @desc 获取可选择的公司列表（用于创建门店）
 * @access Private
 */
router.get('/companies', authenticateToken, storeController.getAvailableCompanies);

/**
 * @route GET /api/stores/:storeId
 * @desc 获取门店详情
 * @access Private
 */
router.get('/:storeId', authenticateToken, storeIdValidation, storeController.getStoreDetail);

/**
 * @route GET /api/stores/:storeId/users
 * @desc 获取门店用户列表
 * @access Private
 */
router.get('/:storeId/users', authenticateToken, storeIdValidation, storeController.getStoreUsers);

/**
 * @route POST /api/stores
 * @desc 创建门店
 * @access Private
 * @body company_id, name, address?, business_hours?, timezone?
 */
router.post('/', authenticateToken, createStoreValidation, storeController.createStore);

/**
 * @route PUT /api/stores/:storeId
 * @desc 更新门店信息
 * @access Private
 * @body name?, address?, business_hours?, timezone?, is_active?
 */
router.put('/:storeId', authenticateToken, updateStoreValidation, storeController.updateStore);

/**
 * @route DELETE /api/stores/:storeId
 * @desc 删除门店
 * @access Private
 */
router.delete('/:storeId', authenticateToken, storeIdValidation, storeController.deleteStore);

module.exports = router; 