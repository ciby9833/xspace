// 订单表增强字段迁移 - node src/database/migrate-orders-enhanced.js
require('dotenv').config();

const pool = require('./connection');

const migrateOrdersEnhanced = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始订单表增强字段迁移...');
    
    // 1. 添加新的财务字段
    console.log('📝 添加财务字段...');
    
    const financialFields = [
      // 价格相关字段
      'ADD COLUMN IF NOT EXISTS original_price DECIMAL(15,2) DEFAULT 0', // 原价
      'ADD COLUMN IF NOT EXISTS discount_price DECIMAL(15,2) DEFAULT 0', // 优惠价
      'ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15,2) DEFAULT 0', // 优惠金额
      
      // 支付相关字段
      'ADD COLUMN IF NOT EXISTS prepaid_amount DECIMAL(15,2) DEFAULT 0', // 预付金额
      'ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(15,2) DEFAULT 0', // 剩余应付金额
      
      // 费用相关字段
      'ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0', // 税费
      'ADD COLUMN IF NOT EXISTS service_fee DECIMAL(15,2) DEFAULT 0', // 服务费
      
      // 折扣相关字段
      'ADD COLUMN IF NOT EXISTS manual_discount DECIMAL(15,2) DEFAULT 0', // 手动折扣金额
      'ADD COLUMN IF NOT EXISTS activity_discount DECIMAL(15,2) DEFAULT 0', // 活动减免金额
      'ADD COLUMN IF NOT EXISTS member_discount DECIMAL(15,2) DEFAULT 0', // 会员折扣金额
      'ADD COLUMN IF NOT EXISTS package_discount DECIMAL(15,2) DEFAULT 0', // 套餐优惠
      
      // 退款字段
      'ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(15,2) DEFAULT 0', // 退款金额
      'ADD COLUMN IF NOT EXISTS refund_reason TEXT', // 退款原因
      'ADD COLUMN IF NOT EXISTS refund_date DATE', // 退款日期
      
      // 实际开始和结束时间（用于Game Host功能）
      'ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ', // 实际开始时间
      'ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ' // 实际结束时间
    ];

    for (const field of financialFields) {
      try {
        await client.query(`ALTER TABLE orders ${field}`);
        console.log(`✅ 添加字段: ${field}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  字段已存在: ${field}`);
        } else {
          console.error(`❌ 添加字段失败: ${field}`, error.message);
        }
      }
    }

    // 2. 扩展订单状态选项
    console.log('📝 扩展订单状态选项...');
    
    // 先删除现有的状态约束
    try {
      await client.query(`
        ALTER TABLE orders 
        DROP CONSTRAINT IF EXISTS orders_status_check
      `);
    } catch (error) {
      console.log('⚠️  删除状态约束失败或不存在:', error.message);
    }
    
    // 添加新的状态约束，包含更多状态选项
    await client.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_status_check 
      CHECK (status IN (
        'pending',        -- 待确认
        'confirmed',      -- 已确认
        'in_progress',    -- 进行中
        'completed',      -- 已完成
        'cancelled',      -- 已取消
        'refunded',       -- 已退款
        'partially_refunded', -- 部分退款
        'no_show',        -- 未到场
        'rescheduled'     -- 已改期
      ))
    `);

    // 3. 扩展预订类型选项
    console.log('📝 扩展预订类型选项...');
    
    // 先删除现有的预订类型约束
    try {
      await client.query(`
        ALTER TABLE orders 
        DROP CONSTRAINT IF EXISTS orders_booking_type_check
      `);
    } catch (error) {
      console.log('⚠️  删除预订类型约束失败或不存在:', error.message);
    }
    
    // 添加新的预订类型约束，包含"始发拼团"选项
    await client.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_booking_type_check 
      CHECK (booking_type IN (
        'Booking',
        'Walk In',
        'Traveloka',
        'Tiket.com',
        'Gamehost/Staff Booking',
        'MyValue（Gramedia）',
        'Promo',
        'Group Booking',      -- 始发拼团
        'Online Booking',     -- 线上预订
        'Phone Booking'       -- 电话预订
      ))
    `);

    // 4. 添加新的索引
    console.log('📝 添加新索引...');
    
    const newIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_orders_original_price ON orders(original_price)',
      'CREATE INDEX IF NOT EXISTS idx_orders_discount_amount ON orders(discount_amount)',
      'CREATE INDEX IF NOT EXISTS idx_orders_prepaid_amount ON orders(prepaid_amount)',
      'CREATE INDEX IF NOT EXISTS idx_orders_remaining_amount ON orders(remaining_amount)',
      'CREATE INDEX IF NOT EXISTS idx_orders_refund_amount ON orders(refund_amount)',
      'CREATE INDEX IF NOT EXISTS idx_orders_refund_date ON orders(refund_date)',
      'CREATE INDEX IF NOT EXISTS idx_orders_actual_start_time ON orders(actual_start_time)',
      'CREATE INDEX IF NOT EXISTS idx_orders_actual_end_time ON orders(actual_end_time)'
    ];

    for (const indexSQL of newIndexes) {
      try {
        await client.query(indexSQL);
        console.log(`✅ 创建索引: ${indexSQL}`);
      } catch (error) {
        console.log(`⚠️  索引创建失败:`, error.message);
      }
    }

    // 5. 更新表注释
    console.log('📝 更新表注释...');
    
    await client.query(`
      COMMENT ON COLUMN orders.original_price IS '原价';
      COMMENT ON COLUMN orders.discount_price IS '优惠价';
      COMMENT ON COLUMN orders.discount_amount IS '优惠金额';
      COMMENT ON COLUMN orders.prepaid_amount IS '预付金额';
      COMMENT ON COLUMN orders.remaining_amount IS '剩余应付金额';
      COMMENT ON COLUMN orders.tax_amount IS '税费';
      COMMENT ON COLUMN orders.service_fee IS '服务费';
      COMMENT ON COLUMN orders.manual_discount IS '手动折扣金额';
      COMMENT ON COLUMN orders.activity_discount IS '活动减免金额';
      COMMENT ON COLUMN orders.member_discount IS '会员折扣金额';
      COMMENT ON COLUMN orders.package_discount IS '套餐优惠';
      COMMENT ON COLUMN orders.refund_amount IS '退款金额';
      COMMENT ON COLUMN orders.refund_reason IS '退款原因';
      COMMENT ON COLUMN orders.refund_date IS '退款日期';
      COMMENT ON COLUMN orders.actual_start_time IS '实际开始时间';
      COMMENT ON COLUMN orders.actual_end_time IS '实际结束时间';
    `);

    // 6. 创建计算总金额的触发器函数
    console.log('📝 创建金额计算触发器函数...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_order_amounts()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 计算优惠金额 = 原价 - 优惠价
        IF NEW.original_price IS NOT NULL AND NEW.discount_price IS NOT NULL THEN
          NEW.discount_amount = NEW.original_price - NEW.discount_price;
        END IF;
        
        -- 计算剩余应付金额 = 总金额 - 预付金额
        IF NEW.total_amount IS NOT NULL AND NEW.prepaid_amount IS NOT NULL THEN
          NEW.remaining_amount = NEW.total_amount - NEW.prepaid_amount;
        END IF;
        
        -- 更新时间戳
        NEW.updated_at = NOW();
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 7. 创建触发器
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_calculate_order_amounts ON orders;
      CREATE TRIGGER trigger_calculate_order_amounts
        BEFORE INSERT OR UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION calculate_order_amounts();
    `);

    // 8. 更新现有订单的单价字段（如果为空）
    console.log('📝 更新现有订单数据...');
    
    await client.query(`
      UPDATE orders 
      SET original_price = total_amount,
          unit_price = total_amount
      WHERE original_price = 0 OR original_price IS NULL
    `);

    // 9. 显示统计信息
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN original_price > 0 THEN 1 END) as orders_with_price,
        COUNT(CASE WHEN discount_amount > 0 THEN 1 END) as orders_with_discount,
        COUNT(CASE WHEN refund_amount > 0 THEN 1 END) as orders_with_refund
      FROM orders
    `);

    console.log('📊 迁移结果统计:');
    console.log(`   订单总数: ${stats.rows[0].total_orders}`);
    console.log(`   有价格的订单: ${stats.rows[0].orders_with_price}`);
    console.log(`   有优惠的订单: ${stats.rows[0].orders_with_discount}`);
    console.log(`   有退款的订单: ${stats.rows[0].orders_with_refund}`);

    console.log('✅ 订单表增强字段迁移完成');
    
  } catch (error) {
    console.error('❌ 订单表增强字段迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  (async () => {
    try {
      await migrateOrdersEnhanced();
      console.log('🎉 订单表增强字段迁移成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 订单表增强字段迁移失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { migrateOrdersEnhanced }; 