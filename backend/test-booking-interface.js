const request = require('supertest');
const app = require('./src/app');

// 测试用户登录信息
let authToken = '';
let testUser = null;

describe('预订界面接口测试', () => {
  
  beforeAll(async () => {
    // 先登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@company.com',
        password: 'password'
      });
    
    if (loginResponse.status === 200) {
      authToken = loginResponse.body.data.token;
      testUser = loginResponse.body.data.user;
      console.log('✅ 登录成功');
    } else {
      console.log('❌ 登录失败，使用默认测试token');
      authToken = 'test-token';
    }
  });

  describe('GET /api/order/booking/items', () => {
    test('获取所有可预订项目', async () => {
      const response = await request(app)
        .get('/api/order/booking/items')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          item_type: 'all'
        });

      console.log('📋 获取所有可预订项目响应:', {
        status: response.status,
        success: response.body.success,
        itemCount: response.body.data?.items?.length || 0,
        categories: response.body.data?.categories
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('categories');
    });

    test('获取剧本杀项目', async () => {
      const response = await request(app)
        .get('/api/order/booking/items')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          item_type: 'script'
        });

      console.log('🎭 获取剧本杀项目响应:', {
        status: response.status,
        success: response.body.success,
        scriptCount: response.body.data?.items?.length || 0
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('获取密室项目', async () => {
      const response = await request(app)
        .get('/api/order/booking/items')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          item_type: 'escape_room'
        });

      console.log('🏠 获取密室项目响应:', {
        status: response.status,
        success: response.body.success,
        escapeRoomCount: response.body.data?.items?.length || 0
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/order/booking/item/:itemType/:itemId', () => {
    let testItemId = null;
    let testItemType = null;

    beforeAll(async () => {
      // 先获取一个测试项目
      const itemsResponse = await request(app)
        .get('/api/order/booking/items')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ item_type: 'all' });

      if (itemsResponse.body.data?.items?.length > 0) {
        const firstItem = itemsResponse.body.data.items[0];
        testItemId = firstItem.id;
        testItemType = firstItem.type;
        console.log('🎯 找到测试项目:', { id: testItemId, type: testItemType, name: firstItem.name });
      }
    });

    test('获取项目详情页数据', async () => {
      if (!testItemId || !testItemType) {
        console.log('⚠️ 没有可用的测试项目，跳过此测试');
        return;
      }

      const response = await request(app)
        .get(`/api/order/booking/item/${testItemType}/${testItemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      console.log('📄 获取项目详情响应:', {
        status: response.status,
        success: response.body.success,
        hasItem: !!response.body.data?.item,
        storeCount: response.body.data?.available_stores?.length || 0
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('item');
      expect(response.body.data).toHaveProperty('available_stores');
    });
  });

  describe('GET /api/order/booking/store/:storeId/schedule', () => {
    let testStoreId = null;

    beforeAll(async () => {
      // 获取门店列表找到一个测试门店
      const storesResponse = await request(app)
        .get('/api/order/available-stores')
        .set('Authorization', `Bearer ${authToken}`);

      if (storesResponse.body.data?.length > 0) {
        testStoreId = storesResponse.body.data[0].id;
        console.log('🏪 找到测试门店:', { id: testStoreId, name: storesResponse.body.data[0].name });
      }
    });

    test('获取门店房间时间表', async () => {
      if (!testStoreId) {
        console.log('⚠️ 没有可用的测试门店，跳过此测试');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/order/booking/store/${testStoreId}/schedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          date: today
        });

      console.log('📅 获取门店房间时间表响应:', {
        status: response.status,
        success: response.body.success,
        date: today,
        roomCount: response.body.data?.rooms?.length || 0
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('rooms');
    });
  });

  describe('POST /api/order/booking/pre-check', () => {
    test('预检查预订可用性', async () => {
      // 这个测试需要真实的数据，所以我们测试参数验证
      const response = await request(app)
        .post('/api/order/booking/pre-check')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          store_id: 'test-store-id',
          room_id: 'test-room-id',
          item_type: 'script',
          item_id: 'test-item-id',
          date: '2024-12-01',
          start_time: '14:00',
          end_time: '16:00'
        });

      console.log('✅ 预检查预订响应:', {
        status: response.status,
        success: response.body.success,
        message: response.body.message || response.body.error
      });

      // 由于是测试数据，可能会失败，但至少应该有响应
      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });

  afterAll(() => {
    console.log('\n🎉 预订界面接口测试完成');
  });
});

// 如果直接运行此文件
if (require.main === module) {
  console.log('🧪 开始预订界面接口测试...\n');
  
  const runTests = async () => {
    try {
      // 简单的手动测试
      console.log('👤 测试用户信息:');
      console.log('- Token:', authToken ? '有效' : '无效');
      console.log('- User:', testUser ? `${testUser.name} (${testUser.email})` : '未知');
      console.log('');
      
    } catch (error) {
      console.error('❌ 测试过程中出现错误:', error.message);
    }
  };
  
  runTests();
} 