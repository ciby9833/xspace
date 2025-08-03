// 0803已发布支付表结构迁移 - node src/database/migrate-multi-payment-tables.js
require('dotenv').config();

const pool = require('./connection');

const migrateMultiPaymentTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始多人支付表结构迁移...');
    
    // 确保UUID扩展存在
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // 1. 创建订单参与玩家表 (order_players)
    console.log('📝 创建订单参与玩家表...');
    
    // 首先创建基础表结构（如果不存在）
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_players (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        player_name VARCHAR(100) NOT NULL,
        player_phone VARCHAR(20),
        selected_role_name VARCHAR(100),
        original_amount DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        final_amount DECIMAL(15,2) DEFAULT 0,
        payment_status VARCHAR(20) DEFAULT 'pending',
        player_order INTEGER NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(order_id, player_order)
      )
    `);
    
    // 检查并添加新字段到 order_players 表
    console.log('📝 检查并添加order_players表的新字段...');
    
    const orderPlayerFields = [
      // 角色定价模板信息 - 注意：这里需要先创建role_pricing_templates表才能添加外键
      { name: 'template_snapshot', sql: 'ADD COLUMN IF NOT EXISTS template_snapshot JSONB' },
      
      // 详细折扣信息
      { name: 'discount_type', sql: 'ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT \'none\' CHECK (discount_type IN (\'percentage\', \'fixed\', \'free\', \'none\'))' },
      { name: 'discount_percentage', sql: 'ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0' },
      { name: 'discount_fixed_amount', sql: 'ADD COLUMN IF NOT EXISTS discount_fixed_amount DECIMAL(15,2) DEFAULT 0' },
      
      // 付款时间记录
      { name: 'first_payment_time', sql: 'ADD COLUMN IF NOT EXISTS first_payment_time TIMESTAMPTZ' },
      { name: 'last_payment_time', sql: 'ADD COLUMN IF NOT EXISTS last_payment_time TIMESTAMPTZ' },
      { name: 'full_paid_time', sql: 'ADD COLUMN IF NOT EXISTS full_paid_time TIMESTAMPTZ' }
    ];
    
    for (const field of orderPlayerFields) {
      try {
        await client.query(`ALTER TABLE order_players ${field.sql}`);
        console.log(`✅ 添加字段成功: order_players.${field.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  字段已存在: order_players.${field.name}`);
        } else {
          console.error(`❌ 添加字段失败: order_players.${field.name}`, error.message);
        }
      }
    }
    
    // 更新payment_status约束以支持新的状态
    try {
      await client.query(`
        ALTER TABLE order_players 
        DROP CONSTRAINT IF EXISTS order_players_payment_status_check
      `);
      await client.query(`
        ALTER TABLE order_players 
        ADD CONSTRAINT order_players_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded'))
      `);
      console.log('✅ 更新payment_status约束成功');
    } catch (error) {
      console.log(`⚠️  更新payment_status约束失败: ${error.message}`);
    }

    // 2. 创建支付记录表 (order_payments)
    console.log('📝 创建支付记录表...');
    
    // 首先创建基础表结构（如果不存在）
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        payer_name VARCHAR(100) NOT NULL,
        payer_phone VARCHAR(20),
        payment_amount DECIMAL(15,2) NOT NULL CHECK (payment_amount > 0),
        payment_method VARCHAR(50) CHECK (payment_method IN ('Bank Transfer', 'QR BCA', 'DEBIT', 'CC', 'Cash', 'Other')),
        payment_date TIMESTAMPTZ DEFAULT NOW(),
        payment_status VARCHAR(20) DEFAULT 'pending',
        covers_player_ids TEXT[], -- 覆盖的玩家ID数组
        payment_proof_images TEXT[], -- 支付凭证图片URL数组
        notes TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // 检查并添加新字段到 order_payments 表
    console.log('📝 检查并添加order_payments表的新字段...');
    
    const orderPaymentFields = [
      // 详细支付信息
      { name: 'covers_player_count', sql: 'ADD COLUMN IF NOT EXISTS covers_player_count INTEGER DEFAULT 0' },
      { name: 'payment_for_roles', sql: 'ADD COLUMN IF NOT EXISTS payment_for_roles TEXT[]' },
      { name: 'original_total_amount', sql: 'ADD COLUMN IF NOT EXISTS original_total_amount DECIMAL(15,2) DEFAULT 0' },
      { name: 'discount_total_amount', sql: 'ADD COLUMN IF NOT EXISTS discount_total_amount DECIMAL(15,2) DEFAULT 0' },
      
      // 支付处理时间追踪
      { name: 'confirmed_at', sql: 'ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ' },
      { name: 'processed_at', sql: 'ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ' },
      
      // 🤖 AI识别相关字段
      { name: 'ai_recognition_status', sql: 'ADD COLUMN IF NOT EXISTS ai_recognition_status VARCHAR(20) DEFAULT \'pending\' CHECK (ai_recognition_status IN (\'pending\', \'processing\', \'success\', \'failed\', \'skipped\'))' },
      { name: 'ai_recognition_result', sql: 'ADD COLUMN IF NOT EXISTS ai_recognition_result JSONB' },
      { name: 'ai_recognition_error', sql: 'ADD COLUMN IF NOT EXISTS ai_recognition_error TEXT' },
      { name: 'ai_recognition_at', sql: 'ADD COLUMN IF NOT EXISTS ai_recognition_at TIMESTAMPTZ' },
      { name: 'ai_recognition_confidence', sql: 'ADD COLUMN IF NOT EXISTS ai_recognition_confidence DECIMAL(5,2)' }
    ];
    
    for (const field of orderPaymentFields) {
      try {
        await client.query(`ALTER TABLE order_payments ${field.sql}`);
        console.log(`✅ 添加字段成功: order_payments.${field.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  字段已存在: order_payments.${field.name}`);
        } else {
          console.error(`❌ 添加字段失败: order_payments.${field.name}`, error.message);
        }
      }
    }
    
    // 更新payment_status约束以支持新的状态
    try {
      await client.query(`
        ALTER TABLE order_payments 
        DROP CONSTRAINT IF EXISTS order_payments_payment_status_check
      `);
      await client.query(`
        ALTER TABLE order_payments 
        ADD CONSTRAINT order_payments_payment_status_check 
        CHECK (payment_status IN ('pending', 'confirmed', 'failed', 'cancelled'))
      `);
      console.log('✅ 更新order_payments payment_status约束成功');
    } catch (error) {
      console.log(`⚠️  更新order_payments payment_status约束失败: ${error.message}`);
    }

    // 3. 创建角色定价模板表 (role_pricing_templates)
    console.log('📝 创建角色定价模板表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_pricing_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
        store_ids UUID[], -- 门店ID数组，为空表示应用于整个公司
        role_name VARCHAR(100) NOT NULL,
        role_description TEXT,
        discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free')),
        discount_value DECIMAL(15,2) DEFAULT 0,
        valid_from DATE,
        valid_to DATE,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, role_name)
      )
    `);

    // 检查并添加缺失的列 (role_pricing_templates)
    console.log('📝 检查角色定价模板表列...');
    const roleTableStoreIdsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'role_pricing_templates' AND column_name = 'store_ids'
      );
    `);
    
    if (!roleTableStoreIdsExists.rows[0].exists) {
      console.log('🔧 添加 store_ids 列到角色定价模板表...');
      await client.query(`
        ALTER TABLE role_pricing_templates 
        ADD COLUMN store_ids UUID[]
      `);
    }

    // 检查并添加 discount_type 列
    const roleTableDiscountTypeExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'role_pricing_templates' AND column_name = 'discount_type'
      );
    `);
    
    if (!roleTableDiscountTypeExists.rows[0].exists) {
      console.log('🔧 添加 discount_type 列到角色定价模板表...');
      await client.query(`
        ALTER TABLE role_pricing_templates 
        ADD COLUMN discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed', 'free'))
      `);
    }

    // 检查并添加 discount_value 列
    const roleTableDiscountValueExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'role_pricing_templates' AND column_name = 'discount_value'
      );
    `);
    
    if (!roleTableDiscountValueExists.rows[0].exists) {
      console.log('🔧 添加 discount_value 列到角色定价模板表...');
      await client.query(`
        ALTER TABLE role_pricing_templates 
        ADD COLUMN discount_value DECIMAL(15,2) DEFAULT 0
      `);
    }

    // 4. 创建定价日历表 (pricing_calendar) - 节假日和工作日定价折扣
    console.log('📝 创建定价日历表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS pricing_calendar (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
        store_ids UUID[], -- 门店ID数组，为空表示应用于整个公司的所有门店
        calendar_date DATE NOT NULL,
        calendar_type VARCHAR(20) NOT NULL CHECK (calendar_type IN ('holiday', 'weekend', 'special', 'promotion')),
        discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
        discount_value DECIMAL(15,2) DEFAULT 0,
        description VARCHAR(200),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, calendar_date)
      )
    `);

    // 检查并添加缺失的列 (pricing_calendar)
    console.log('📝 检查定价日历表列...');
    const calendarTableStoreIdsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'pricing_calendar' AND column_name = 'store_ids'
      );
    `);
    
    if (!calendarTableStoreIdsExists.rows[0].exists) {
      console.log('🔧 添加 store_ids 列到定价日历表...');
      await client.query(`
        ALTER TABLE pricing_calendar 
        ADD COLUMN store_ids UUID[]
      `);
    }

    // 检查并添加 discount_type 列
    const calendarTableDiscountTypeExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'pricing_calendar' AND column_name = 'discount_type'
      );
    `);
    
    if (!calendarTableDiscountTypeExists.rows[0].exists) {
      console.log('🔧 添加 discount_type 列到定价日历表...');
      await client.query(`
        ALTER TABLE pricing_calendar 
        ADD COLUMN discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed'))
      `);
    }

    // 检查并添加 discount_value 列
    const calendarTableDiscountValueExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'pricing_calendar' AND column_name = 'discount_value'
      );
    `);
    
    if (!calendarTableDiscountValueExists.rows[0].exists) {
      console.log('🔧 添加 discount_value 列到定价日历表...');
      await client.query(`
        ALTER TABLE pricing_calendar 
        ADD COLUMN discount_value DECIMAL(15,2) DEFAULT 0
      `);
    }

    // 🆕 现在role_pricing_templates表已经存在，可以添加外键字段
    console.log('📝 添加order_players表的外键字段...');
    try {
      await client.query(`
        ALTER TABLE order_players 
        ADD COLUMN IF NOT EXISTS role_template_id UUID REFERENCES role_pricing_templates(id) ON DELETE SET NULL
      `);
      console.log('✅ 添加role_template_id外键字段成功');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  role_template_id字段已存在');
      } else {
        console.error(`❌ 添加role_template_id外键字段失败: ${error.message}`);
      }
    }

    // 检查并修复定价日历表约束
    console.log('📝 检查定价日历表约束...');
    
    // 检查 calendar_type 约束
    const calendarTypeConstraint = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'pricing_calendar_calendar_type_check'
        AND check_clause LIKE '%weekend%'
      );
    `);
    
    if (!calendarTypeConstraint.rows[0].exists) {
      console.log('🔧 修复 calendar_type 约束...');
      await client.query(`
        ALTER TABLE pricing_calendar 
        DROP CONSTRAINT IF EXISTS pricing_calendar_calendar_type_check
      `);
      await client.query(`
        ALTER TABLE pricing_calendar 
        ADD CONSTRAINT pricing_calendar_calendar_type_check 
        CHECK (calendar_type IN ('holiday', 'weekend', 'special', 'promotion'))
      `);
    }
    
    // 检查 discount_type 约束
    const discountTypeConstraint = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'pricing_calendar_discount_type_check'
      );
    `);
    
    if (!discountTypeConstraint.rows[0].exists) {
      console.log('🔧 修复 discount_type 约束...');
      await client.query(`
        ALTER TABLE pricing_calendar 
        DROP CONSTRAINT IF EXISTS pricing_calendar_discount_type_check
      `);
      await client.query(`
        ALTER TABLE pricing_calendar 
        ADD CONSTRAINT pricing_calendar_discount_type_check 
        CHECK (discount_type IN ('percentage', 'fixed'))
      `);
    }

    // 5. 创建索引
    console.log('📝 创建索引...');
    
    // 先检查必需的列是否存在
    const checkColumns = [
      { table: 'role_pricing_templates', column: 'store_ids' },
      { table: 'role_pricing_templates', column: 'discount_type' },
      { table: 'pricing_calendar', column: 'store_ids' },
      { table: 'pricing_calendar', column: 'discount_type' }
    ];

    for (const { table, column } of checkColumns) {
      const columnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = '${table}' AND column_name = '${column}'
        );
      `);
      
      if (!columnExists.rows[0].exists) {
        console.log(`⚠️  列 ${table}.${column} 不存在，跳过相关索引创建`);
      }
    }

    // 定义索引，包含条件检查
    const indexes = [
      // order_players 表索引
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_players_order_id ON order_players(order_id)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_players_payment_status ON order_players(payment_status)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_players_player_name ON order_players(player_name)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_players_player_phone ON order_players(player_phone)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_players_role_name ON order_players(selected_role_name)', required: true },
      // 🆕 新字段索引
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_players_role_template_id ON order_players(role_template_id)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_players_discount_type ON order_players(discount_type)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_players_first_payment_time ON order_players(first_payment_time)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_players_full_paid_time ON order_players(full_paid_time)', required: true },
      
      // order_payments 表索引
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_payments_payer_name ON order_payments(payer_name)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_payments_payer_phone ON order_payments(payer_phone)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_payments_payment_status ON order_payments(payment_status)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_payments_payment_date ON order_payments(payment_date)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_payments_created_by ON order_payments(created_by)', required: true },
      // 🆕 新字段索引
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_payments_confirmed_at ON order_payments(confirmed_at)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_payments_covers_player_count ON order_payments(covers_player_count)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_payments_payment_for_roles ON order_payments USING GIN(payment_for_roles)', required: true },
      
      // role_pricing_templates 表索引
      { sql: 'CREATE INDEX IF NOT EXISTS idx_role_pricing_templates_company_id ON role_pricing_templates(company_id)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_role_pricing_templates_store_ids ON role_pricing_templates USING GIN(store_ids)', table: 'role_pricing_templates', column: 'store_ids' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_role_pricing_templates_role_name ON role_pricing_templates(role_name)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_role_pricing_templates_discount_type ON role_pricing_templates(discount_type)', table: 'role_pricing_templates', column: 'discount_type' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_role_pricing_templates_valid_from ON role_pricing_templates(valid_from)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_role_pricing_templates_valid_to ON role_pricing_templates(valid_to)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_role_pricing_templates_is_active ON role_pricing_templates(is_active)', required: true },
      
      // pricing_calendar 表索引
      { sql: 'CREATE INDEX IF NOT EXISTS idx_pricing_calendar_company_id ON pricing_calendar(company_id)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_pricing_calendar_store_ids ON pricing_calendar USING GIN(store_ids)', table: 'pricing_calendar', column: 'store_ids' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_pricing_calendar_date ON pricing_calendar(calendar_date)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_pricing_calendar_type ON pricing_calendar(calendar_type)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_pricing_calendar_discount_type ON pricing_calendar(discount_type)', table: 'pricing_calendar', column: 'discount_type' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_pricing_calendar_is_active ON pricing_calendar(is_active)', required: true },
      
      // 🆕 orders 表多笔付款相关索引
      { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_enable_multi_payment ON orders(enable_multi_payment)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_payment_split_count ON orders(payment_split_count)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_payment_completion_percentage ON orders(payment_completion_percentage)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_first_payment_received_at ON orders(first_payment_received_at)', required: true },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_all_payments_completed_at ON orders(all_payments_completed_at)', required: true },
      
      // 🤖 AI识别相关索引
      { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_ai_recognition_status ON orders(ai_recognition_status)', table: 'orders', column: 'ai_recognition_status' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_ai_recognition_at ON orders(ai_recognition_at)', table: 'orders', column: 'ai_recognition_at' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_payments_ai_recognition_status ON order_payments(ai_recognition_status)', table: 'order_payments', column: 'ai_recognition_status' },
      { sql: 'CREATE INDEX IF NOT EXISTS idx_order_payments_ai_recognition_at ON order_payments(ai_recognition_at)', table: 'order_payments', column: 'ai_recognition_at' }
    ];

    for (const index of indexes) {
      try {
        // 如果索引需要特定列，检查列是否存在
        if (index.table && index.column) {
          const columnExists = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = '${index.table}' AND column_name = '${index.column}'
            );
          `);
          
          if (!columnExists.rows[0].exists) {
            console.log(`⚠️  跳过索引创建，列 ${index.table}.${index.column} 不存在`);
            continue;
          }
        }
        
        await client.query(index.sql);
        console.log(`✅ 创建索引成功`);
      } catch (error) {
        console.log(`⚠️  索引创建失败: ${error.message}`);
      }
    }

    // 6. 创建门店关联的查询函数
    console.log('📝 创建门店关联查询函数...');
    
    // 最终检查所有必需的列是否存在
    const finalColumnCheck = await client.query(`
      SELECT 
        (SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'role_pricing_templates' AND column_name = 'store_ids')) as role_store_ids_exists,
        (SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'role_pricing_templates' AND column_name = 'discount_type')) as role_discount_type_exists,
        (SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'pricing_calendar' AND column_name = 'store_ids')) as calendar_store_ids_exists,
        (SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'pricing_calendar' AND column_name = 'discount_type')) as calendar_discount_type_exists
    `);
    
    const checks = finalColumnCheck.rows[0];
    console.log(`📊 列存在性检查：`);
    console.log(`   role_pricing_templates.store_ids: ${checks.role_store_ids_exists ? '✅' : '❌'}`);
    console.log(`   role_pricing_templates.discount_type: ${checks.role_discount_type_exists ? '✅' : '❌'}`);
    console.log(`   pricing_calendar.store_ids: ${checks.calendar_store_ids_exists ? '✅' : '❌'}`);
    console.log(`   pricing_calendar.discount_type: ${checks.calendar_discount_type_exists ? '✅' : '❌'}`);
    
    if (!checks.role_store_ids_exists || !checks.role_discount_type_exists || 
        !checks.calendar_store_ids_exists || !checks.calendar_discount_type_exists) {
      console.log('⚠️  某些列仍然不存在，但继续创建查询函数...');
    }
    
    // 创建函数：检查角色定价模板是否适用于特定门店
    await client.query(`
      CREATE OR REPLACE FUNCTION is_role_pricing_applicable_to_store(
        template_id UUID,
        store_id UUID
      ) RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM role_pricing_templates 
          WHERE id = template_id 
          AND (store_ids IS NULL OR store_ids = '{}' OR store_id = ANY(store_ids))
          AND is_active = true
        );
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 创建函数：检查定价日历是否适用于特定门店
    await client.query(`
      CREATE OR REPLACE FUNCTION is_pricing_calendar_applicable_to_store(
        calendar_id UUID,
        store_id UUID
      ) RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM pricing_calendar 
          WHERE id = calendar_id 
          AND (store_ids IS NULL OR store_ids = '{}' OR store_id = ANY(store_ids))
          AND is_active = true
        );
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 创建函数：获取特定门店的有效角色定价模板
    await client.query(`
      CREATE OR REPLACE FUNCTION get_store_role_pricing_templates(
        company_id UUID,
        store_id UUID
      ) RETURNS TABLE(
        id UUID,
        role_name VARCHAR(100),
        role_description TEXT,
        discount_type VARCHAR(20),
        discount_value DECIMAL(15,2),
        valid_from DATE,
        valid_to DATE
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          rpt.id,
          rpt.role_name,
          rpt.role_description,
          rpt.discount_type,
          rpt.discount_value,
          rpt.valid_from,
          rpt.valid_to
        FROM role_pricing_templates rpt
        WHERE rpt.company_id = $1
        AND (rpt.store_ids IS NULL OR rpt.store_ids = '{}' OR $2 = ANY(rpt.store_ids))
        AND rpt.is_active = true
        AND (rpt.valid_from IS NULL OR rpt.valid_from <= CURRENT_DATE)
        AND (rpt.valid_to IS NULL OR rpt.valid_to >= CURRENT_DATE)
        ORDER BY rpt.sort_order, rpt.role_name;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 创建函数：获取特定门店的有效定价日历
    await client.query(`
      CREATE OR REPLACE FUNCTION get_store_pricing_calendar(
        company_id UUID,
        store_id UUID,
        check_date DATE
      ) RETURNS TABLE(
        id UUID,
        calendar_type VARCHAR(20),
        discount_type VARCHAR(20),
        discount_value DECIMAL(15,2),
        description VARCHAR(200)
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          pc.id,
          pc.calendar_type,
          pc.discount_type,
          pc.discount_value,
          pc.description
        FROM pricing_calendar pc
        WHERE pc.company_id = $1
        AND (pc.store_ids IS NULL OR pc.store_ids = '{}' OR $2 = ANY(pc.store_ids))
        AND pc.calendar_date = $3
        AND pc.is_active = true
        ORDER BY pc.calendar_type;
      END;
      $$ LANGUAGE plpgsql;
    `);

        console.log('✅ 创建门店关联查询函数完成');
  
    // 7. 创建触发器函数
    console.log('📝 创建触发器函数...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_multi_payment_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 🆕 创建多笔付款统计更新触发器函数（修复版本）
    console.log('📝 创建多笔付款统计更新触发器函数...');
    await client.query(`
      -- 更新订单统计信息的触发器函数
      CREATE OR REPLACE FUNCTION update_order_payment_statistics()
      RETURNS TRIGGER AS $$
      DECLARE
        target_order_id UUID;
        player_stats RECORD;
        payment_stats RECORD;
      BEGIN
        -- 获取涉及的订单ID（修复版本）
        IF TG_TABLE_NAME = 'order_players' THEN
          target_order_id := COALESCE(NEW.order_id, OLD.order_id);
        ELSIF TG_TABLE_NAME = 'order_payments' THEN
          target_order_id := COALESCE(NEW.order_id, OLD.order_id);
        ELSE
          RETURN COALESCE(NEW, OLD);
        END IF;
        
        -- 确保订单ID不为空
        IF target_order_id IS NULL THEN
          RETURN COALESCE(NEW, OLD);
        END IF;
        
        -- 计算玩家统计信息
        SELECT 
          COUNT(*) as total_players,
          COUNT(CASE WHEN discount_type != 'none' AND discount_amount > 0 THEN 1 END) as players_with_discount,
          COUNT(CASE WHEN discount_type = 'none' OR discount_amount = 0 THEN 1 END) as players_without_discount,
          COALESCE(SUM(original_amount), 0) as total_original,
          COALESCE(SUM(discount_amount), 0) as total_discount,
          COALESCE(SUM(final_amount), 0) as total_final,
          COALESCE(AVG(CASE WHEN discount_type = 'percentage' THEN discount_percentage ELSE 0 END), 0) as avg_discount_percentage
        INTO player_stats
        FROM order_players 
        WHERE order_id = target_order_id;
        
        -- 计算支付统计信息
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(CASE WHEN payment_status = 'confirmed' THEN payment_amount ELSE 0 END), 0) as total_paid,
          MIN(CASE WHEN payment_status = 'confirmed' THEN confirmed_at END) as first_payment,
          MAX(CASE WHEN payment_status = 'confirmed' THEN confirmed_at END) as last_payment
        INTO payment_stats
        FROM order_payments 
        WHERE order_id = target_order_id;
        
        -- 更新订单表的统计字段
        UPDATE orders SET
          total_players_with_discount = COALESCE(player_stats.players_with_discount, 0),
          total_players_without_discount = COALESCE(player_stats.players_without_discount, 0),
          total_discount_percentage = COALESCE(player_stats.avg_discount_percentage, 0),
          total_original_amount = COALESCE(player_stats.total_original, 0),
          total_discount_amount = COALESCE(player_stats.total_discount, 0),
          total_final_amount = COALESCE(player_stats.total_final, 0),
          updated_at = NOW()
        WHERE id = target_order_id;
        
        RETURN COALESCE(NEW, OLD);
      EXCEPTION
        WHEN OTHERS THEN
          -- 如果出现任何错误，记录并继续
          RAISE NOTICE '订单统计更新失败: %', SQLERRM;
          RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 8. 创建触发器
    console.log('📝 创建触发器...');
    const triggers = [
      'DROP TRIGGER IF EXISTS trigger_update_order_players_timestamp ON order_players',
      'CREATE TRIGGER trigger_update_order_players_timestamp BEFORE UPDATE ON order_players FOR EACH ROW EXECUTE FUNCTION update_multi_payment_timestamp()',
      
      'DROP TRIGGER IF EXISTS trigger_update_order_payments_timestamp ON order_payments',
      'CREATE TRIGGER trigger_update_order_payments_timestamp BEFORE UPDATE ON order_payments FOR EACH ROW EXECUTE FUNCTION update_multi_payment_timestamp()',
      
      'DROP TRIGGER IF EXISTS trigger_update_role_pricing_templates_timestamp ON role_pricing_templates',
      'CREATE TRIGGER trigger_update_role_pricing_templates_timestamp BEFORE UPDATE ON role_pricing_templates FOR EACH ROW EXECUTE FUNCTION update_multi_payment_timestamp()',
      
      'DROP TRIGGER IF EXISTS trigger_update_pricing_calendar_timestamp ON pricing_calendar',
      'CREATE TRIGGER trigger_update_pricing_calendar_timestamp BEFORE UPDATE ON pricing_calendar FOR EACH ROW EXECUTE FUNCTION update_multi_payment_timestamp()'
    ];

    for (const triggerSQL of triggers) {
      try {
        await client.query(triggerSQL);
      } catch (error) {
        console.log(`⚠️  触发器创建失败: ${error.message}`);
      }
    }

    // 9. 添加表注释
    console.log('📝 添加表注释...');
    
    // 基本表注释
    await client.query(`
      COMMENT ON TABLE order_players IS '订单参与玩家表，记录每个订单的参与玩家信息';
      COMMENT ON COLUMN order_players.order_id IS '关联的订单ID';
      COMMENT ON COLUMN order_players.player_name IS '玩家姓名';
      COMMENT ON COLUMN order_players.player_phone IS '玩家电话';
      COMMENT ON COLUMN order_players.selected_role_name IS '选择的角色名称（用户自定义）';
      COMMENT ON COLUMN order_players.original_amount IS '原始应付金额';
      COMMENT ON COLUMN order_players.discount_amount IS '折扣金额';
      COMMENT ON COLUMN order_players.final_amount IS '最终应付金额';
      COMMENT ON COLUMN order_players.player_order IS '玩家序号';
      
      COMMENT ON TABLE order_payments IS '支付记录表，记录每笔实际支付';
      COMMENT ON COLUMN order_payments.order_id IS '关联的订单ID';
      COMMENT ON COLUMN order_payments.payer_name IS '付款人姓名';
      COMMENT ON COLUMN order_payments.payer_phone IS '付款人电话';
      COMMENT ON COLUMN order_payments.payment_amount IS '支付金额';
      COMMENT ON COLUMN order_payments.payment_method IS '支付方式';
      COMMENT ON COLUMN order_payments.payment_date IS '支付时间';
      COMMENT ON COLUMN order_payments.covers_player_ids IS '覆盖的玩家ID数组';
      COMMENT ON COLUMN order_payments.payment_proof_images IS '支付凭证图片URL数组';
      COMMENT ON COLUMN order_payments.created_by IS '创建人';
      
      COMMENT ON TABLE role_pricing_templates IS '角色定价模板表，用户自定义的角色定价规则';
      COMMENT ON COLUMN role_pricing_templates.company_id IS '公司ID';
      COMMENT ON COLUMN role_pricing_templates.role_name IS '角色名称（用户任意命名）';
      COMMENT ON COLUMN role_pricing_templates.role_description IS '角色描述';
      COMMENT ON COLUMN role_pricing_templates.valid_from IS '有效开始日期';
      COMMENT ON COLUMN role_pricing_templates.valid_to IS '有效结束日期';
      COMMENT ON COLUMN role_pricing_templates.is_active IS '是否激活';
      
      COMMENT ON TABLE pricing_calendar IS '定价日历表，管理特殊日期和折扣';
      COMMENT ON COLUMN pricing_calendar.company_id IS '公司ID';
      COMMENT ON COLUMN pricing_calendar.calendar_date IS '日期';
      COMMENT ON COLUMN pricing_calendar.calendar_type IS '日历类型：holiday-节假日、weekend-周末、special-特殊日期、promotion-促销日期';
      COMMENT ON COLUMN pricing_calendar.description IS '描述';
      COMMENT ON COLUMN pricing_calendar.is_active IS '是否激活';
    `);

    // 🆕 为新字段添加注释（仅在字段存在时添加）
    console.log('📝 为新字段添加注释...');
    
    // 检查order_players的新字段并添加注释
    const orderPlayerNewColumns = [
      { column: 'role_template_id', comment: '使用的角色定价模板ID' },
      { column: 'template_snapshot', comment: '角色定价模板快照（JSON格式），防止模板后续修改影响历史数据' },
      { column: 'discount_type', comment: '折扣类型：percentage-百分比、fixed-固定金额、free-免费、none-无折扣' },
      { column: 'discount_percentage', comment: '折扣百分比（如10.5代表10.5%）' },
      { column: 'discount_fixed_amount', comment: '固定折扣金额' },
      { column: 'first_payment_time', comment: '首次付款时间' },
      { column: 'last_payment_time', comment: '最后付款时间' },
      { column: 'full_paid_time', comment: '完全付款时间' }
    ];
    
    for (const { column, comment } of orderPlayerNewColumns) {
      try {
        const columnExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'order_players' AND column_name = $1
          );
        `, [column]);
        
        if (columnExists.rows[0].exists) {
          await client.query(`COMMENT ON COLUMN order_players.${column} IS '${comment}';`);
          console.log(`✅ 添加注释成功: order_players.${column}`);
        } else {
          console.log(`⚠️  跳过注释，列不存在: order_players.${column}`);
        }
      } catch (error) {
        console.log(`⚠️  添加注释失败: order_players.${column} - ${error.message}`);
      }
    }
    
    // 更新payment_status注释
    try {
      await client.query(`
        COMMENT ON COLUMN order_players.payment_status IS '支付状态：pending-待支付、paid-已支付、partial-部分支付、refunded-已退款';
      `);
      console.log(`✅ 更新注释成功: order_players.payment_status`);
    } catch (error) {
      console.log(`⚠️  更新注释失败: order_players.payment_status - ${error.message}`);
    }
    
    // 检查order_payments的新字段并添加注释
    const orderPaymentNewColumns = [
      { column: 'covers_player_count', comment: '覆盖的玩家数量' },
      { column: 'payment_for_roles', comment: '支付涵盖的角色名称数组' },
      { column: 'original_total_amount', comment: '原价总金额（所有覆盖玩家的原价之和）' },
      { column: 'discount_total_amount', comment: '折扣总金额（所有覆盖玩家的折扣之和）' },
      { column: 'confirmed_at', comment: '支付确认时间' },
      { column: 'processed_at', comment: '支付处理完成时间' },
      
      // 🤖 AI识别相关字段注释
      { column: 'ai_recognition_status', comment: 'AI识别状态：pending-待识别, processing-识别中, success-成功, failed-失败, skipped-跳过' },
      { column: 'ai_recognition_result', comment: 'AI识别结果JSON数据（包含银行信息、付款人、金额等）' },
      { column: 'ai_recognition_error', comment: 'AI识别错误信息' },
      { column: 'ai_recognition_at', comment: 'AI识别完成时间' },
      { column: 'ai_recognition_confidence', comment: 'AI识别置信度（0-100）' }
    ];
    
    for (const { column, comment } of orderPaymentNewColumns) {
      try {
        const columnExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'order_payments' AND column_name = $1
          );
        `, [column]);
        
        if (columnExists.rows[0].exists) {
          await client.query(`COMMENT ON COLUMN order_payments.${column} IS '${comment}';`);
          console.log(`✅ 添加注释成功: order_payments.${column}`);
        } else {
          console.log(`⚠️  跳过注释，列不存在: order_payments.${column}`);
        }
      } catch (error) {
        console.log(`⚠️  添加注释失败: order_payments.${column} - ${error.message}`);
      }
    }
    
    // 更新payment_status注释
    try {
      await client.query(`
        COMMENT ON COLUMN order_payments.payment_status IS '支付状态：pending-待确认、confirmed-已确认、failed-失败、cancelled-已取消';
      `);
      console.log(`✅ 更新注释成功: order_payments.payment_status`);
    } catch (error) {
      console.log(`⚠️  更新注释失败: order_payments.payment_status - ${error.message}`);
    }

    // 添加条件性的列注释 (仅在列存在时添加)
    console.log('📝 添加条件性列注释...');
    
    // 检查并添加 role_pricing_templates.store_ids 注释
    const roleStoreIdsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'role_pricing_templates' AND column_name = 'store_ids'
      );
    `);
    
    if (roleStoreIdsExists.rows[0].exists) {
      await client.query(`
        COMMENT ON COLUMN role_pricing_templates.store_ids IS '门店ID数组，为空表示应用于整个公司的所有门店';
      `);
    }

    // 检查并添加 role_pricing_templates.discount_type 注释
    const roleDiscountTypeExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'role_pricing_templates' AND column_name = 'discount_type'
      );
    `);
    
    if (roleDiscountTypeExists.rows[0].exists) {
      await client.query(`
        COMMENT ON COLUMN role_pricing_templates.discount_type IS '折扣类型：percentage-百分比、fixed-固定金额、free-免费';
      `);
    }

    // 检查并添加 pricing_calendar.store_ids 注释
    const calendarStoreIdsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'pricing_calendar' AND column_name = 'store_ids'
      );
    `);
    
    if (calendarStoreIdsExists.rows[0].exists) {
      await client.query(`
        COMMENT ON COLUMN pricing_calendar.store_ids IS '门店ID数组，为空表示应用于整个公司的所有门店';
      `);
    }

    // 检查并添加 pricing_calendar.discount_type 注释
    const calendarDiscountTypeExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'pricing_calendar' AND column_name = 'discount_type'
      );
    `);
    
    if (calendarDiscountTypeExists.rows[0].exists) {
      await client.query(`
        COMMENT ON COLUMN pricing_calendar.discount_type IS '折扣类型：percentage-百分比、fixed-固定金额';
      `);
    }

    // 检查并添加 role_pricing_templates.discount_value 注释
    const roleDiscountValueExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'role_pricing_templates' AND column_name = 'discount_value'
      );
    `);
    
    if (roleDiscountValueExists.rows[0].exists) {
      await client.query(`
        COMMENT ON COLUMN role_pricing_templates.discount_value IS '折扣值';
      `);
    }

    // 检查并添加 pricing_calendar.discount_value 注释
    const calendarDiscountValueExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'pricing_calendar' AND column_name = 'discount_value'
      );
    `);
    
    if (calendarDiscountValueExists.rows[0].exists) {
      await client.query(`
        COMMENT ON COLUMN pricing_calendar.discount_value IS '折扣值';
      `);
    }

    // 🆕 扩展orders表 - 多笔付款统计字段
    console.log('📝 扩展订单表多笔付款字段...');
    
    const multiPaymentFields = [
      // 多笔付款开关和统计
      { name: 'enable_multi_payment', sql: 'ADD COLUMN IF NOT EXISTS enable_multi_payment BOOLEAN DEFAULT false' },
      { name: 'payment_split_count', sql: 'ADD COLUMN IF NOT EXISTS payment_split_count INTEGER DEFAULT 1' },
      { name: 'total_players_with_discount', sql: 'ADD COLUMN IF NOT EXISTS total_players_with_discount INTEGER DEFAULT 0' },
      { name: 'total_players_without_discount', sql: 'ADD COLUMN IF NOT EXISTS total_players_without_discount INTEGER DEFAULT 0' },
      
      // 折扣汇总信息
      { name: 'total_discount_percentage', sql: 'ADD COLUMN IF NOT EXISTS total_discount_percentage DECIMAL(5,2) DEFAULT 0' },
      { name: 'total_original_amount', sql: 'ADD COLUMN IF NOT EXISTS total_original_amount DECIMAL(15,2) DEFAULT 0' },
      { name: 'total_discount_amount', sql: 'ADD COLUMN IF NOT EXISTS total_discount_amount DECIMAL(15,2) DEFAULT 0' },
      { name: 'total_final_amount', sql: 'ADD COLUMN IF NOT EXISTS total_final_amount DECIMAL(15,2) DEFAULT 0' },
      
      // 支付进度追踪
      { name: 'total_paid_amount', sql: 'ADD COLUMN IF NOT EXISTS total_paid_amount DECIMAL(15,2) DEFAULT 0' },
      { name: 'total_pending_amount', sql: 'ADD COLUMN IF NOT EXISTS total_pending_amount DECIMAL(15,2) DEFAULT 0' },
      { name: 'payment_completion_percentage', sql: 'ADD COLUMN IF NOT EXISTS payment_completion_percentage DECIMAL(5,2) DEFAULT 0' },
      
      // 多笔付款时间记录
      { name: 'first_payment_received_at', sql: 'ADD COLUMN IF NOT EXISTS first_payment_received_at TIMESTAMPTZ' },
      { name: 'last_payment_received_at', sql: 'ADD COLUMN IF NOT EXISTS last_payment_received_at TIMESTAMPTZ' },
      { name: 'all_payments_completed_at', sql: 'ADD COLUMN IF NOT EXISTS all_payments_completed_at TIMESTAMPTZ' },
      
      // 多笔付款备注
      { name: 'multi_payment_summary', sql: 'ADD COLUMN IF NOT EXISTS multi_payment_summary TEXT' },
      
      // 🤖 AI识别相关字段（用于场景二：单笔支付）
      { name: 'ai_recognition_status', sql: 'ADD COLUMN IF NOT EXISTS ai_recognition_status VARCHAR(20) DEFAULT \'pending\' CHECK (ai_recognition_status IN (\'pending\', \'processing\', \'success\', \'failed\', \'skipped\'))' },
      { name: 'ai_recognition_result', sql: 'ADD COLUMN IF NOT EXISTS ai_recognition_result JSONB' },
      { name: 'ai_recognition_error', sql: 'ADD COLUMN IF NOT EXISTS ai_recognition_error TEXT' },
      { name: 'ai_recognition_at', sql: 'ADD COLUMN IF NOT EXISTS ai_recognition_at TIMESTAMPTZ' },
      { name: 'ai_recognition_confidence', sql: 'ADD COLUMN IF NOT EXISTS ai_recognition_confidence DECIMAL(5,2)' },
      
      // 🆕 AI识别总金额字段（两种场景通用）
      { name: 'ai_total_recognized_amount', sql: 'ADD COLUMN IF NOT EXISTS ai_total_recognized_amount DECIMAL(12,2) DEFAULT 0' },
      { name: 'ai_total_confidence_score', sql: 'ADD COLUMN IF NOT EXISTS ai_total_confidence_score DECIMAL(5,2) DEFAULT 0' },
      { name: 'ai_recognition_summary', sql: 'ADD COLUMN IF NOT EXISTS ai_recognition_summary TEXT' }
    ];
    
    for (const field of multiPaymentFields) {
      try {
        await client.query(`ALTER TABLE orders ${field.sql}`);
        console.log(`✅ 添加字段成功: ${field.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  字段已存在: ${field.name}`);
        } else {
          console.error(`❌ 添加字段失败: ${field.name}`, error.message);
        }
      }
    }

    // 🆕 添加orders表多笔付款字段注释
    console.log('📝 添加订单表多笔付款字段注释...');
    await client.query(`
      -- orders表多笔付款相关字段注释
      COMMENT ON COLUMN orders.enable_multi_payment IS '是否启用多笔付款模式';
      COMMENT ON COLUMN orders.payment_split_count IS '付款拆分笔数';
      COMMENT ON COLUMN orders.total_players_with_discount IS '享受折扣的玩家总数';
      COMMENT ON COLUMN orders.total_players_without_discount IS '无折扣的玩家总数';
      COMMENT ON COLUMN orders.total_discount_percentage IS '总体折扣百分比（平均值）';
      COMMENT ON COLUMN orders.total_original_amount IS '订单原价总金额（所有玩家原价之和）';
      COMMENT ON COLUMN orders.total_discount_amount IS '订单折扣总金额（所有玩家折扣之和）';
      COMMENT ON COLUMN orders.total_final_amount IS '订单最终总金额（所有玩家应付之和）';
      COMMENT ON COLUMN orders.total_paid_amount IS '已收款总金额';
      COMMENT ON COLUMN orders.total_pending_amount IS '待收款总金额';
      COMMENT ON COLUMN orders.payment_completion_percentage IS '收款完成百分比';
      COMMENT ON COLUMN orders.first_payment_received_at IS '首次收到付款的时间';
      COMMENT ON COLUMN orders.last_payment_received_at IS '最后收到付款的时间';
      COMMENT ON COLUMN orders.all_payments_completed_at IS '所有付款完成的时间';
      COMMENT ON COLUMN orders.multi_payment_summary IS '多笔付款汇总信息（如：3笔付款，2人享受学生折扣，1人标准价格）';
      
      -- 🤖 AI识别相关字段注释
      COMMENT ON COLUMN orders.ai_recognition_status IS 'AI识别状态：pending-待识别, processing-识别中, success-成功, failed-失败, skipped-跳过';
      COMMENT ON COLUMN orders.ai_recognition_result IS 'AI识别结果JSON数据（包含银行信息、付款人、金额等）';
      COMMENT ON COLUMN orders.ai_recognition_error IS 'AI识别错误信息';
      COMMENT ON COLUMN orders.ai_recognition_at IS 'AI识别完成时间';
      COMMENT ON COLUMN orders.ai_recognition_confidence IS 'AI识别置信度（0-100）';
      COMMENT ON COLUMN orders.ai_total_recognized_amount IS 'AI识别总金额（单笔支付为单个凭证金额，分笔支付为所有凭证金额之和）';
      COMMENT ON COLUMN orders.ai_total_confidence_score IS 'AI识别平均置信度（多个凭证时为平均值）';
      COMMENT ON COLUMN orders.ai_recognition_summary IS 'AI识别摘要信息（如：识别3张凭证，总金额1,500,000 IDR，平均置信度85%）';
    `);

    // 10. 显示统计信息
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM order_players) as total_players,
        (SELECT COUNT(*) FROM order_payments) as total_payments,
        (SELECT COUNT(*) FROM role_pricing_templates) as total_role_templates,
        (SELECT COUNT(*) FROM pricing_calendar) as total_calendar_entries,
        (SELECT COUNT(*) FROM company WHERE status = 'active') as active_companies
    `);

    console.log('📊 迁移结果统计:');
    console.log(`   订单玩家记录: ${stats.rows[0].total_players}`);
    console.log(`   支付记录: ${stats.rows[0].total_payments}`);
    console.log(`   角色定价模板: ${stats.rows[0].total_role_templates}`);
    console.log(`   定价日历条目: ${stats.rows[0].total_calendar_entries}`);
    console.log(`   活跃公司数: ${stats.rows[0].active_companies}`);

    console.log('✅ 多人支付表结构迁移完成');
    
  } catch (error) {
    console.error('❌ 多人支付表结构迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  (async () => {
    try {
      await migrateMultiPaymentTables();
      console.log('🎉 多人支付表结构迁移成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 多人支付表结构迁移失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { migrateMultiPaymentTables }; 