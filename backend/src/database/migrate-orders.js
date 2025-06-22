// 订单管理模块数据库迁移 - node src/database/migrate-orders.js
require('dotenv').config();

const pool = require('./connection');

const migrateOrdersModule = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始订单管理模块迁移...');
    
    // 确保UUID扩展存在
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // 1. 创建订单配置表 (order_configs)
    console.log('📝 创建订单配置表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_configs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID REFERENCES company(id) ON DELETE CASCADE,
        config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('game_host', 'npc', 'promo', 'pic', 'pic_payment', 'booking_type', 'payment_method')),
        config_key VARCHAR(100) NOT NULL,
        config_value VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, config_type, config_key)
      )
    `);

    // 2. 创建核心订单表 (orders)
    console.log('📝 创建核心订单表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        
        -- 基础关联信息
        company_id UUID REFERENCES company(id) ON DELETE CASCADE,
        store_id UUID REFERENCES store(id) ON DELETE CASCADE,
        room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
        
        -- 订单基础信息
        order_type VARCHAR(20) CHECK (order_type IN ('剧本杀', '密室')) NOT NULL,
        order_date DATE NOT NULL,
        weekday VARCHAR(10) NOT NULL,
        language VARCHAR(10) CHECK (language IN ('CN', 'EN', 'IND')) NOT NULL,
        
        -- 时间信息
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration INTEGER, -- 实际时长（分钟）
        
        -- 客户信息
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20), -- 🆕 允许为空
        player_count INTEGER NOT NULL CHECK (player_count > 0),
        internal_support BOOLEAN DEFAULT false, -- 是否内部人补位
        
        -- 剧本杀专用字段
        script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
        script_name VARCHAR(255), -- 冗余字段，防止剧本删除后丢失信息
        game_host_id UUID REFERENCES users(id) ON DELETE SET NULL,
        npc_id UUID REFERENCES users(id) ON DELETE SET NULL,
        
        -- 密室专用字段
        escape_room_id UUID REFERENCES escape_rooms(id) ON DELETE SET NULL,
        escape_room_name VARCHAR(255), -- 冗余字段
        is_group_booking BOOLEAN DEFAULT false, -- Gabung: YES/NO
        include_photos BOOLEAN DEFAULT false,
        include_cctv BOOLEAN DEFAULT false,
        
        -- 预订信息
        booking_type VARCHAR(50) CHECK (booking_type IN ('Booking', 'Walk In', 'Traveloka', 'Tiket.com', 'Gamehost/Staff Booking', 'MyValue（Gramedia）', 'Promo')) NOT NULL, -- 🆕 添加Promo
        
        -- 费用信息
        is_free BOOLEAN DEFAULT false, -- Free/Pay
        unit_price DECIMAL(15,2),
        total_amount DECIMAL(15,2) NOT NULL,
        payment_status VARCHAR(20) CHECK (payment_status IN ('FULL', 'Not Yet', 'DP', 'Free')) NOT NULL,
        payment_date DATE,
        payment_method VARCHAR(50) CHECK (payment_method IN ('Bank Transfer', 'QR BCA', 'DEBIT', 'CC')),
        
        -- 优惠信息
        promo_code VARCHAR(100),
        promo_quantity INTEGER DEFAULT 0,
        promo_discount DECIMAL(15,2) DEFAULT 0,
        
        -- 负责人信息
        pic_id UUID REFERENCES users(id) ON DELETE SET NULL, -- 负责人
        pic_payment_id UUID REFERENCES users(id) ON DELETE SET NULL, -- 收款负责人（保留兼容性）
        pic_payment VARCHAR(100), -- 🆕 PIC Payment文本字段（用于金额记录）
        
        -- 其他信息
        notes TEXT,
        
        -- 状态和时间戳
        status VARCHAR(20) CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // 3. 创建订单图片表 (order_images)
    console.log('📝 创建订单图片表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        image_type VARCHAR(20) CHECK (image_type IN ('proof', 'other')) NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        image_name VARCHAR(255),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 4. 创建索引
    console.log('📝 创建索引...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_orders_company_store ON orders(company_id, store_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_date_type ON orders(order_date, order_type)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone)',
      'CREATE INDEX IF NOT EXISTS idx_orders_booking_type ON orders(booking_type)',
      'CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_order_configs_company_type ON order_configs(company_id, config_type)',
      'CREATE INDEX IF NOT EXISTS idx_order_images_order_id ON order_images(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_order_images_type ON order_images(image_type)'
    ];

    for (const indexSQL of indexes) {
      try {
        await client.query(indexSQL);
      } catch (error) {
        console.log(`⚠️  索引创建失败:`, error.message);
      }
    }

    // 5. 创建触发器函数 - 仅更新时间戳
    console.log('📝 创建触发器函数...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_order_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 仅更新时间戳，不计算任何金额
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 6. 创建触发器
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_calculate_order_total ON orders;
      DROP TRIGGER IF EXISTS trigger_update_order_timestamp ON orders;
      CREATE TRIGGER trigger_update_order_timestamp
        BEFORE UPDATE ON orders
        FOR EACH ROW
        EXECUTE FUNCTION update_order_timestamp();
    `);

    // 7. 添加表注释
    console.log('📝 添加表注释...');
    await client.query(`
      COMMENT ON TABLE orders IS '统一订单表，支持剧本杀和密室订单';
      COMMENT ON COLUMN orders.order_type IS '订单类型：剧本杀、密室';
      COMMENT ON COLUMN orders.weekday IS '星期几：周一到周日';
      COMMENT ON COLUMN orders.language IS '语言：CN-中文、EN-英语、IND-印尼语';
      COMMENT ON COLUMN orders.internal_support IS '是否内部人补位';
      COMMENT ON COLUMN orders.is_group_booking IS '是否拼团预订（密室专用）';
      COMMENT ON COLUMN orders.include_photos IS '是否包含拍照服务（密室专用）';
      COMMENT ON COLUMN orders.include_cctv IS '是否包含监控服务（密室专用）';
      COMMENT ON COLUMN orders.is_free IS '是否免费订单';
      COMMENT ON COLUMN orders.promo_discount IS '优惠折扣金额';
      
      COMMENT ON TABLE order_configs IS '订单配置表，存储可编辑的选项';
      COMMENT ON COLUMN order_configs.config_type IS '配置类型：game_host、npc、promo、pic、pic_payment等';
      
      COMMENT ON TABLE order_images IS '订单图片表，存储支付凭证等图片';
      COMMENT ON COLUMN order_images.image_type IS '图片类型：proof-支付凭证、other-其他';
    `);

    // 8. 初始化基础配置数据
    console.log('📝 初始化基础配置数据...');
    
    // 获取所有公司，为每个公司初始化基础配置
    const companies = await client.query('SELECT id FROM company');
    
    const baseConfigs = [
      // 预订类型
      { type: 'booking_type', key: 'Booking', value: 'Booking' },
      { type: 'booking_type', key: 'Walk In', value: 'Walk In' },
      { type: 'booking_type', key: 'Traveloka', value: 'Traveloka' },
      { type: 'booking_type', key: 'Tiket.com', value: 'Tiket.com' },
      { type: 'booking_type', key: 'Gamehost/Staff Booking', value: 'Gamehost/Staff Booking' },
      { type: 'booking_type', key: 'MyValue（Gramedia）', value: 'MyValue（Gramedia）' },
      { type: 'booking_type', key: 'Promo', value: 'Promo' },
      
      // 支付方式
      { type: 'payment_method', key: 'Bank Transfer', value: 'Bank Transfer' },
      { type: 'payment_method', key: 'QR BCA', value: 'QR BCA' },
      { type: 'payment_method', key: 'DEBIT', value: 'DEBIT' },
      { type: 'payment_method', key: 'CC', value: 'CC' }
    ];

    for (const company of companies.rows) {
      for (const config of baseConfigs) {
        await client.query(`
          INSERT INTO order_configs (company_id, config_type, config_key, config_value)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (company_id, config_type, config_key) DO NOTHING
        `, [company.id, config.type, config.key, config.value]);
      }
    }

    // 9. 显示统计信息
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM order_configs) as total_configs,
        (SELECT COUNT(*) FROM order_images) as total_images
    `);

    console.log('📊 迁移结果统计:');
    console.log(`   订单总数: ${stats.rows[0].total_orders}`);
    console.log(`   配置项总数: ${stats.rows[0].total_configs}`);
    console.log(`   订单图片总数: ${stats.rows[0].total_images}`);

    console.log('✅ 订单管理模块迁移完成');
    
  } catch (error) {
    console.error('❌ 订单管理模块迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  (async () => {
    try {
      await migrateOrdersModule();
      console.log('🎉 订单管理模块迁移成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 订单管理模块迁移失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { migrateOrdersModule }; 