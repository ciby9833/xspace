const pool = require('../database/connection');

class OrderModel {
  // 根据公司ID获取订单列表
  async findByCompanyId(companyId, filters = {}) {
    let query = `
      SELECT o.*, 
        c.name as company_name,
        s.name as store_name,
        r.name as room_name,
        sc.name as script_name,
        sc.supported_languages as script_supported_languages,
        er.name as escape_room_name,
        er.supported_languages as escape_room_supported_languages,
        gu.name as game_host_name,
        nu.name as npc_name,
        pu.name as pic_name,
        ppu.name as pic_payment_name,
        cu.name as created_by_name,
        uu.name as updated_by_name,
        COALESCE(
          ARRAY_AGG(
            CASE WHEN oi.id IS NOT NULL THEN
              json_build_object(
                'id', oi.id,
                'image_url', oi.image_url,
                'image_name', oi.image_name,
                'image_type', oi.image_type,
                'sort_order', oi.sort_order
              )
            END
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '{}'::json[]
        ) as images
      FROM orders o
      LEFT JOIN company c ON o.company_id = c.id
      LEFT JOIN store s ON o.store_id = s.id
      LEFT JOIN rooms r ON o.room_id = r.id
      LEFT JOIN scripts sc ON o.script_id = sc.id
      LEFT JOIN escape_rooms er ON o.escape_room_id = er.id
      LEFT JOIN users gu ON o.game_host_id = gu.id
      LEFT JOIN users nu ON o.npc_id = nu.id
      LEFT JOIN users pu ON o.pic_id = pu.id
      LEFT JOIN users ppu ON o.pic_payment_id = ppu.id
      LEFT JOIN users cu ON o.created_by = cu.id
      LEFT JOIN users uu ON o.updated_by = uu.id
      LEFT JOIN order_images oi ON o.id = oi.order_id
      WHERE o.company_id = $1 AND o.is_active = true
    `;
    
    const params = [companyId];
    let paramIndex = 2;

    // 添加筛选条件
    if (filters.store_id) {
      query += ` AND o.store_id = $${paramIndex}`;
      params.push(filters.store_id);
      paramIndex++;
    }

    if (filters.order_type) {
      query += ` AND o.order_type = $${paramIndex}`;
      params.push(filters.order_type);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.payment_status) {
      query += ` AND o.payment_status = $${paramIndex}`;
      params.push(filters.payment_status);
      paramIndex++;
    }

    if (filters.booking_type) {
      query += ` AND o.booking_type = $${paramIndex}`;
      params.push(filters.booking_type);
      paramIndex++;
    }

    if (filters.start_date) {
      query += ` AND o.order_date >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      query += ` AND o.order_date <= $${paramIndex}`;
      params.push(filters.end_date);
      paramIndex++;
    }

    if (filters.customer_phone) {
      query += ` AND o.customer_phone ILIKE $${paramIndex}`;
      params.push(`%${filters.customer_phone}%`);
      paramIndex++;
    }

    if (filters.customer_name) {
      query += ` AND o.customer_name ILIKE $${paramIndex}`;
      params.push(`%${filters.customer_name}%`);
      paramIndex++;
    }

    // 🆕 修改语言筛选逻辑：按剧本/密室支持的语言筛选
    if (filters.language) {
      query += ` AND (
        (o.order_type = '剧本杀' AND sc.supported_languages::jsonb ? $${paramIndex}) OR
        (o.order_type = '密室' AND er.supported_languages::jsonb ? $${paramIndex})
      )`;
      params.push(filters.language);
      paramIndex++;
    }

    query += ` GROUP BY o.id, c.name, s.name, r.name, sc.name, sc.supported_languages, er.name, er.supported_languages, gu.name, nu.name, pu.name, ppu.name, cu.name, uu.name
               ORDER BY o.order_date DESC, o.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // 根据门店ID获取订单列表
  async findByStoreId(storeId, filters = {}) {
    let query = `
      SELECT o.*, 
        s.name as store_name,
        r.name as room_name,
        sc.name as script_name,
        sc.supported_languages as script_supported_languages,
        er.name as escape_room_name,
        er.supported_languages as escape_room_supported_languages,
        gu.name as game_host_name,
        nu.name as npc_name,
        pu.name as pic_name,
        ppu.name as pic_payment_name,
        cu.name as created_by_name,
        uu.name as updated_by_name,
        COALESCE(
          ARRAY_AGG(
            CASE WHEN oi.id IS NOT NULL THEN
              json_build_object(
                'id', oi.id,
                'image_url', oi.image_url,
                'image_name', oi.image_name,
                'image_type', oi.image_type,
                'sort_order', oi.sort_order
              )
            END
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '{}'::json[]
        ) as images
      FROM orders o
      LEFT JOIN store s ON o.store_id = s.id
      LEFT JOIN rooms r ON o.room_id = r.id
      LEFT JOIN scripts sc ON o.script_id = sc.id
      LEFT JOIN escape_rooms er ON o.escape_room_id = er.id
      LEFT JOIN users gu ON o.game_host_id = gu.id
      LEFT JOIN users nu ON o.npc_id = nu.id
      LEFT JOIN users pu ON o.pic_id = pu.id
      LEFT JOIN users ppu ON o.pic_payment_id = ppu.id
      LEFT JOIN users cu ON o.created_by = cu.id
      LEFT JOIN users uu ON o.updated_by = uu.id
      LEFT JOIN order_images oi ON o.id = oi.order_id
      WHERE o.store_id = $1 AND o.is_active = true
    `;
    
    const params = [storeId];
    let paramIndex = 2;

    // 应用其他筛选条件（与findByCompanyId相同逻辑）
    if (filters.order_type) {
      query += ` AND o.order_type = $${paramIndex}`;
      params.push(filters.order_type);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.payment_status) {
      query += ` AND o.payment_status = $${paramIndex}`;
      params.push(filters.payment_status);
      paramIndex++;
    }

    if (filters.booking_type) {
      query += ` AND o.booking_type = $${paramIndex}`;
      params.push(filters.booking_type);
      paramIndex++;
    }

    if (filters.start_date) {
      query += ` AND o.order_date >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      query += ` AND o.order_date <= $${paramIndex}`;
      params.push(filters.end_date);
      paramIndex++;
    }

    if (filters.customer_phone) {
      query += ` AND o.customer_phone ILIKE $${paramIndex}`;
      params.push(`%${filters.customer_phone}%`);
      paramIndex++;
    }

    if (filters.customer_name) {
      query += ` AND o.customer_name ILIKE $${paramIndex}`;
      params.push(`%${filters.customer_name}%`);
      paramIndex++;
    }

    // 🆕 修改语言筛选逻辑：按剧本/密室支持的语言筛选
    if (filters.language) {
      query += ` AND (
        (o.order_type = '剧本杀' AND sc.supported_languages::jsonb ? $${paramIndex}) OR
        (o.order_type = '密室' AND er.supported_languages::jsonb ? $${paramIndex})
      )`;
      params.push(filters.language);
      paramIndex++;
    }

    query += ` GROUP BY o.id, s.name, r.name, sc.name, sc.supported_languages, er.name, er.supported_languages, gu.name, nu.name, pu.name, ppu.name, cu.name, uu.name
               ORDER BY o.order_date DESC, o.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // 根据ID获取订单详情
  async findById(orderId, companyId = null) {
    let query = `
      SELECT o.*, 
        c.name as company_name,
        s.name as store_name,
        r.name as room_name,
        sc.name as script_name,
        sc.supported_languages as script_supported_languages,
        er.name as escape_room_name,
        er.supported_languages as escape_room_supported_languages,
        gu.name as game_host_name,
        nu.name as npc_name,
        pu.name as pic_name,
        ppu.name as pic_payment_name,
        cu.name as created_by_name,
        uu.name as updated_by_name,
        COALESCE(
          ARRAY_AGG(
            CASE WHEN oi.id IS NOT NULL THEN
              json_build_object(
                'id', oi.id,
                'image_url', oi.image_url,
                'image_name', oi.image_name,
                'image_type', oi.image_type,
                'sort_order', oi.sort_order
              )
            END
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '{}'::json[]
        ) as images
      FROM orders o
      LEFT JOIN company c ON o.company_id = c.id
      LEFT JOIN store s ON o.store_id = s.id
      LEFT JOIN rooms r ON o.room_id = r.id
      LEFT JOIN scripts sc ON o.script_id = sc.id
      LEFT JOIN escape_rooms er ON o.escape_room_id = er.id
      LEFT JOIN users gu ON o.game_host_id = gu.id
      LEFT JOIN users nu ON o.npc_id = nu.id
      LEFT JOIN users pu ON o.pic_id = pu.id
      LEFT JOIN users ppu ON o.pic_payment_id = ppu.id
      LEFT JOIN users cu ON o.created_by = cu.id
      LEFT JOIN users uu ON o.updated_by = uu.id
      LEFT JOIN order_images oi ON o.id = oi.order_id
      WHERE o.id = $1
    `;

    const params = [orderId];

    if (companyId) {
      query += ` AND o.company_id = $2`;
      params.push(companyId);
    }

    query += ` GROUP BY o.id, c.name, s.name, r.name, sc.name, sc.supported_languages, er.name, er.supported_languages, gu.name, nu.name, pu.name, ppu.name, cu.name, uu.name`;

    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  // 创建订单
  async create(orderData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        company_id, store_id, room_id, order_type, order_date, weekday, language,
        start_time, end_time, duration, customer_name, customer_phone, player_count,
        internal_support, script_id, script_name, game_host_id, npc_id,
        escape_room_id, escape_room_name, escape_room_npc_roles, is_group_booking, include_photos, include_cctv,
        booking_type, is_free, unit_price, total_amount, payment_status, payment_date, payment_method,
        promo_code, promo_quantity, promo_discount, pic_id, pic_payment, notes,
        status, created_by, images,
        // 🆕 新增财务字段
        original_price, discount_price, discount_amount, prepaid_amount, remaining_amount,
        tax_amount, service_fee, manual_discount, activity_discount, member_discount,
        package_discount, refund_amount, refund_reason, refund_date,
        actual_start_time, actual_end_time
      } = orderData;

      // 创建订单记录
      const orderQuery = `
        INSERT INTO orders (
          company_id, store_id, room_id, order_type, order_date, weekday, language,
          start_time, end_time, duration, customer_name, customer_phone, player_count,
          internal_support, script_id, script_name, game_host_id, npc_id,
          escape_room_id, escape_room_name, escape_room_npc_roles, is_group_booking, include_photos, include_cctv,
          booking_type, is_free, unit_price, total_amount, payment_status, payment_date, payment_method,
          promo_code, promo_quantity, promo_discount, pic_id, pic_payment, notes,
          status, created_by,
          original_price, discount_price, discount_amount, prepaid_amount, remaining_amount,
          tax_amount, service_fee, manual_discount, activity_discount, member_discount,
          package_discount, refund_amount, refund_reason, refund_date,
          actual_start_time, actual_end_time
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
          $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55
        ) RETURNING id
      `;

      const orderValues = [
        company_id, store_id, room_id, order_type, order_date, weekday, language,
        start_time, end_time, duration, customer_name, customer_phone, player_count,
        internal_support, script_id, script_name, game_host_id, npc_id,
        escape_room_id, escape_room_name, escape_room_npc_roles, is_group_booking, include_photos, include_cctv,
        booking_type, is_free, unit_price, total_amount, payment_status, payment_date, payment_method,
        promo_code, promo_quantity, promo_discount, pic_id, pic_payment, notes,
        status, created_by,
        // 🆕 新增财务字段值
        original_price || 0, discount_price || 0, discount_amount || 0, 
        prepaid_amount || 0, remaining_amount || 0, tax_amount || 0, service_fee || 0,
        manual_discount || 0, activity_discount || 0, member_discount || 0, package_discount || 0,
        refund_amount || 0, refund_reason, refund_date,
        actual_start_time, actual_end_time
      ];

      const result = await client.query(orderQuery, orderValues);
      const newOrderId = result.rows[0].id;

      // 处理图片上传
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          
          // 🆕 处理不同的图片数据格式
          let imageUrl, imageName, imageType;
          
          if (typeof image === 'string') {
            // 如果是字符串，假设是URL
            imageUrl = image;
            imageName = `image_${i + 1}`;
            imageType = 'proof';
          } else if (image && typeof image === 'object') {
            // 如果是对象，提取相应字段
            imageUrl = image.url || image.image_url;
            imageName = image.name || image.image_name || `image_${i + 1}`;
            imageType = image.type || image.image_type || 'proof';
          } else {
            console.warn('无效的图片数据格式:', image);
            continue;
          }
          
          if (!imageUrl) {
            console.warn('图片URL为空，跳过:', image);
            continue;
          }
          
          await client.query(`
            INSERT INTO order_images (order_id, image_url, image_name, image_type, sort_order)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            newOrderId, 
            imageUrl,
            imageName,
            imageType,
            i
          ]);
        }
      }

      await client.query('COMMIT');
      return newOrderId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 更新订单
  async update(orderId, updateData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let paramIndex = 1;

      // 动态构建更新字段
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && key !== 'images') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(updateData[key]);
          paramIndex++;
        }
      });

      if (fields.length === 0 && !updateData.images) {
        throw new Error('没有要更新的字段');
      }

      let updatedOrder = null;

      if (fields.length > 0) {
        fields.push(`updated_at = NOW()`);
        values.push(orderId);

        const query = `
          UPDATE orders 
          SET ${fields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        const result = await client.query(query, values);
        updatedOrder = result.rows[0];
      }

      // 处理图片更新
      if (updateData.images !== undefined) {
        // 删除原有图片
        await client.query('DELETE FROM order_images WHERE order_id = $1', [orderId]);
        
        // 添加新图片
        if (updateData.images.length > 0) {
          for (let i = 0; i < updateData.images.length; i++) {
            const image = updateData.images[i];
            
            // 🆕 处理不同的图片数据格式
            let imageUrl, imageName, imageType;
            
            if (typeof image === 'string') {
              // 如果是字符串，假设是URL
              imageUrl = image;
              imageName = `image_${i + 1}`;
              imageType = 'proof';
            } else if (image && typeof image === 'object') {
              // 如果是对象，提取相应字段
              imageUrl = image.url || image.image_url;
              imageName = image.name || image.image_name || `image_${i + 1}`;
              imageType = image.type || image.image_type || 'proof';
            } else {
              console.warn('无效的图片数据格式:', image);
              continue;
            }
            
            if (!imageUrl) {
              console.warn('图片URL为空，跳过:', image);
              continue;
            }
            
            await client.query(`
              INSERT INTO order_images (order_id, image_url, image_name, image_type, sort_order)
              VALUES ($1, $2, $3, $4, $5)
            `, [
              orderId, 
              imageUrl,
              imageName,
              imageType,
              i
            ]);
          }
        }
      }

      await client.query('COMMIT');
      return updatedOrder || await this.findById(orderId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 删除订单（软删除）
  async delete(orderId) {
    const query = `
      UPDATE orders 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await pool.query(query, [orderId]);
    return result.rows[0];
  }

  // 获取订单统计
  async getStats(companyId = null, storeId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN order_type = '剧本杀' THEN 1 END) as script_orders,
        COUNT(CASE WHEN order_type = '密室' THEN 1 END) as escape_room_orders,
        SUM(CASE WHEN payment_status = 'FULL' THEN total_amount ELSE 0 END) as total_revenue,
        AVG(total_amount) as avg_order_amount
      FROM orders 
      WHERE is_active = true
    `;

    const params = [];
    let paramIndex = 1;

    if (companyId) {
      query += ` AND company_id = $${paramIndex}`;
      params.push(companyId);
      paramIndex++;
    }

    if (storeId) {
      query += ` AND store_id = $${paramIndex}`;
      params.push(storeId);
      paramIndex++;
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  // 获取订单配置
  async getConfigs(companyId, configType = null) {
    let query = `
      SELECT * FROM order_configs 
      WHERE company_id = $1 AND is_active = true
    `;
    
    const params = [companyId];

    if (configType) {
      query += ` AND config_type = $2`;
      params.push(configType);
    }

    query += ` ORDER BY sort_order ASC, config_key ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // 批量更新状态
  async batchUpdateStatus(orderIds, status, companyId) {
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = NOW()
      WHERE id = ANY($2) AND company_id = $3
      RETURNING id, status
    `;

    const result = await pool.query(query, [status, orderIds, companyId]);
    return result.rows;
  }

  // 获取门店可用资源（剧本、密室、房间、用户）
  async getStoreResources(storeId) {
    const client = await pool.connect();
    
    try {
      // 获取门店信息
      const storeQuery = `SELECT * FROM store WHERE id = $1`;
      const storeResult = await client.query(storeQuery, [storeId]);
      const store = storeResult.rows[0];

      if (!store) {
        throw new Error('门店不存在');
      }

      // 获取可用剧本
      const scriptsQuery = `
        SELECT sc.*, ss.store_price 
        FROM scripts sc
        INNER JOIN store_scripts ss ON sc.id = ss.script_id
        WHERE ss.store_id = $1 AND sc.is_active = true AND ss.is_available = true
        ORDER BY ss.sort_order ASC, sc.name ASC
      `;
      const scriptsResult = await client.query(scriptsQuery, [storeId]);

      // 获取可用密室
      const escapeRoomsQuery = `
        SELECT er.*, ser.store_price
        FROM escape_rooms er
        INNER JOIN store_escape_rooms ser ON er.id = ser.escape_room_id
        WHERE ser.store_id = $1 AND er.is_active = true AND ser.is_available = true
        ORDER BY ser.sort_order ASC, er.name ASC
      `;
      const escapeRoomsResult = await client.query(escapeRoomsQuery, [storeId]);

      // 获取可用房间（包含图片信息，过滤关闭状态的房间）
      const roomsQuery = `
        SELECT r.*, 
          COALESCE(
            ARRAY_AGG(
              CASE WHEN ri.id IS NOT NULL THEN
                ri.image_url
              END
              ORDER BY ri.sort_order ASC, ri.created_at ASC
            ) FILTER (WHERE ri.id IS NOT NULL), 
            '{}'::text[]
          ) as images,
          (SELECT ri2.image_url FROM room_images ri2 WHERE ri2.room_id = r.id AND ri2.is_primary = true LIMIT 1) as primary_image
        FROM rooms r
        LEFT JOIN room_images ri ON r.id = ri.room_id
        WHERE r.store_id = $1 AND r.is_active = true AND r.status != '关闭'
        GROUP BY r.id
        ORDER BY r.name ASC
      `;
      const roomsResult = await client.query(roomsQuery, [storeId]);

      // 获取公司用户（可作为主持人、NPC等）
      const usersQuery = `
        SELECT u.* FROM users u
        INNER JOIN user_stores us ON u.id = us.user_id
        WHERE us.store_id = $1 AND u.is_active = true
        ORDER BY u.name ASC
      `;
      const usersResult = await client.query(usersQuery, [storeId]);

      // 🔧 处理密室数据的 JSON 字段
      const processedEscapeRooms = escapeRoomsResult.rows.map(escapeRoom => {
        // 处理 supported_languages 字段
        let supportedLanguages = [];
        if (escapeRoom.supported_languages) {
          if (typeof escapeRoom.supported_languages === 'string') {
            try {
              supportedLanguages = JSON.parse(escapeRoom.supported_languages);
            } catch (e) {
              console.warn('解析密室语言失败:', e);
              supportedLanguages = ['IND'];
            }
          } else if (Array.isArray(escapeRoom.supported_languages)) {
            supportedLanguages = escapeRoom.supported_languages;
          }
        }
        if (!supportedLanguages || supportedLanguages.length === 0) {
          supportedLanguages = ['IND'];
        }

        // 处理 cover_images 字段
        let coverImages = [];
        if (escapeRoom.cover_images) {
          if (typeof escapeRoom.cover_images === 'string') {
            try {
              coverImages = JSON.parse(escapeRoom.cover_images);
            } catch (e) {
              console.warn('解析密室图片失败:', e);
              coverImages = [];
            }
          } else if (Array.isArray(escapeRoom.cover_images)) {
            coverImages = escapeRoom.cover_images;
          }
        }

        // 处理 npc_roles 字段
        let npcRoles = [];
        if (escapeRoom.npc_roles) {
          if (typeof escapeRoom.npc_roles === 'string') {
            try {
              npcRoles = JSON.parse(escapeRoom.npc_roles);
            } catch (e) {
              console.warn('解析密室NPC角色失败:', e);
              npcRoles = [];
            }
          } else if (Array.isArray(escapeRoom.npc_roles)) {
            npcRoles = escapeRoom.npc_roles;
          }
        }

        return {
          ...escapeRoom,
          supported_languages: supportedLanguages,
          cover_images: coverImages,
          npc_roles: npcRoles
        };
      });

      // 🔧 处理剧本数据的 JSON 字段
      const processedScripts = scriptsResult.rows.map(script => {
        // 处理 supported_languages 字段
        let supportedLanguages = [];
        if (script.supported_languages) {
          if (typeof script.supported_languages === 'string') {
            try {
              supportedLanguages = JSON.parse(script.supported_languages);
            } catch (e) {
              console.warn('解析剧本语言失败:', e);
              supportedLanguages = ['IND'];
            }
          } else if (Array.isArray(script.supported_languages)) {
            supportedLanguages = script.supported_languages;
          }
        }
        if (!supportedLanguages || supportedLanguages.length === 0) {
          supportedLanguages = ['IND'];
        }

        // 处理 images 字段
        let images = [];
        if (script.images) {
          if (typeof script.images === 'string') {
            try {
              images = JSON.parse(script.images);
            } catch (e) {
              console.warn('解析剧本图片失败:', e);
              images = [];
            }
          } else if (Array.isArray(script.images)) {
            images = script.images;
          }
        }

        // 处理 tags 字段
        let tags = [];
        if (script.tags) {
          if (typeof script.tags === 'string') {
            try {
              tags = JSON.parse(script.tags);
            } catch (e) {
              console.warn('解析剧本标签失败:', e);
              tags = [];
            }
          } else if (Array.isArray(script.tags)) {
            tags = script.tags;
          }
        }

        return {
          ...script,
          supported_languages: supportedLanguages,
          images: images,
          tags: tags
        };
      });

      return {
        store: store,
        scripts: processedScripts,
        escape_rooms: processedEscapeRooms,
        rooms: roomsResult.rows,
        users: usersResult.rows
      };
    } finally {
      client.release();
    }
  }

  // 🆕 根据日期获取房间占用情况
  async getRoomOccupancyByDate(roomId, date) {
    const query = `
      SELECT o.*, 
        o.customer_name,
        o.start_time,
        o.end_time,
        o.order_type,
        o.status,
        sc.name as script_name,
        sc.supported_languages as script_supported_languages,
        er.name as escape_room_name,
        er.supported_languages as escape_room_supported_languages
      FROM orders o
      LEFT JOIN scripts sc ON o.script_id = sc.id
      LEFT JOIN escape_rooms er ON o.escape_room_id = er.id
      WHERE o.room_id = $1 
        AND o.order_date = $2 
        AND o.is_active = true
        AND o.status NOT IN ('cancelled')
      ORDER BY o.start_time ASC
    `;
    
    const result = await pool.query(query, [roomId, date]);
    return result.rows;
  }

  // 🆕 检查特定时间段房间占用
  async checkRoomTimeSlot(roomId, date, startTime, endTime) {
    const query = `
      SELECT o.*, 
        o.customer_name,
        o.start_time,
        o.end_time,
        o.order_type,
        o.status,
        sc.name as script_name,
        sc.supported_languages as script_supported_languages,
        er.name as escape_room_name,
        er.supported_languages as escape_room_supported_languages
      FROM orders o
      LEFT JOIN scripts sc ON o.script_id = sc.id
      LEFT JOIN escape_rooms er ON o.escape_room_id = er.id
      WHERE o.room_id = $1 
        AND o.order_date = $2 
        AND o.is_active = true
        AND o.status NOT IN ('cancelled')
        AND (
          (o.start_time < $4 AND o.end_time > $3) OR
          (o.start_time >= $3 AND o.start_time < $4) OR
          (o.end_time > $3 AND o.end_time <= $4)
        )
      ORDER BY o.start_time ASC
    `;
    
    const result = await pool.query(query, [roomId, date, startTime, endTime]);
    return {
      room_id: roomId,
      date: date,
      time_slot: `${startTime} - ${endTime}`,
      is_occupied: result.rows.length > 0,
      occupying_orders: result.rows
    };
  }

  // 🆕 检查房间时间冲突
  async checkRoomTimeConflicts(roomId, date, startTime, endTime, excludeOrderId = null) {
    let query = `
      SELECT o.id, o.customer_name, o.start_time, o.end_time, o.order_type, o.status,
        sc.name as script_name,
        sc.supported_languages as script_supported_languages,
        er.name as escape_room_name,
        er.supported_languages as escape_room_supported_languages
      FROM orders o
      LEFT JOIN scripts sc ON o.script_id = sc.id
      LEFT JOIN escape_rooms er ON o.escape_room_id = er.id
      WHERE o.room_id = $1 
        AND o.order_date = $2 
        AND o.is_active = true
        AND o.status NOT IN ('cancelled')
        AND (
          (o.start_time < $4 AND o.end_time > $3) OR
          (o.start_time >= $3 AND o.start_time < $4) OR
          (o.end_time > $3 AND o.end_time <= $4)
        )
    `;
    
    const params = [roomId, date, startTime, endTime];
    
    // 如果需要排除特定订单（通常用于编辑时）
    if (excludeOrderId) {
      query += ` AND o.id != $5`;
      params.push(excludeOrderId);
    }
    
    query += ` ORDER BY o.start_time ASC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 🆕 获取增强的门店资源（包含更多统计信息）
  async getEnhancedStoreResources(storeId, options = {}) {
    const client = await pool.connect();
    
    try {
      // 获取基础门店资源
      const basicResources = await this.getStoreResources(storeId);
      
      // 如果需要房间使用统计
      if (options.includeRoomStats) {
        for (let room of basicResources.rooms) {
          // 获取今天的占用情况
          const today = new Date().toISOString().split('T')[0];
          room.today_occupancy = await this.getRoomOccupancyByDate(room.id, today);
          
          // 获取本周的使用次数
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          
          const weekStatsQuery = `
            SELECT COUNT(*) as week_bookings
            FROM orders 
            WHERE room_id = $1 
              AND order_date >= $2 
              AND order_date <= $3
              AND is_active = true
              AND status NOT IN ('cancelled')
          `;
          
          const weekStatsResult = await client.query(weekStatsQuery, [
            room.id, 
            weekStart.toISOString().split('T')[0],
            weekEnd.toISOString().split('T')[0]
          ]);
          
          room.week_bookings = parseInt(weekStatsResult.rows[0].week_bookings) || 0;
        }
      }
      
      return basicResources;
    } finally {
      client.release();
    }
  }
}

module.exports = new OrderModel(); 