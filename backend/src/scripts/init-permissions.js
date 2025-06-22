#!/usr/bin/env node
// 权限系统初始化脚本
require('dotenv').config();

const { migratePermissions } = require('../database/migrate-permissions');
const permissionService = require('../services/permissionService');
const companyModel = require('../models/companyModel');

const initializePermissions = async () => {
  console.log('🚀 开始初始化权限系统...');
  
  try {
    // 1. 执行权限系统迁移
    console.log('📝 执行数据库迁移...');
    await migratePermissions();
    
    // 2. 获取所有公司
    console.log('🏢 获取公司列表...');
    const companies = await companyModel.findAll();
    
    if (companies.length === 0) {
      console.log('⚠️  没有找到公司，跳过权限初始化');
      return;
    }
    
    // 3. 为每个公司初始化默认角色权限
    for (const company of companies) {
      console.log(`🔧 为公司 "${company.name}" 初始化权限...`);
      try {
        await permissionService.initializeCompanyRoles(company.id);
        console.log(`✅ 公司 "${company.name}" 权限初始化完成`);
      } catch (error) {
        console.error(`❌ 公司 "${company.name}" 权限初始化失败:`, error.message);
      }
    }
    
    console.log('🎉 权限系统初始化完成！');
    console.log('');
    console.log('📋 默认角色权限说明：');
    console.log('  🔴 管理员 (admin): 拥有所有权限');
    console.log('  🟡 SPV (supervisor): 拥有大部分管理权限');
    console.log('  🔵 店长 (manager): 门店相关管理权限');
    console.log('  🟢 客服 (service): 订单和客户服务权限'); 
    console.log('  🟠 主持人 (host): 查看权限');
    console.log('');
    console.log('💡 可以通过前端权限管理页面进一步配置角色权限');
    
  } catch (error) {
    console.error('💥 权限系统初始化失败:', error);
    throw error;
  }
};

// 如果直接运行此文件，执行初始化
if (require.main === module) {
  (async () => {
    try {
      await initializePermissions();
      process.exit(0);
    } catch (error) {
      console.error('💥 初始化失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { initializePermissions }; 