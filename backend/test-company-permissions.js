/**
 * 测试公司管理权限功能
 * 验证权限分组系统下的公司管理功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试用户凭据
const TEST_USERS = {
  platform_admin: {
    email: 'admin@platform.com',
    password: 'password'
  },
  company_admin: {
    email: 'admin@company1.com', 
    password: 'password'
  },
  store_user: {
    email: 'user@store1.com',
    password: 'password'
  }
};

let tokens = {};

// 登录获取token
async function login(userType) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USERS[userType]);
    if (response.data.success) {
      tokens[userType] = response.data.data.token;
      console.log(`✅ ${userType} 登录成功`);
      
      // 显示用户权限信息
      const permissions = response.data.data.user.permissions || [];
      const companyPermissions = permissions.filter(p => p.startsWith('company.'));
      console.log(`   权限: [${companyPermissions.join(', ')}]`);
      
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ ${userType} 登录失败:`, error.response?.data?.error || error.message);
    return false;
  }
}

// 创建请求配置
function getConfig(userType) {
  return {
    headers: {
      'Authorization': `Bearer ${tokens[userType]}`
    }
  };
}

// 测试获取公司列表
async function testGetCompanyList(userType) {
  try {
    console.log(`\n🧪 测试 ${userType} 获取公司列表`);
    const response = await axios.get(`${BASE_URL}/company`, getConfig(userType));
    
    if (response.data.success) {
      const companies = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
      console.log(`✅ 成功获取 ${companies.length} 个公司`);
      companies.forEach(company => {
        console.log(`   - ${company.name} (ID: ${company.id})`);
      });
      return companies;
    }
  } catch (error) {
    console.error(`❌ 获取公司列表失败:`, error.response?.data?.error || error.message);
    return [];
  }
}

// 测试创建公司
async function testCreateCompany(userType) {
  try {
    console.log(`\n🧪 测试 ${userType} 创建公司`);
    
    const companyData = {
      name: `测试公司-${Date.now()}`,
      type: '直营',
      contact_name: '测试联系人',
      contact_phone: '+628123456789',
      contact_email: `test${Date.now()}@example.com`,
      admin_name: '公司管理员',
      admin_email: `admin${Date.now()}@example.com`,
      admin_password: 'password'
    };
    
    const response = await axios.post(`${BASE_URL}/company`, companyData, getConfig(userType));
    
    if (response.data.success) {
      console.log(`✅ 成功创建公司: ${response.data.data.company.name}`);
      return response.data.data.company;
    }
  } catch (error) {
    console.error(`❌ 创建公司失败:`, error.response?.data?.error || error.message);
    return null;
  }
}

// 测试更新公司
async function testUpdateCompany(userType, companyId) {
  try {
    console.log(`\n🧪 测试 ${userType} 更新公司 ID: ${companyId}`);
    
    const updateData = {
      name: `更新的公司名称-${Date.now()}`,
      contact_name: '更新的联系人',
      contact_phone: '+628987654321',
      contact_email: 'updated@example.com',
      status: 'active'
    };
    
    const response = await axios.put(`${BASE_URL}/company/${companyId}`, updateData, getConfig(userType));
    
    if (response.data.success) {
      console.log(`✅ 成功更新公司: ${response.data.data.name}`);
      return response.data.data;
    }
  } catch (error) {
    console.error(`❌ 更新公司失败:`, error.response?.data?.error || error.message);
    return null;
  }
}

// 测试删除公司
async function testDeleteCompany(userType, companyId) {
  try {
    console.log(`\n🧪 测试 ${userType} 删除公司 ID: ${companyId}`);
    
    const response = await axios.delete(`${BASE_URL}/company/${companyId}`, getConfig(userType));
    
    if (response.data.success) {
      console.log(`✅ 成功删除公司`);
      return true;
    }
  } catch (error) {
    console.error(`❌ 删除公司失败:`, error.response?.data?.error || error.message);
    return false;
  }
}

// 测试权限分组继承
async function testPermissionInheritance() {
  console.log('\n🔍 测试权限分组继承效果');
  
  // 测试用户管理权限是否自动获得company.view权限
  try {
    const response = await axios.get(`${BASE_URL}/permissions/groups`, getConfig('platform_admin'));
    if (response.data.success) {
      const groups = response.data.data;
      const userManagementGroup = groups.find(g => g.key === 'user_management');
      
      if (userManagementGroup && userManagementGroup.auto_permissions.includes('company.view')) {
        console.log('✅ 用户管理权限分组包含 company.view 自动继承');
      }
      
      const storeManagementGroup = groups.find(g => g.key === 'store_management');
      if (storeManagementGroup && storeManagementGroup.auto_permissions.includes('company.view')) {
        console.log('✅ 门店管理权限分组包含 company.view 自动继承');
      }
    }
  } catch (error) {
    console.error('❌ 获取权限分组失败:', error.response?.data?.error || error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试公司管理权限功能\n');
  
  // 1. 登录所有测试用户
  console.log('=== 用户登录测试 ===');
  for (const userType of Object.keys(TEST_USERS)) {
    await login(userType);
  }
  
  // 2. 测试权限分组继承
  await testPermissionInheritance();
  
  // 3. 测试获取公司列表（不同角色）
  console.log('\n=== 获取公司列表权限测试 ===');
  const platformCompanies = await testGetCompanyList('platform_admin');
  const companyCompanies = await testGetCompanyList('company_admin');
  await testGetCompanyList('store_user'); // 可能会失败，取决于权限配置
  
  // 4. 测试创建公司（只有平台管理员可以）
  console.log('\n=== 创建公司权限测试 ===');
  const newCompany = await testCreateCompany('platform_admin');
  await testCreateCompany('company_admin'); // 应该失败
  await testCreateCompany('store_user'); // 应该失败
  
  // 5. 测试更新公司
  console.log('\n=== 更新公司权限测试 ===');
  if (newCompany) {
    await testUpdateCompany('platform_admin', newCompany.id);
    await testUpdateCompany('company_admin', newCompany.id); // 可能失败，取决于是否是同一公司
  }
  
  // 6. 测试删除公司（只有平台管理员可以）
  console.log('\n=== 删除公司权限测试 ===');
  if (newCompany) {
    await testDeleteCompany('company_admin', newCompany.id); // 应该失败
    await testDeleteCompany('platform_admin', newCompany.id); // 应该成功
  }
  
  console.log('\n✨ 公司管理权限功能测试完成');
}

// 运行测试
runTests().catch(console.error); 