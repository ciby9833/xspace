// 多人支付系统权限添加 - node src/database/add-multi-payment-permissions.js
require('dotenv').config();

const pool = require('./connection');

async function addMultiPaymentPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始添加多人支付系统权限...');
    
    // 1. 添加权限模块
    const modules = [
      { 
        name: 'order', 
        display_name: '订单管理', 
        description: '订单相关功能管理', 
        sort_order: 9 
      },
      { 
        name: 'order_player', 
        display_name: '订单参与玩家', 
        description: '订单参与玩家相关功能管理', 
        sort_order: 10 
      },
      { 
        name: 'order_payment', 
        display_name: '支付记录', 
        description: '支付记录相关功能管理', 
        sort_order: 11 
      },
      { 
        name: 'role_pricing', 
        display_name: '角色定价模板', 
        description: '角色定价模板相关功能管理', 
        sort_order: 12 
      },
      { 
        name: 'pricing_calendar', 
        display_name: '定价日历', 
        description: '定价日历相关功能管理', 
        sort_order: 13 
      }
    ];
    
    const moduleIds = {};
    
    for (const module of modules) {
      const moduleResult = await client.query(`
        INSERT INTO permission_modules (name, display_name, description, sort_order)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          sort_order = EXCLUDED.sort_order
        RETURNING id
      `, [module.name, module.display_name, module.description, module.sort_order]);
      
      moduleIds[module.name] = moduleResult.rows[0].id;
      console.log(`✅ ${module.display_name}模块已添加，ID: ${moduleResult.rows[0].id}`);
    }
    
    // 2. 添加权限项（与permissions.js配置保持一致）
    const permissions = [
      // 订单支付汇总权限
      { module: 'order', name: 'payment_summary', display_name: '查看订单支付汇总', key: 'order.payment.summary' },
      
      // 订单参与玩家权限
      { module: 'order_player', name: 'view', display_name: '查看订单参与玩家', key: 'order.player.view' },
      { module: 'order_player', name: 'create', display_name: '创建订单参与玩家', key: 'order.player.create' },
      { module: 'order_player', name: 'edit', display_name: '编辑订单参与玩家', key: 'order.player.edit' },
      { module: 'order_player', name: 'delete', display_name: '删除订单参与玩家', key: 'order.player.delete' },
      { module: 'order_player', name: 'manage', display_name: '订单参与玩家管理', key: 'order.player.manage' },
      
      // 支付记录权限
      { module: 'order_payment', name: 'view', display_name: '查看支付记录', key: 'order.payment.view' },
      { module: 'order_payment', name: 'create', display_name: '创建支付记录', key: 'order.payment.create' },
      { module: 'order_payment', name: 'edit', display_name: '编辑支付记录', key: 'order.payment.edit' },
      { module: 'order_payment', name: 'delete', display_name: '删除支付记录', key: 'order.payment.delete' },
      { module: 'order_payment', name: 'confirm', display_name: '确认支付', key: 'order.payment.confirm' },
      { module: 'order_payment', name: 'manage', display_name: '支付记录管理', key: 'order.payment.manage' },
      
      // 角色定价模板权限
      { module: 'role_pricing', name: 'view', display_name: '查看角色定价模板', key: 'role.pricing.view' },
      { module: 'role_pricing', name: 'create', display_name: '创建角色定价模板', key: 'role.pricing.create' },
      { module: 'role_pricing', name: 'edit', display_name: '编辑角色定价模板', key: 'role.pricing.edit' },
      { module: 'role_pricing', name: 'delete', display_name: '删除角色定价模板', key: 'role.pricing.delete' },
      { module: 'role_pricing', name: 'manage', display_name: '角色定价模板管理', key: 'role.pricing.manage' },
      
      // 定价日历权限
      { module: 'pricing_calendar', name: 'view', display_name: '查看定价日历', key: 'pricing.calendar.view' },
      { module: 'pricing_calendar', name: 'create', display_name: '创建定价日历', key: 'pricing.calendar.create' },
      { module: 'pricing_calendar', name: 'edit', display_name: '编辑定价日历', key: 'pricing.calendar.edit' },
      { module: 'pricing_calendar', name: 'delete', display_name: '删除定价日历', key: 'pricing.calendar.delete' },
      { module: 'pricing_calendar', name: 'manage', display_name: '定价日历管理', key: 'pricing.calendar.manage' }
    ];
    
    for (const perm of permissions) {
      await client.query(`
        INSERT INTO permissions (module_id, name, display_name, permission_key)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (permission_key) DO UPDATE SET
          display_name = EXCLUDED.display_name
      `, [moduleIds[perm.module], perm.name, perm.display_name, perm.key]);
      
      console.log('✅ 权限已添加:', perm.key, '-', perm.display_name);
    }
    
    // 3. 为超级管理员角色分配多人支付系统权限
    const superadminRoles = await client.query(`
      SELECT id FROM roles WHERE name = 'superadmin' OR role_level = 'platform'
    `);
    
    if (superadminRoles.rows.length > 0) {
      const multiPaymentPermissions = await client.query(`
        SELECT id FROM permissions WHERE permission_key LIKE ANY(ARRAY['order.payment.summary', 'order.player%', 'order.payment%', 'role.pricing%', 'pricing.calendar%'])
      `);
      
      for (const role of superadminRoles.rows) {
        for (const perm of multiPaymentPermissions.rows) {
          await client.query(`
            INSERT INTO role_permission_assignments (role_id, permission_id, granted)
            VALUES ($1, $2, true)
            ON CONFLICT (role_id, permission_id) DO UPDATE SET
              granted = EXCLUDED.granted
          `, [role.id, perm.id]);
        }
      }
      
      console.log('✅ 已为', superadminRoles.rows.length, '个超级管理员角色分配多人支付系统权限');
    }
    
    // 4. 为现有的公司管理员角色分配多人支付系统权限
    const companyRoles = await client.query(`
      SELECT DISTINCT r.id, r.name, r.display_name 
      FROM roles r 
      WHERE r.role_level = 'company' AND r.is_active = true
    `);
    
    if (companyRoles.rows.length > 0) {
      const multiPaymentPermissions = await client.query(`
        SELECT id FROM permissions WHERE permission_key LIKE ANY(ARRAY['order.payment.summary', 'order.player%', 'order.payment%', 'role.pricing%', 'pricing.calendar%'])
      `);
      
      for (const role of companyRoles.rows) {
        for (const perm of multiPaymentPermissions.rows) {
          await client.query(`
            INSERT INTO role_permission_assignments (role_id, permission_id, granted)
            VALUES ($1, $2, true)
            ON CONFLICT (role_id, permission_id) DO UPDATE SET
              granted = EXCLUDED.granted
          `, [role.id, perm.id]);
        }
      }
      
      console.log('✅ 已为', companyRoles.rows.length, '个公司级角色分配多人支付系统权限');
    }
    
    // 5. 为现有的管理员角色分配多人支付系统权限
    const adminRoles = await client.query(`
      SELECT DISTINCT r.id, r.name, r.display_name 
      FROM roles r 
      WHERE r.name IN ('admin', 'manager', 'supervisor') AND r.is_active = true
    `);
    
    if (adminRoles.rows.length > 0) {
      const multiPaymentPermissions = await client.query(`
        SELECT id FROM permissions WHERE permission_key LIKE ANY(ARRAY['order.payment.summary', 'order.player%', 'order.payment%', 'role.pricing%', 'pricing.calendar%'])
      `);
      
      for (const role of adminRoles.rows) {
        for (const perm of multiPaymentPermissions.rows) {
          await client.query(`
            INSERT INTO role_permission_assignments (role_id, permission_id, granted)
            VALUES ($1, $2, true)
            ON CONFLICT (role_id, permission_id) DO UPDATE SET
              granted = EXCLUDED.granted
          `, [role.id, perm.id]);
        }
      }
      
      console.log('✅ 已为', adminRoles.rows.length, '个管理员角色分配多人支付系统权限');
    }
    
    // 6. 验证权限添加结果
    const addedPermissions = await client.query(`
      SELECT p.permission_key, p.display_name, pm.display_name as module_name
      FROM permissions p
      JOIN permission_modules pm ON p.module_id = pm.id
      WHERE p.permission_key LIKE ANY(ARRAY['order.payment.summary', 'order.player%', 'order.payment%', 'role.pricing%', 'pricing.calendar%'])
      ORDER BY pm.sort_order, p.permission_key
    `);
    
    console.log('📋 已添加的多人支付系统权限:');
    addedPermissions.rows.forEach(perm => {
      console.log(`   ${perm.permission_key} - ${perm.display_name} (${perm.module_name})`);
    });
    
    // 7. 统计权限分配情况
    const assignmentStats = await client.query(`
      SELECT 
        COUNT(DISTINCT rpa.role_id) as roles_count,
        COUNT(rpa.id) as total_assignments
      FROM role_permission_assignments rpa
      JOIN permissions p ON rpa.permission_id = p.id
      WHERE p.permission_key LIKE ANY(ARRAY['order.payment.summary', 'order.player%', 'order.payment%', 'role.pricing%', 'pricing.calendar%'])
      AND rpa.granted = true
    `);
    
    console.log('📊 权限分配统计:');
    console.log(`   分配给角色数: ${assignmentStats.rows[0].roles_count}`);
    console.log(`   总分配次数: ${assignmentStats.rows[0].total_assignments}`);
    
    // 8. 显示模块统计
    const moduleStats = await client.query(`
      SELECT 
        pm.display_name as module_name,
        COUNT(p.id) as permission_count
      FROM permission_modules pm
      LEFT JOIN permissions p ON pm.id = p.module_id
      WHERE pm.name IN ('order', 'order_player', 'order_payment', 'role_pricing', 'pricing_calendar')
      GROUP BY pm.id, pm.display_name, pm.sort_order
      ORDER BY pm.sort_order
    `);
    
    console.log('📈 模块权限统计:');
    moduleStats.rows.forEach(stat => {
      console.log(`   ${stat.module_name}: ${stat.permission_count} 个权限`);
    });
    
    console.log('✅ 多人支付系统权限添加完成');
    
  } catch (error) {
    console.error('❌ 添加多人支付系统权限失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 如果直接运行此文件，执行权限添加
if (require.main === module) {
  (async () => {
    try {
      await addMultiPaymentPermissions();
      console.log('🎉 多人支付系统权限添加成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 多人支付系统权限添加失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { addMultiPaymentPermissions }; 