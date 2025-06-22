const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticateToken, checkPermission } = require('../utils/auth');
const { validateCompany } = require('../validators/companyValidator');

// 获取公司列表
router.get('/', authenticateToken, companyController.getCompanyList);

// 创建公司
router.post('/', authenticateToken, checkPermission('company.create'), validateCompany, companyController.createCompany);

// 获取公司详情
router.get('/:id', authenticateToken, companyController.getCompanyDetail);

// 更新公司信息
router.put('/:id', authenticateToken, checkPermission('company.edit'), validateCompany, companyController.updateCompany);

// 🆕 删除公司
router.delete('/:id', authenticateToken, checkPermission('company.delete'), companyController.deleteCompany);

module.exports = router; 