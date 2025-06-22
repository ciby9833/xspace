const orderService = require('./src/services/orderService');

// 模拟用户对象
const mockUser = {
  user_id: 'test-user-id',
  account_level: 'company',
  company_id: 'test-company-id',
  user_timezone: 'Asia/Jakarta'
};

async function testBookingFunctions() {
  console.log('🧪 开始测试预订界面功能...\n');

  try {
    // 测试1: 获取可预订项目列表
    console.log('📋 测试1: 获取所有可预订项目');
    try {
      const allItems = await orderService.getBookingItems('all', {}, mockUser);
      console.log('✅ 成功获取项目列表');
      console.log(`   - 总项目数: ${allItems.items?.length || 0}`);
      console.log(`   - 剧本类型: ${allItems.categories?.script_types?.length || 0} 种`);
      console.log(`   - 恐怖等级: ${allItems.categories?.escape_room_horror_levels?.length || 0} 种`);
    } catch (error) {
      console.log('❌ 获取项目列表失败:', error.message);
    }

    console.log('');

    // 测试2: 获取剧本杀项目
    console.log('🎭 测试2: 获取剧本杀项目');
    try {
      const scriptItems = await orderService.getBookingItems('script', {}, mockUser);
      console.log('✅ 成功获取剧本杀项目');
      console.log(`   - 剧本数量: ${scriptItems.items?.length || 0}`);
    } catch (error) {
      console.log('❌ 获取剧本杀项目失败:', error.message);
    }

    console.log('');

    // 测试3: 获取密室项目
    console.log('🏠 测试3: 获取密室项目');
    try {
      const escapeRoomItems = await orderService.getBookingItems('escape_room', {}, mockUser);
      console.log('✅ 成功获取密室项目');
      console.log(`   - 密室数量: ${escapeRoomItems.items?.length || 0}`);
    } catch (error) {
      console.log('❌ 获取密室项目失败:', error.message);
    }

    console.log('');

    // 测试4: 获取用户可选门店
    console.log('🏪 测试4: 获取用户可选门店');
    try {
      const stores = await orderService.getAvailableStores(mockUser);
      console.log('✅ 成功获取门店列表');
      console.log(`   - 门店数量: ${stores?.length || 0}`);
    } catch (error) {
      console.log('❌ 获取门店列表失败:', error.message);
    }

    console.log('');

    // 测试5: 测试权限检查
    console.log('🔐 测试5: 权限检查');
    try {
      const PermissionChecker = require('./src/utils/permissions');
      await PermissionChecker.requirePermissionAsync(mockUser, 'order.view');
      console.log('✅ 权限检查通过');
    } catch (error) {
      console.log('❌ 权限检查失败:', error.message);
    }

  } catch (error) {
    console.error('❌ 测试过程中出现未处理的错误:', error);
  }

  console.log('\n🎉 测试完成');
}

// 运行测试
testBookingFunctions(); 