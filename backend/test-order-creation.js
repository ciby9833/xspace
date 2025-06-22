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

// 测试获取预订资源
async function testGetBookingResources(storeId) {
  try {
    console.log(`\n🔍 测试获取预订资源: 门店 ${storeId}`);
    
    const response = await axios.get(`${BASE_URL}/order/store/${storeId}/resources`, getConfig());
    
    if (response.data.success) {
      console.log(`✅ 成功获取预订资源`);
      const data = response.data.data;
      console.log(`📊 剧本数量: ${data.scripts?.length || 0}`);
      console.log(`📊 密室数量: ${data.escape_rooms?.length || 0}`);
      console.log(`📊 房间数量: ${data.rooms?.length || 0}`);
      return data;
    }
    return null;
  } catch (error) {
    console.error(`❌ 获取预订资源失败:`, error.response?.data || error.message);
    return null;
  }
}

// 测试创建订单
async function testCreateOrder(storeId, resources) {
  try {
    console.log(`\n🔍 测试创建订单`);
    
    // 构造测试订单数据
    const orderData = {
      order_type: '剧本杀',
      customer_name: '测试客户',
      customer_phone: '1234567890',
      player_count: 4,
      order_date: new Date().toISOString().split('T')[0],
      start_time: '14:00',
      end_time: '16:00',
      booking_type: 'Booking',
      payment_status: 'Not Yet',
      store_id: storeId,
      language: 'CN',
      script_id: resources.scripts?.[0]?.id,
      room_id: resources.rooms?.[0]?.id,
      notes: '测试订单 - 权限修复验证'
    };
    
    console.log(`📋 订单数据:`, {
      order_type: orderData.order_type,
      customer_name: orderData.customer_name,
      store_id: orderData.store_id,
      script_id: orderData.script_id,
      room_id: orderData.room_id
    });
    
    const response = await axios.post(`${BASE_URL}/order`, orderData, getConfig());
    
    if (response.data.success) {
      console.log(`✅ 成功创建订单`);
      console.log(`📋 订单ID: ${response.data.data.id}`);
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error(`❌ 创建订单失败:`, error.response?.data || error.message);
    console.error(`📊 HTTP状态: ${error.response?.status}`);
    return null;
  }
}

// 测试预检查预订
async function testPreCheckBooking(storeId, resources) {
  try {
    console.log(`\n🔍 测试预检查预订`);
    
    const preCheckData = {
      store_id: storeId,
      room_id: resources.rooms?.[0]?.id,
      order_date: new Date().toISOString().split('T')[0],
      start_time: '14:00',
      end_time: '16:00'
    };
    
    const response = await axios.post(`${BASE_URL}/order/booking/pre-check`, preCheckData, getConfig());
    
    if (response.data.success) {
      console.log(`✅ 预检查预订成功`);
      console.log(`📋 结果: ${response.data.data.available ? '可预订' : '不可预订'}`);
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error(`❌ 预检查预订失败:`, error.response?.data || error.message);
    console.error(`📊 HTTP状态: ${error.response?.status}`);
    return null;
  }
}

// 主测试函数
async function main() {
  console.log('🚀 开始测试订单创建权限修复效果\n');
  
  try {
    // 1. 登录测试用户
    const user = await login();
    
    // 2. 测试获取门店列表
    const stores = await testGetStores();
    
    if (stores.length === 0) {
      console.log('\n⚠️ 没有可访问的门店，无法继续测试');
      return;
    }
    
    const firstStore = stores[0];
    
    // 3. 测试获取预订资源
    const resources = await testGetBookingResources(firstStore.id);
    
    if (!resources) {
      console.log('\n⚠️ 无法获取预订资源，无法继续测试');
      return;
    }
    
    // 4. 测试预检查预订
    const preCheckResult = await testPreCheckBooking(firstStore.id, resources);
    
    // 5. 测试创建订单
    const orderResult = await testCreateOrder(firstStore.id, resources);
    
    // 6. 总结测试结果
    console.log('\n📊 测试结果总结:');
    console.log(`- 登录: ✅ 成功`);
    console.log(`- 获取门店列表: ${stores.length > 0 ? '✅ 成功' : '❌ 失败'}`);
    console.log(`- 获取预订资源: ${resources ? '✅ 成功' : '❌ 失败'}`);
    console.log(`- 预检查预订: ${preCheckResult ? '✅ 成功' : '❌ 失败'}`);
    console.log(`- 创建订单: ${orderResult ? '✅ 成功' : '❌ 失败'}`);
    
    if (orderResult) {
      console.log('\n🎉 权限修复成功！用户可以正常创建订单');
    } else {
      console.log('\n❌ 权限修复失败，用户仍无法创建订单');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main }; 