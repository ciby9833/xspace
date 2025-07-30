const express = require('express');
const router = express.Router();

// 导入各个路由模块
const authRoutes = require('./auth');
const companyRoutes = require('./company');
const storeRoutes = require('./storeRoutes');
const userRoutes = require('./user');
const scriptRoutes = require('./script');
const escapeRoomRoutes = require('./escapeRoom');
const roomRoutes = require('./room');
const orderRoutes = require('./order');
const permissionRoutes = require('./permission');
const gameHostRoutes = require('./gameHost');
// 新增多人支付系统路由
const orderPlayerRoutes = require('./orderPlayerRoutes');
const orderPaymentRoutes = require('./orderPaymentRoutes');
const rolePricingTemplateRoutes = require('./rolePricingTemplateRoutes');
const pricingCalendarRoutes = require('./pricingCalendarRoutes');

// 注册路由
router.use('/auth', authRoutes);
router.use('/company', companyRoutes);
router.use('/stores', storeRoutes);
router.use('/user', userRoutes);
router.use('/script', scriptRoutes);
router.use('/escape-room', escapeRoomRoutes);
router.use('/room', roomRoutes);
router.use('/order', orderRoutes);
router.use('/permissions', permissionRoutes);
router.use('/game-host', gameHostRoutes);
// 多人支付系统路由
router.use('/order-players', orderPlayerRoutes);
router.use('/order-payments', orderPaymentRoutes);
router.use('/role-pricing-templates', rolePricingTemplateRoutes);
router.use('/pricing-calendar', pricingCalendarRoutes);

// 健康检查路由（可以直接在这里定义简单路由）
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '剧本杀管理系统后端运行正常',
    timestamp: new Date().toISOString(),
    features: {
      role_hierarchy: '角色层级管理',
      permission_separation: '权限分离控制',
      company_isolation: '公司数据隔离',
      platform_admin: '平台管理员跨公司访问',
      company_admin: '公司管理员本公司管理',
      dynamic_permissions: '动态权限配置'
    }
  });
});

// API信息路由
router.get('/info', (req, res) => {
  res.json({
    name: '剧本杀管理系统API',
    version: '2.0.0',
    description: '基于角色层级和权限分离的企业级管理系统',
    architecture: {
      role_levels: {
        platform: '平台管理员 - 系统级权限，可管理所有公司',
        company: '公司管理员 - 公司级权限，可管理本公司所有数据',
        department: '部门管理员 - 部门级权限，可管理部分数据',
        user: '普通用户 - 基础权限，由权限配置决定'
      },
      permission_scope: {
        platform_admin: '不受权限体系限制，拥有所有权限',
        company_admin: '公司内默认全权限，受公司范围限制',
        other_users: '权限完全由管理员配置决定'
      },
      data_isolation: {
        company_based: '权限管理基于公司归属',
        cross_company: '仅平台管理员可跨公司操作',
        role_protection: '高级角色受保护，普通用户无法修改'
      }
    },
    endpoints: {
      auth: '/api/auth - 认证相关',
      user: '/api/user - 用户管理',
      permission: '/api/permission - 权限管理',
      company: '/api/company - 公司管理',
      stores: '/api/stores - 门店管理',
      script: '/api/script - 剧本管理',
      escape_room: '/api/escape-room - 密室管理',
      room: '/api/room - 房间管理',
      order: '/api/order - 订单管理',
      // 多人支付系统
      order_players: '/api/order-players - 订单参与玩家管理',
      order_payments: '/api/order-payments - 支付记录管理',
      role_pricing: '/api/role-pricing-templates - 角色定价模板管理',
      pricing_calendar: '/api/pricing-calendar - 定价日历管理'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 