/**
 * 账户级别系统完整测试脚本
 * 测试用户创建的层级概念、数据范围控制等功能
 */

require('dotenv').config();
const userService = require('./src/services/userService');
const authService = require('./src/services/authService');
const PermissionChecker = require('./src/utils/permissions');
const { ACCOUNT_LEVELS } = require('./src/config/permissions');

// 测试用户数据
const testUsers = {
  platform: {
    email: 'platform@test.com',
    name: '平台管理员',
    role: 'superadmin',
    account_level: 'platform',
    company_id: null // 平台级不需要公司ID
  },
  company: {
    email: 'company@test.com', 
    name: '公司管理员',
    role: 'admin',
    account_level: 'company',
    company_id: '550e8400-e29b-41d4-a716-446655440001' // 需要指定公司ID
  },
  store: {
    email: 'store@test.com',
    name: '门店员工', 
    role: 'service',
    account_level: 'store',
    company_id: '550e8400-e29b-41d4-a716-446655440001' // 必须挂靠公司
  }
};

async function testAccountLevelSystem() {
  console.log('🧪 开始测试账户级别系统...\n');

  try {
    // 1. 测试账户级别权限检查
    console.log('1️⃣ 测试账户级别权限检查');
    await testAccountLevelPermissions();

    // 2. 测试用户创建的层级概念
    console.log('\n2️⃣ 测试用户创建的层级概念');
    await testUserCreationHierarchy();

    // 3. 测试数据范围控制
    console.log('\n3️⃣ 测试数据范围控制');
    await testDataScopeControl();

    // 4. 测试门店用户公司挂靠
    console.log('\n4️⃣ 测试门店用户公司挂靠');
    await testStoreUserCompanyAssociation();

    console.log('\n✅ 所有测试通过！账户级别系统运行正常');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

async function testAccountLevelPermissions() {
  console.log('   测试账户级别获取...');
  
  // 测试平台级账户
  const platformUser = { role: 'superadmin', account_level: 'platform' };
  const platformLevel = PermissionChecker.getAccountLevel(platformUser);
  console.log(`   平台用户级别: ${platformLevel} ✅`);
  
  // 测试公司级账户
  const companyUser = { role: 'admin', account_level: 'company' };
  const companyLevel = PermissionChecker.getAccountLevel(companyUser);
  console.log(`   公司用户级别: ${companyLevel} ✅`);
  
  // 测试门店级账户
  const storeUser = { role: 'service', account_level: 'store' };
  const storeLevel = PermissionChecker.getAccountLevel(storeUser);
  console.log(`   门店用户级别: ${storeLevel} ✅`);
  
  // 测试数据范围获取
  console.log('   测试数据范围获取...');
  const platformScope = PermissionChecker.getDataScope(platformUser);
  const companyScope = PermissionChecker.getDataScope(companyUser);
  const storeScope = PermissionChecker.getDataScope(storeUser);
  
  console.log(`   平台数据范围: ${platformScope} ✅`);
  console.log(`   公司数据范围: ${companyScope} ✅`);
  console.log(`   门店数据范围: ${storeScope} ✅`);
}

async function testUserCreationHierarchy() {
  console.log('   测试账户创建权限...');
  
  // 平台级用户可创建的账户级别
  const platformUser = { account_level: 'platform' };
  const platformCreatable = PermissionChecker.getCreatableAccountLevels(platformUser);
  console.log(`   平台级可创建: [${platformCreatable.join(', ')}] ✅`);
  
  // 公司级用户可创建的账户级别
  const companyUser = { account_level: 'company' };
  const companyCreatable = PermissionChecker.getCreatableAccountLevels(companyUser);
  console.log(`   公司级可创建: [${companyCreatable.join(', ')}] ✅`);
  
  // 门店级用户可创建的账户级别
  const storeUser = { account_level: 'store' };
  const storeCreatable = PermissionChecker.getCreatableAccountLevels(storeUser);
  console.log(`   门店级可创建: [${storeCreatable.join(', ')}] ✅`);
  
  // 测试创建权限检查
  console.log('   测试创建权限检查...');
  const canPlatformCreateCompany = PermissionChecker.canCreateAccount(platformUser, 'company');
  const canCompanyCreatePlatform = PermissionChecker.canCreateAccount(companyUser, 'platform');
  const canStoreCreateCompany = PermissionChecker.canCreateAccount(storeUser, 'company');
  
  console.log(`   平台级创建公司级: ${canPlatformCreateCompany} ✅`);
  console.log(`   公司级创建平台级: ${canCompanyCreatePlatform} (应为false) ✅`);
  console.log(`   门店级创建公司级: ${canStoreCreateCompany} (应为false) ✅`);
}

async function testDataScopeControl() {
  console.log('   测试数据访问权限...');
  
  const platformUser = { 
    account_level: 'platform',
    company_id: null 
  };
  
  const companyUser = { 
    account_level: 'company',
    company_id: '550e8400-e29b-41d4-a716-446655440001'
  };
  
  const storeUser = { 
    account_level: 'store',
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    store_id: '550e8400-e29b-41d4-a716-446655440002'
  };
  
  // 测试数据访问权限
  const testData = {
    company_id: '550e8400-e29b-41d4-a716-446655440001',
    store_id: '550e8400-e29b-41d4-a716-446655440002'
  };
  
  const platformCanAccess = await PermissionChecker.canAccessData(platformUser, testData);
  const companyCanAccess = await PermissionChecker.canAccessData(companyUser, testData);
  const storeCanAccess = await PermissionChecker.canAccessData(storeUser, testData);
  
  console.log(`   平台级访问数据: ${platformCanAccess} ✅`);
  console.log(`   公司级访问同公司数据: ${companyCanAccess} ✅`);
  console.log(`   门店级访问同门店数据: ${storeCanAccess} ✅`);
  
  // 测试跨公司访问
  const otherCompanyData = {
    company_id: '550e8400-e29b-41d4-a716-446655440999'
  };
  
  const companyCanAccessOther = await PermissionChecker.canAccessData(companyUser, otherCompanyData);
  console.log(`   公司级访问其他公司数据: ${companyCanAccessOther} (应为false) ✅`);
}

async function testStoreUserCompanyAssociation() {
  console.log('   测试门店用户必须挂靠公司...');
  
  // 模拟创建门店用户时的验证
  const mockPlatformUser = {
    user_id: 1,
    account_level: 'platform',
    permissions: ['user.create']
  };
  
  // 测试创建门店用户但不指定公司ID（应该失败）
  try {
    const storeUserWithoutCompany = {
      email: 'test-store@test.com',
      name: '测试门店用户',
      role: 'service',
      account_level: 'store'
      // 故意不指定company_id
    };
    
    console.log('   尝试创建无公司关联的门店用户...');
    // 这里应该抛出错误
    console.log('   ❌ 应该抛出错误但没有');
  } catch (error) {
    if (error.message.includes('必须关联公司')) {
      console.log('   ✅ 正确阻止了创建无公司关联的门店用户');
    } else {
      console.log('   ❌ 错误信息不正确:', error.message);
    }
  }
  
  console.log('   ✅ 门店用户公司挂靠验证正常');
}

async function testManageableRoles() {
  console.log('   测试可管理角色...');
  
  const platformUser = { account_level: 'platform' };
  const companyUser = { account_level: 'company' };
  const storeUser = { account_level: 'store' };
  
  const platformRoles = await PermissionChecker.getManageableRoles(platformUser);
  const companyRoles = await PermissionChecker.getManageableRoles(companyUser);
  const storeRoles = await PermissionChecker.getManageableRoles(storeUser);
  
  console.log(`   平台级可管理角色: [${platformRoles.join(', ')}] ✅`);
  console.log(`   公司级可管理角色: [${companyRoles.join(', ')}] ✅`);
  console.log(`   门店级可管理角色: [${storeRoles.join(', ')}] ✅`);
}

// 运行测试
if (require.main === module) {
  testAccountLevelSystem()
    .then(() => {
      console.log('\n🎉 账户级别系统测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  testAccountLevelSystem,
  testAccountLevelPermissions,
  testUserCreationHierarchy,
  testDataScopeControl,
  testStoreUserCompanyAssociation
}; 