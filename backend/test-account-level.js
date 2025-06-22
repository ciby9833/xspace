require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// 测试账户层级功能
async function testAccountLevelSystem() {
  console.log('🧪 开始测试账户层级系统...\n');

  try {
    // 1. 平台管理员登录
    console.log('1️⃣ 平台管理员登录...');
    const platformLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@platform.com',
      password: 'admin123'
    });
    
    const platformToken = platformLogin.data.data.token;
    const platformUser = platformLogin.data.data.user;
    
    console.log('✅ 平台管理员登录成功');
    console.log(`   用户: ${platformUser.name} (${platformUser.role})`);
    console.log(`   账户层级: ${platformUser.account_level || '未设置'}`);
    console.log(`   管理范围: ${platformUser.management_scope}`);
    
    // 2. 测试平台管理员创建公司账户
    console.log('\n2️⃣ 测试平台管理员创建公司账户...');
    
    // 首先获取可用公司列表
    const companiesResponse = await axios.get(`${API_BASE}/users/available-companies`, {
      headers: { Authorization: `Bearer ${platformToken}` }
    });
    
    const companies = companiesResponse.data.data;
    if (companies.length === 0) {
      console.log('❌ 没有可用的公司');
      return;
    }
    
    const testCompany = companies[0];
    console.log(`   目标公司: ${testCompany.name} (${testCompany.id})`);
    
    const companyUserData = {
      name: '公司管理员测试',
      email: 'company.admin.test@example.com',
      phone: '081234567890',
      role: 'admin',
      account_level: 'company',
      company_id: testCompany.id
    };
    
    const createCompanyUser = await axios.post(`${API_BASE}/users`, companyUserData, {
      headers: { Authorization: `Bearer ${platformToken}` }
    });
    
    console.log('✅ 公司账户创建成功');
    console.log(`   用户: ${createCompanyUser.data.data.name}`);
    console.log(`   账户层级: ${createCompanyUser.data.data.account_level}`);
    
    // 3. 公司管理员登录
    console.log('\n3️⃣ 公司管理员登录...');
    
    // 先设置密码（实际应用中应该通过邮件重置）
    const tempPassword = 'temp123456';
    
    const companyLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: companyUserData.email,
      password: tempPassword
    });
    
    const companyToken = companyLogin.data.data.token;
    const companyUser = companyLogin.data.data.user;
    
    console.log('✅ 公司管理员登录成功');
    console.log(`   用户: ${companyUser.name} (${companyUser.role})`);
    console.log(`   账户层级: ${companyUser.account_level || '未设置'}`);
    
    // 4. 测试公司管理员创建门店账户
    console.log('\n4️⃣ 测试公司管理员创建门店账户...');
    
    const storeUserData = {
      name: '门店员工测试',
      email: 'store.staff.test@example.com',
      phone: '081234567891',
      role: 'service',
      account_level: 'store'
    };
    
    const createStoreUser = await axios.post(`${API_BASE}/users`, storeUserData, {
      headers: { Authorization: `Bearer ${companyToken}` }
    });
    
    console.log('✅ 门店账户创建成功');
    console.log(`   用户: ${createStoreUser.data.data.name}`);
    console.log(`   账户层级: ${createStoreUser.data.data.account_level}`);
    
    // 5. 测试权限检查
    console.log('\n5️⃣ 测试权限检查...');
    
    // 测试公司管理员尝试创建平台账户（应该失败）
    try {
      const invalidUserData = {
        name: '无效平台账户',
        email: 'invalid.platform@example.com',
        role: 'superadmin',
        account_level: 'platform'
      };
      
      await axios.post(`${API_BASE}/users`, invalidUserData, {
        headers: { Authorization: `Bearer ${companyToken}` }
      });
      
      console.log('❌ 权限检查失败：公司管理员不应该能创建平台账户');
    } catch (error) {
      console.log('✅ 权限检查正常：公司管理员无法创建平台账户');
      console.log(`   错误信息: ${error.response?.data?.error || error.message}`);
    }
    
    // 6. 测试数据范围
    console.log('\n6️⃣ 测试数据范围...');
    
    // 平台管理员查看所有用户
    const allUsers = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${platformToken}` }
    });
    
    console.log(`✅ 平台管理员可查看 ${allUsers.data.data.length} 个用户`);
    
    // 公司管理员查看公司用户
    const companyUsers = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${companyToken}` }
    });
    
    console.log(`✅ 公司管理员可查看 ${companyUsers.data.data.length} 个用户`);
    
    // 7. 测试可创建的账户层级
    console.log('\n7️⃣ 测试可创建的账户层级...');
    
    // 平台管理员获取可创建层级
    const platformLevels = await axios.get(`${API_BASE}/users/creatable-account-levels`, {
      headers: { Authorization: `Bearer ${platformToken}` }
    });
    
    console.log('✅ 平台管理员可创建层级:');
    console.log(`   当前层级: ${platformLevels.data.data.current_level}`);
    console.log(`   可创建层级: ${platformLevels.data.data.creatable_levels.join(', ')}`);
    
    // 公司管理员获取可创建层级
    const companyLevels = await axios.get(`${API_BASE}/users/creatable-account-levels`, {
      headers: { Authorization: `Bearer ${companyToken}` }
    });
    
    console.log('✅ 公司管理员可创建层级:');
    console.log(`   当前层级: ${companyLevels.data.data.current_level}`);
    console.log(`   可创建层级: ${companyLevels.data.data.creatable_levels.join(', ')}`);
    
    console.log('\n🎉 账户层级系统测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
if (require.main === module) {
  testAccountLevelSystem();
}

module.exports = { testAccountLevelSystem }; 