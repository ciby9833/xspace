const { orderService } = require('./src/services');

async function testBookingFixes() {
  console.log('🧪 测试预订界面修复...\n');

  // 模拟用户
  const testUser = {
    user_id: 'test-user-id',
    company_id: 'test-company-id',
    account_level: 'company',
    user_timezone: 'Asia/Jakarta'
  };

  try {
    // 测试1：验证只返回启用的剧本和密室
    console.log('📋 测试1：验证只返回启用的项目');
    const allItems = await orderService.getBookingItems('all', {}, testUser);
    console.log(`返回项目数量: ${allItems.items.length}`);
    
    // 检查是否有禁用的项目
    const hasDisabledItems = allItems.items.some(item => item.is_active === false);
    console.log(`是否包含禁用项目: ${hasDisabledItems ? '❌ 是' : '✅ 否'}`);

    // 测试2：验证门店筛选
    console.log('\n🏪 测试2：验证门店筛选');
    const storeFilteredItems = await orderService.getBookingItems('all', { 
      store_id: 'test-store-id' 
    }, testUser);
    console.log(`门店筛选后项目数量: ${storeFilteredItems.items.length}`);

    // 测试3：验证搜索功能
    console.log('\n🔍 测试3：验证搜索功能');
    const searchResults = await orderService.getBookingItems('all', { 
      keyword: '测试' 
    }, testUser);
    console.log(`搜索结果数量: ${searchResults.items.length}`);

    // 测试4：验证类型筛选
    console.log('\n🎭 测试4：验证剧本类型筛选');
    const scriptTypeResults = await orderService.getBookingItems('script', { 
      script_types: ['推理', '恐怖'] 
    }, testUser);
    console.log(`剧本类型筛选结果: ${scriptTypeResults.items.length}`);

    // 测试5：验证恐怖等级筛选
    console.log('\n👻 测试5：验证恐怖等级筛选');
    const horrorLevelResults = await orderService.getBookingItems('escape_room', { 
      horror_levels: ['微恐', '中恐'] 
    }, testUser);
    console.log(`恐怖等级筛选结果: ${horrorLevelResults.items.length}`);

    // 测试6：验证人数筛选
    console.log('\n👥 测试6：验证人数筛选');
    const playerCountResults = await orderService.getBookingItems('all', { 
      min_players: 4,
      max_players: 8 
    }, testUser);
    console.log(`人数筛选结果: ${playerCountResults.items.length}`);

    // 测试7：验证价格筛选
    console.log('\n💰 测试7：验证价格筛选');
    const priceResults = await orderService.getBookingItems('all', { 
      min_price: 100000,
      max_price: 500000 
    }, testUser);
    console.log(`价格筛选结果: ${priceResults.items.length}`);

    console.log('\n✅ 所有测试完成');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testBookingFixes().catch(console.error);
}

module.exports = { testBookingFixes }; 