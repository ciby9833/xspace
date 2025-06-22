const pool = require('../database/connection');

class PermissionModel {
  // 获取所有权限模块
  async getAllModules() {
    const query = `
      SELECT id, name, display_name, description, sort_order, is_active
      FROM permission_modules
      WHERE is_active = true
      ORDER BY sort_order ASC, display_name ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // 获取模块下的权限
  async getPermissionsByModule(moduleId = null) {
    let query = `
      SELECT p.id, p.name, p.display_name, p.description, p.permission_key, 
             p.sort_order, p.is_active,
             pm.name as module_name, pm.display_name as module_display_name
      FROM permissions p
      JOIN permission_modules pm ON p.module_id = pm.id
      WHERE p.is_active = true AND pm.is_active = true
    `;
    
    const params = [];
    if (moduleId) {
      query += ' AND p.module_id = $1';
      params.push(moduleId);
    }
    
    query += ' ORDER BY pm.sort_order ASC, p.sort_order ASC, p.display_name ASC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 获取所有权限（分组）
  async getAllPermissionsGrouped() {
    const query = `
      SELECT 
        pm.id as module_id,
        pm.name as module_name,
        pm.display_name as module_display_name,
        pm.description as module_description,
        pm.sort_order as module_sort_order,
        json_agg(
          json_build_object(
            'id', p.id,
            'name', p.name,
            'display_name', p.display_name,
            'description', p.description,
            'permission_key', p.permission_key,
            'sort_order', p.sort_order
          ) ORDER BY p.sort_order ASC, p.display_name ASC
        ) as permissions
      FROM permission_modules pm
      LEFT JOIN permissions p ON pm.id = p.module_id AND p.is_active = true
      WHERE pm.is_active = true
      GROUP BY pm.id, pm.name, pm.display_name, pm.description, pm.sort_order
      ORDER BY pm.sort_order ASC, pm.display_name ASC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  // 获取角色列表（基于用户层级和归属关系）
  async getRolesByCompany(companyId, userAccountLevel = 'store', userId = null) {
    let query;
    let params = [];
    
    if (userAccountLevel === 'platform') {
      // 平台级用户可以看到：
      // 1. 平台级角色（不归属任何公司）
      // 2. 如果指定了公司ID，则显示该公司的角色
      if (companyId) {
        query = `
          SELECT r.id, r.name, r.display_name, r.description, r.role_level, r.is_system_role, 
                 r.is_active, r.created_at, r.company_id, r.created_by,
                 c.name as company_name,
                 u.name as created_by_username
          FROM roles r
          LEFT JOIN company c ON r.company_id = c.id
          LEFT JOIN users u ON r.created_by = u.id
          WHERE r.is_active = true AND (r.company_id = $1 OR r.company_id IS NULL)
          ORDER BY 
            CASE r.role_level WHEN 'platform' THEN 1 WHEN 'company' THEN 2 WHEN 'store' THEN 3 END,
            r.company_id NULLS FIRST,
            r.is_system_role DESC, 
            r.display_name ASC
        `;
        params = [companyId];
      } else {
        // 显示所有平台级角色
        query = `
          SELECT r.id, r.name, r.display_name, r.description, r.role_level, r.is_system_role, 
                 r.is_active, r.created_at, r.company_id, r.created_by,
                 c.name as company_name,
                 u.name as created_by_username
          FROM roles r
          LEFT JOIN company c ON r.company_id = c.id
          LEFT JOIN users u ON r.created_by = u.id
          WHERE r.is_active = true AND r.role_level = 'platform'
          ORDER BY r.is_system_role DESC, r.display_name ASC
        `;
      }
    } else if (userAccountLevel === 'company') {
      // 公司级用户只能看到本公司创建的角色（公司级和门店级）
      query = `
        SELECT r.id, r.name, r.display_name, r.description, r.role_level, r.is_system_role, 
               r.is_active, r.created_at, r.company_id, r.created_by,
               c.name as company_name,
               u.name as created_by_username
        FROM roles r
        LEFT JOIN company c ON r.company_id = c.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.company_id = $1 AND r.role_level IN ('company', 'store') AND r.is_active = true
        ORDER BY 
          CASE r.role_level WHEN 'company' THEN 1 WHEN 'store' THEN 2 END,
          r.is_system_role DESC, 
          r.display_name ASC
      `;
      params = [companyId];
    } else {
      // 门店级用户只能看到本公司的门店级角色
      query = `
        SELECT r.id, r.name, r.display_name, r.description, r.role_level, r.is_system_role, 
               r.is_active, r.created_at, r.company_id, r.created_by,
               c.name as company_name,
               u.name as created_by_username
        FROM roles r
        LEFT JOIN company c ON r.company_id = c.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.company_id = $1 AND r.role_level = 'store' AND r.is_active = true
        ORDER BY r.is_system_role DESC, r.display_name ASC
      `;
      params = [companyId];
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 获取所有角色（平台管理员专用）
  async getAllRoles() {
    const query = `
      SELECT r.id, r.name, r.display_name, r.description, r.is_system_role, 
             r.is_active, r.created_at, r.company_id,
             c.name as company_name
      FROM roles r
      LEFT JOIN company c ON r.company_id = c.id
      WHERE r.is_active = true
      ORDER BY r.company_id NULLS FIRST, r.is_system_role DESC, r.display_name ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // 获取角色权限
  async getRolePermissions(roleId) {
    const query = `
      SELECT 
        p.id,
        p.permission_key,
        p.display_name,
        p.description,
        pm.name as module_name,
        pm.display_name as module_display_name,
        rpa.granted
      FROM role_permission_assignments rpa
      JOIN permissions p ON rpa.permission_id = p.id
      JOIN permission_modules pm ON p.module_id = pm.id
      WHERE rpa.role_id = $1 AND p.is_active = true AND pm.is_active = true
      ORDER BY pm.sort_order ASC, p.sort_order ASC
    `;
    const result = await pool.query(query, [roleId]);
    return result.rows;
  }

  // 获取用户权限（通过角色）
  async getUserPermissions(userId) {
    const query = `
      SELECT DISTINCT p.permission_key
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN role_permission_assignments rpa ON r.id = rpa.role_id
      JOIN permissions p ON rpa.permission_id = p.id
      WHERE u.id = $1 AND rpa.granted = true 
        AND u.is_active = true AND r.is_active = true 
        AND p.is_active = true
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.map(row => row.permission_key);
  }

  // 创建角色（支持角色层级和创建者追踪）
  async createRole(companyId, roleData, createdBy = null) {
    const { name, display_name, description, role_level = 'store' } = roleData;
    
    // 根据角色层级确定company_id
    const finalCompanyId = role_level === 'platform' ? null : companyId;
    
    const query = `
      INSERT INTO roles (company_id, name, display_name, description, role_level, is_system_role, created_by)
      VALUES ($1, $2, $3, $4, $5, false, $6)
      RETURNING id, name, display_name, description, role_level, is_system_role, created_at, created_by, company_id
    `;
    const result = await pool.query(query, [finalCompanyId, name, display_name, description, role_level, createdBy]);
    return result.rows[0];
  }

  // 更新角色
  async updateRole(roleId, roleData) {
    const { display_name, description } = roleData;
    const query = `
      UPDATE roles 
      SET display_name = $1, description = $2, updated_at = NOW()
      WHERE id = $3 AND is_system_role = false
      RETURNING id, name, display_name, description, is_system_role, updated_at
    `;
    const result = await pool.query(query, [display_name, description, roleId]);
    return result.rows[0];
  }

  // 删除角色（支持平台管理员跨公司删除）
  async deleteRole(roleId, companyId = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 检查是否是系统角色
      let roleCheck;
      if (companyId) {
        roleCheck = await client.query(
          'SELECT is_system_role, name FROM roles WHERE id = $1 AND company_id = $2',
          [roleId, companyId]
        );
      } else {
        // 平台管理员可以删除任意公司的角色
        roleCheck = await client.query(
          'SELECT is_system_role, name FROM roles WHERE id = $1',
          [roleId]
        );
      }
      
      if (roleCheck.rows.length === 0) {
        throw new Error('角色不存在或无权限访问');
      }

      const role = roleCheck.rows[0];
      
      // 保护系统角色和管理员角色
      if (role.is_system_role || 
          ['平台管理员', '公司管理员', 'admin'].includes(role.name)) {
        throw new Error('系统角色和管理员角色不能删除');
      }

      // 检查是否有用户使用此角色
      const userCheck = await client.query(
        'SELECT COUNT(*) as count FROM users WHERE role_id = $1',
        [roleId]
      );
      
      if (parseInt(userCheck.rows[0].count) > 0) {
        throw new Error('角色正在使用中，无法删除');
      }

      // 删除角色权限分配
      await client.query('DELETE FROM role_permission_assignments WHERE role_id = $1', [roleId]);
      
      // 删除角色
      await client.query('DELETE FROM roles WHERE id = $1', [roleId]);
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 分配权限给角色
  async assignPermissionsToRole(roleId, permissionIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 清除现有权限
      await client.query('DELETE FROM role_permission_assignments WHERE role_id = $1', [roleId]);

      // 分配新权限
      if (permissionIds && permissionIds.length > 0) {
        const values = permissionIds.map((permId, index) => 
          `($1, $${index + 2}, true)`
        ).join(',');
        
        const query = `
          INSERT INTO role_permission_assignments (role_id, permission_id, granted)
          VALUES ${values}
        `;
        
        await client.query(query, [roleId, ...permissionIds]);
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 更新用户角色
  async updateUserRole(userId, roleId) {
    const query = `
      UPDATE users 
      SET role_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, role_id
    `;
    const result = await pool.query(query, [roleId, userId]);
    return result.rows[0];
  }

  // 获取权限详情
  async getPermissionById(permissionId) {
    const query = `
      SELECT p.*, pm.name as module_name, pm.display_name as module_display_name
      FROM permissions p
      JOIN permission_modules pm ON p.module_id = pm.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [permissionId]);
    return result.rows[0];
  }

  // 获取角色详情（支持角色层级检查和创建者信息）
  async getRoleById(roleId, companyId = null, userAccountLevel = 'store') {
    let query;
    let params = [roleId];
    
    if (userAccountLevel === 'platform') {
      // 平台级用户可以访问所有层级角色
      query = `
        SELECT r.id, r.company_id, r.name, r.display_name, r.description, r.role_level, 
               r.is_system_role, r.is_active, r.created_at, r.created_by,
               c.name as company_name,
               u.name as created_by_username
        FROM roles r
        LEFT JOIN company c ON r.company_id = c.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.id = $1
      `;
    } else if (userAccountLevel === 'company') {
      // 公司级用户可以访问本公司的公司级和门店级角色
      query = `
        SELECT r.id, r.company_id, r.name, r.display_name, r.description, r.role_level, 
               r.is_system_role, r.is_active, r.created_at, r.created_by,
               c.name as company_name,
               u.name as created_by_username
        FROM roles r
        LEFT JOIN company c ON r.company_id = c.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.id = $1 AND r.company_id = $2 AND r.role_level IN ('company', 'store')
      `;
      params.push(companyId);
    } else {
      // 门店级用户只能访问本公司的门店级角色
      query = `
        SELECT r.id, r.company_id, r.name, r.display_name, r.description, r.role_level, 
               r.is_system_role, r.is_active, r.created_at, r.created_by,
               c.name as company_name,
               u.name as created_by_username
        FROM roles r
        LEFT JOIN company c ON r.company_id = c.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.id = $1 AND r.company_id = $2 AND r.role_level = 'store'
      `;
      params.push(companyId);
    }
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  // 检查权限是否存在
  async checkPermissionExists(permissionKey) {
    const query = 'SELECT id FROM permissions WHERE permission_key = $1 AND is_active = true';
    const result = await pool.query(query, [permissionKey]);
    return result.rows.length > 0;
  }

  // 批量创建权限
  async createPermissions(permissions) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const perm of permissions) {
        const { module_id, name, display_name, description, permission_key } = perm;
        
        const query = `
          INSERT INTO permissions (module_id, name, display_name, description, permission_key)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (permission_key) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description
          RETURNING id, permission_key
        `;
        
        const result = await client.query(query, [module_id, name, display_name, description, permission_key]);
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 获取用户统计信息（按公司或全平台）
  async getUserStatsByCompany(companyId = null) {
    let query, params = [];
    
    if (companyId) {
      // 公司级统计
      query = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
          COUNT(CASE WHEN role = 'supervisor' THEN 1 END) as supervisors,
          COUNT(CASE WHEN role = 'manager' THEN 1 END) as managers,
          COUNT(CASE WHEN role = 'service' THEN 1 END) as services,
          COUNT(CASE WHEN role = 'host' THEN 1 END) as hosts
        FROM users 
        WHERE company_id = $1
      `;
      params = [companyId];
    } else {
      // 平台级统计
      query = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN role = '平台管理员' THEN 1 END) as platform_admins,
          COUNT(CASE WHEN role = '公司管理员' THEN 1 END) as company_admins,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
          COUNT(DISTINCT company_id) as total_companies
        FROM users
      `;
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }
}

module.exports = new PermissionModel(); 