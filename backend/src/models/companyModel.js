const pool = require('../database/connection');

class CompanyModel {
  // 创建公司
  async create(companyData) {
    const { name, type, contact_name, contact_phone, contact_email } = companyData;
    
    const query = `
      INSERT INTO company (name, type, contact_name, contact_phone, contact_email)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, type, contact_name, contact_phone, contact_email]);
    return result.rows[0];
  }

  // 查询所有公司（带统计信息）
  async findAllWithStats() {
    const query = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM store WHERE company_id = c.id) as store_count,
        (SELECT COUNT(*) FROM users WHERE company_id = c.id) as user_count
      FROM company c
      ORDER BY c.created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  // 根据ID查询公司（带统计信息）
  async findByIdWithStats(companyId) {
    const query = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM store WHERE company_id = c.id) as store_count,
        (SELECT COUNT(*) FROM users WHERE company_id = c.id) as user_count
      FROM company c
      WHERE c.id = $1
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // 根据ID查询公司基础信息
  async findById(companyId) {
    const query = 'SELECT * FROM company WHERE id = $1';
    const result = await pool.query(query, [companyId]);
    return result.rows[0] || null;
  }

  // 更新公司信息
  async update(companyId, updateData) {
    const { name, contact_name, contact_phone, contact_email, status } = updateData;
    
    const query = `
      UPDATE company 
      SET name = $1, 
          contact_name = $2, 
          contact_phone = $3, 
          contact_email = $4, 
          status = $5, 
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, contact_name, contact_phone, contact_email, status, companyId]);
    return result.rows[0];
  }

  // 🆕 删除公司（软删除，设置为禁用状态）
  async delete(companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 检查是否有关联的门店
      const storeCheck = await client.query(
        'SELECT COUNT(*) as count FROM store WHERE company_id = $1',
        [companyId]
      );
      
      if (parseInt(storeCheck.rows[0].count) > 0) {
        throw new Error('该公司下还有门店，无法删除');
      }

      // 检查是否有关联的用户
      const userCheck = await client.query(
        'SELECT COUNT(*) as count FROM users WHERE company_id = $1',
        [companyId]
      );
      
      if (parseInt(userCheck.rows[0].count) > 0) {
        throw new Error('该公司下还有用户，无法删除');
      }

      // 软删除：设置状态为禁用
      const result = await client.query(`
        UPDATE company 
        SET status = 'inactive', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [companyId]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 🆕 检查公司是否存在
  async exists(companyId) {
    const query = 'SELECT EXISTS(SELECT 1 FROM company WHERE id = $1)';
    const result = await pool.query(query, [companyId]);
    return result.rows[0].exists;
  }
}

module.exports = new CompanyModel(); 