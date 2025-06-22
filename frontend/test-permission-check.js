// 模拟前端权限检查逻辑
const mockUser = {
  id: "ed1b0657-ef1f-4b7d-8fb9-c42dbe87a568",
  name: "二二三",
  email: "w@x.com",
  account_level: "company",
  company_id: "e193b2b0-430e-49c4-a16c-ea80d7a5044c",
  permissions: [
    "company.create", "company.delete", "company.edit", "company.manage", "company.view",
    "order.assign", "order.create", "order.delete", "order.edit", "order.manage", "order.view",
    "permission.manage", "permission.view",
    "script.create", "script.delete", "script.edit", "script.manage", "script.store_config", "script.view",
    "store.create", "store.delete", "store.edit", "store.manage", "store.view",
    "system.admin", "system.manage", "system.permission", "system.role", "system.view",
    "user.create", "user.delete", "user.edit", "user.manage", "user.role.assign", "user.view"
  ]
};

const mockRole = {
  id: "63c1eda7-ec9e-47a7-bf3c-8ac3d2287821",
  company_id: "e193b2b0-430e-49c4-a16c-ea80d7a5044c",
  name: "w1",
  display_name: "财务权限",
  description: "",
  role_level: "company",
  is_system_role: false,
  is_active: true
};

// 模拟前端权限检查函数
function hasPermission(user, permission) {
  if (!user) return false;
  
  if (user.role === 'superadmin') return true;
  
  // 平台管理员拥有所有权限
  if (user.account_level === 'platform') return true;
  
  // 检查具体权限
  if (user.permissions && user.permissions.includes(permission)) {
    return true;
  }
  
  // 检查通配符权限
  if (user.permissions) {
    const modulePermission = permission.split('.')[0] + '.*';
    if (user.permissions.includes(modulePermission)) {
      return true;
    }
  }
  
  return false;
}

function canManageRoles(user) {
  return hasPermission(user, 'system.role') || hasPermission(user, 'system.permission');
}

function canEditRole(user, role) {
  if (!canManageRoles(user)) return false;
  
  // 超级管理员角色不能编辑
  if (role.name === 'superadmin' && role.is_system_role) {
    return false;
  }
  
  // 平台用户可以编辑所有角色
  if (user.account_level === 'platform') {
    return true;
  }
  
  // 公司用户可以编辑本公司的公司级和门店级角色
  if (user.account_level === 'company') {
    return role.company_id === user.company_id &&
           ['company', 'store'].includes(role.role_level);
  }
  
  // 门店用户只能编辑本公司的门店级角色
  if (user.account_level === 'store') {
    return role.company_id === user.company_id &&
           role.role_level === 'store';
  }
  
  return false;
}

function canManageRolePermissions(user, role) {
  if (!role) return false;
  
  // 超级管理员角色权限不能修改
  if (role.name === 'superadmin' && role.is_system_role) {
    return false;
  }
  
  return canEditRole(user, role);
}

// 测试权限检查
console.log('=== 前端权限检查测试 ===');
console.log(`用户: ${mockUser.name} (${mockUser.email})`);
console.log(`账户级别: ${mockUser.account_level}`);
console.log(`公司ID: ${mockUser.company_id}`);
console.log(`权限数量: ${mockUser.permissions.length}`);

console.log('\n=== 基础权限检查 ===');
console.log(`system.role 权限: ${hasPermission(mockUser, 'system.role') ? '✅' : '❌'}`);
console.log(`system.permission 权限: ${hasPermission(mockUser, 'system.permission') ? '✅' : '❌'}`);
console.log(`canManageRoles: ${canManageRoles(mockUser) ? '✅' : '❌'}`);

console.log('\n=== 角色编辑权限检查 ===');
console.log(`角色: ${mockRole.display_name} (${mockRole.role_level}级)`);
console.log(`角色公司ID: ${mockRole.company_id}`);
console.log(`用户公司ID: ${mockUser.company_id}`);
console.log(`公司ID匹配: ${mockRole.company_id === mockUser.company_id ? '✅' : '❌'}`);
console.log(`canEditRole: ${canEditRole(mockUser, mockRole) ? '✅' : '❌'}`);
console.log(`canManageRolePermissions: ${canManageRolePermissions(mockUser, mockRole) ? '✅' : '❌'}`);

console.log('\n=== 详细检查步骤 ===');
console.log(`1. canManageRoles(user): ${canManageRoles(mockUser)}`);
console.log(`2. role.name === 'superadmin': ${mockRole.name === 'superadmin'}`);
console.log(`3. user.account_level === 'platform': ${mockUser.account_level === 'platform'}`);
console.log(`4. user.account_level === 'company': ${mockUser.account_level === 'company'}`);
console.log(`5. role.company_id === user.company_id: ${mockRole.company_id === mockUser.company_id}`);
console.log(`6. role.role_level in ['company', 'store']: ${['company', 'store'].includes(mockRole.role_level)}`);

if (canManageRolePermissions(mockUser, mockRole)) {
  console.log('\n✅ 用户应该可以编辑该角色的权限');
} else {
  console.log('\n❌ 用户不能编辑该角色的权限');
} 