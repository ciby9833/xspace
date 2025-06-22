const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试用户凭据
const TEST_USER = { email: 'test@x.com', password: 'password' };

let token = '';

// 通用配置生成器
function getConfig() {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
}

// 登录函数
async function login() {
  try {
    console.log(`🔐 尝试登录: ${TEST_USER.email}`);
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.data) {
      token = response.data.data.token;
      const user = response.data.data.user;
      
      console.log(`✅ 登录成功`);
      console.log(`📋 用户信息:`, {
        name: user.name,
        account_level: user.account_level,
        company_id: user.company_id,
        permissions: user.permissions
      });
      
      return user;
    } else {
      throw new Error('登录响应格式不正确');
    }
  } catch (error) {
    console.error(`❌ 登录失败:`, error.response?.data || error.message);
    throw error;
  }
}

// 测试权限扩展
async function testPermissionExpansion(user) {
  console.log('\n🔍 分析权限扩展效果:');
  
  const permissions = user.permissions || [];
  console.log(`📊 基础权限数量: ${permissions.length}`);
  
  // 检查是否有game_host权限
  const gameHostPermissions = permissions.filter(p => p.includes('game_host'));
  console.log(`🎮 Game Host权限:`, gameHostPermissions);
  
  // 检查是否有store.view权限（应该通过权限分组自动获得）
  const hasStoreView = permissions.includes('store.view');
  console.log(`🏪 store.view权限: ${hasStoreView ? '✅ 有' : '❌ 无'}`);
  
  // 检查是否有order权限
  const orderPermissions = permissions.filter(p => p.includes('order'));
  console.log(`📋 订单权限:`, orderPermissions);
  
  return { hasStoreView, gameHostPermissions, orderPermissions };
}

// 测试获取门店列表
async function testGetStores() {
  try {
    console.log(`\n🔍 测试获取门店列表`);
    
    const response = await axios.get(`${BASE_URL}/store`, getConfig());
    
    if (response.data.success) {
      console.log(`✅ 成功获取门店列表`);
      console.log(`📊 门店数量: ${response.data.data.stores.length}`);
      
      if (response.data.data.stores.length > 0) {
        const firstStore = response.data.data.stores[0];
        console.log(`🏪 第一个门店: ${firstStore.name} (ID: ${firstStore.id})`);
        return response.data.data.stores;
      }
    }
    return [];
  } catch (error) {
    console.error(`❌ 获取门店列表失败:`, error.response?.data || error.message);
    return [];
  }
}

// 测试获取门店用户列表
async function testGetUsersByStore(storeId, storeName) {
  try {
    console.log(`\n🔍 测试获取门店用户列表: ${storeName} (ID: ${storeId})`);
    
    const response = await axios.get(`${BASE_URL}/user/store/${storeId}`, getConfig());
    
    if (response.data.success) {
      console.log(`✅ 成功获取门店用户列表`);
      console.log(`👥 用户数量: ${response.data.data.length}`);
      
      if (response.data.data.length > 0) {
        const firstUser = response.data.data[0];
        console.log(`👤 第一个用户: ${firstUser.username || firstUser.real_name}`);
      }
      
      return response.data.data;
    }
  } catch (error) {
    console.error(`❌ 获取门店用户列表失败:`, error.response?.data || error.message);
    console.error(`📊 HTTP状态: ${error.response?.status}`);
    return null;
  }
}

// 主测试函数
async function main() {
  console.log('🚀 开始测试权限修复效果\n');
  
  try {
    // 1. 登录测试用户
    const user = await login();
    
    // 2. 测试权限扩展效果
    const permissionAnalysis = await testPermissionExpansion(user);
    
    // 3. 测试获取门店列表
    const stores = await testGetStores();
    
    // 4. 测试获取门店用户列表
    if (stores.length > 0) {
      const firstStore = stores[0];
      const users = await testGetUsersByStore(firstStore.id, firstStore.name);
      
      if (users !== null) {
        console.log('\n🎉 权限修复成功！用户可以正常访问门店用户信息');
      } else {
        console.log('\n❌ 权限修复失败，用户仍无法访问门店用户信息');
      }
    } else {
      console.log('\n⚠️ 没有可访问的门店');
    }
    
    // 5. 总结
    console.log('\n📊 测试结果总结:');
    console.log(`- 登录: ✅ 成功`);
    console.log(`- 权限扩展: ${permissionAnalysis.hasStoreView ? '✅ 成功 (有store.view权限)' : '❌ 失败 (缺少store.view权限)'}`);
    console.log(`- Game Host权限: ${permissionAnalysis.gameHostPermissions.length > 0 ? '✅ 有' : '❌ 无'}`);
    console.log(`- 订单权限: ${permissionAnalysis.orderPermissions.length > 0 ? '✅ 有' : '❌ 无'}`);
    console.log(`- 门店列表访问: ${stores.length > 0 ? '✅ 成功' : '❌ 失败'}`);
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main }; 