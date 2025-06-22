const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试用户登录信息
const testUsers = {
  platform: {
    email: 'admin@test.com',
    password: 'password'
  },
  company: {
    email: 'test@test.com', 
    password: 'password'
  }
};

let authTokens = {};

async function login(userType) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, testUsers[userType]);
    if (response.data.success) {
      authTokens[userType] = response.data.token;
      console.log(`✅ ${userType} 用户登录成功`);
      return response.data.token;
    }
  } catch (error) {
    console.error(`❌ ${userType} 用户登录失败:`, error.response?.data || error.message);
    return null;
  }
}

async function testRoomAPI(token, userType) {
  const headers = { Authorization: `Bearer ${token}` };
  
  console.log(`\n🧪 测试 ${userType} 用户的房间管理功能:`);
  
  try {
    // 1. 获取可选门店列表
    console.log('1. 获取可选门店列表...');
    const storesResponse = await axios.get(`${BASE_URL}/room/available-stores`, { headers });
    console.log(`   ✅ 获取到 ${storesResponse.data.data.length} 个可选门店`);
    
    if (storesResponse.data.data.length === 0) {
      console.log('   ⚠️  没有可选门店，跳过后续测试');
      return;
    }
    
    const firstStore = storesResponse.data.data[0];
    console.log(`   📍 使用门店: ${firstStore.name} (${firstStore.id})`);
    
    // 2. 创建测试房间
    console.log('2. 创建测试房间...');
    const roomData = {
      store_id: firstStore.id,
      name: `测试房间_${userType}_${Date.now()}`,
      room_type: '剧本杀',
      capacity: 6,
      status: '正常',
      description: '这是一个测试房间',
      equipment: '桌椅、音响、灯光',
      notes: '测试备注'
    };
    
    const createResponse = await axios.post(`${BASE_URL}/room`, roomData, { headers });
    console.log(`   ✅ 房间创建成功: ${createResponse.data.data.name}`);
    const roomId = createResponse.data.data.id;
    
    // 3. 获取房间列表
    console.log('3. 获取房间列表...');
    const listResponse = await axios.get(`${BASE_URL}/room`, { headers });
    console.log(`   ✅ 获取到 ${listResponse.data.data.length} 个房间`);
    
    // 4. 获取房间详情
    console.log('4. 获取房间详情...');
    const detailResponse = await axios.get(`${BASE_URL}/room/${roomId}`, { headers });
    console.log(`   ✅ 房间详情: ${detailResponse.data.data.name} - ${detailResponse.data.data.room_type}`);
    
    // 5. 更新房间信息
    console.log('5. 更新房间信息...');
    const updateData = {
      description: '更新后的房间描述',
      capacity: 8,
      status: '维护'
    };
    const updateResponse = await axios.put(`${BASE_URL}/room/${roomId}`, updateData, { headers });
    console.log(`   ✅ 房间更新成功: 容量 ${updateResponse.data.data.capacity}, 状态 ${updateResponse.data.data.status}`);
    
    // 6. 获取房间统计
    console.log('6. 获取房间统计...');
    const statsResponse = await axios.get(`${BASE_URL}/room/stats`, { headers });
    console.log(`   ✅ 房间统计: 总数 ${statsResponse.data.data.total_rooms}, 正常 ${statsResponse.data.data.normal_rooms}`);
    
    // 7. 批量更新状态测试
    console.log('7. 批量更新房间状态...');
    const batchData = {
      operation: 'updateStatus',
      room_ids: [roomId],
      status: '正常'
    };
    const batchResponse = await axios.post(`${BASE_URL}/room/batch`, batchData, { headers });
    console.log(`   ✅ 批量更新成功: 影响 ${batchResponse.data.data.length} 个房间`);
    
    // 8. 删除测试房间
    console.log('8. 删除测试房间...');
    const deleteResponse = await axios.delete(`${BASE_URL}/room/${roomId}`, { headers });
    console.log(`   ✅ 房间删除成功`);
    
    console.log(`🎉 ${userType} 用户房间管理功能测试完成！`);
    
  } catch (error) {
    console.error(`❌ ${userType} 用户测试失败:`, error.response?.data || error.message);
  }
}

async function testRoomFilters(token, userType) {
  const headers = { Authorization: `Bearer ${token}` };
  
  console.log(`\n🔍 测试 ${userType} 用户的房间筛选功能:`);
  
  try {
    // 测试各种筛选条件
    const filters = [
      { room_type: '剧本杀' },
      { status: '正常' },
      { min_capacity: 4 },
      { max_capacity: 10 },
      { keyword: '测试' }
    ];
    
    for (const filter of filters) {
      const params = new URLSearchParams(filter).toString();
      const response = await axios.get(`${BASE_URL}/room?${params}`, { headers });
      console.log(`   ✅ 筛选条件 ${JSON.stringify(filter)}: 找到 ${response.data.data.length} 个房间`);
    }
    
  } catch (error) {
    console.error(`❌ ${userType} 用户筛选测试失败:`, error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 开始房间管理功能测试...\n');
  
  // 登录不同类型的用户
  const platformToken = await login('platform');
  const companyToken = await login('company');
  
  if (platformToken) {
    await testRoomAPI(platformToken, 'platform');
    await testRoomFilters(platformToken, 'platform');
  }
  
  if (companyToken) {
    await testRoomAPI(companyToken, 'company');
    await testRoomFilters(companyToken, 'company');
  }
  
  console.log('\n🏁 房间管理功能测试完成！');
}

// 运行测试
runTests().catch(console.error); 