<template>
  <a-layout class="main-layout">
    <!-- 侧边栏 -->
    <a-layout-sider 
      v-model:collapsed="collapsed" 
      :trigger="null" 
      collapsible
      class="sidebar"
      :width="200"
      :collapsed-width="80"
    >
      <!-- Logo区域包含折叠按钮 -->
      <div class="logo-container">
        <div class="logo" v-if="!collapsed">
          <h3>{{ appTitle }}</h3>
        </div>
        <!-- 折叠按钮 -->
        <div class="collapse-trigger" @click="toggleCollapsed">
          <MenuUnfoldOutlined v-if="collapsed" />
          <MenuFoldOutlined v-else />
        </div>
      </div>
      
      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
        mode="inline"
        @click="handleMenuClick"
      >
        <a-menu-item key="/dashboard">
          <DashboardOutlined />
          <span>主控台</span>
        </a-menu-item>
        
        <a-menu-item 
          key="/company"
          v-if="authStore.canAccessMenu('/company')"
        >
          <BankOutlined />
          <span>公司管理</span>
        </a-menu-item>
        
        <a-menu-item 
          key="/stores"
          v-if="authStore.canAccessMenu('/stores')"
        >
          <ShopOutlined />
          <span>门店管理</span>
        </a-menu-item>
        
        <a-menu-item 
          key="/users"
          v-if="authStore.canAccessMenu('/users')"
        >
          <UserOutlined />
          <span>用户管理</span>
        </a-menu-item>

        <a-menu-item 
          key="/scripts"
          v-if="authStore.canAccessMenu('/scripts')"
        >
          <ReadOutlined />
          <span>剧本管理</span>
        </a-menu-item>

        <a-menu-item 
          key="/escape-rooms"
          v-if="authStore.canAccessMenu('/escape-rooms')"
        >
          <HomeOutlined />
          <span>密室管理</span>
        </a-menu-item>

        <a-menu-item 
          key="/orders"
          v-if="authStore.canAccessMenu('/orders')"
        >
          <FileTextOutlined />
          <span>订单管理</span>
        </a-menu-item>

        <a-menu-item 
          key="/payment-query"
          v-if="authStore.canAccessMenu('/payment-query')"
        >
          <CreditCardOutlined />
          <span>支付查询</span>
        </a-menu-item>

        <a-menu-item 
          key="/booking"
          v-if="authStore.canAccessMenu('/booking')"
        >
          <CalendarOutlined />
          <span>在线预订</span>
        </a-menu-item>

        <a-menu-item 
          key="/game-host"
          v-if="authStore.canAccessMenu('/game-host')"
        >
          <PlayCircleOutlined />
          <span>Game Host</span>
        </a-menu-item>

        <a-menu-item 
          key="/permissions"
          v-if="authStore.canAccessMenu('/permissions')"
        >
          <SettingOutlined />
          <span>权限管理</span>
        </a-menu-item>

        <a-menu-item 
          key="/role-pricing"
          v-if="authStore.canAccessMenu('/role-pricing')"
        >
          <DollarOutlined />
          <span>角色定价</span>
        </a-menu-item>

        <!-- 定价日历功能暂时隐藏 -->
        <!-- <a-menu-item 
          key="/pricing-calendar"
          v-if="authStore.canAccessMenu('/pricing-calendar')"
        >
          <CalendarOutlined />
          <span>定价日历</span>
        </a-menu-item> -->
      </a-menu>
    </a-layout-sider>
    
    <!-- 主要内容区 -->
    <a-layout class="main-content" :style="{ marginLeft: sidebarWidth + 'px' }">
      <!-- 顶部导航 -->
      <a-layout-header class="header">
        <div class="header-left">
          <!-- 可以在这里添加面包屑或其他导航元素 -->
        </div>
        
        <div class="header-right">
          <!-- 用户角色标识 -->
          <div class="user-role-badge">
            <a-tag 
              :color="getRoleColor(authStore.userRole)"
              style="margin-right: 12px;"
            >
              {{ authStore.userRole }}
            </a-tag>
            <a-tag 
              :color="getAccountLevelColor(authStore.accountLevel)"
              size="small"
            >
              {{ getAccountLevelText(authStore.accountLevel) }}
            </a-tag>
          </div>
          
          <a-dropdown>
            <a class="user-info">
              <UserOutlined />
              <span>{{ authStore.user?.name || authStore.user?.email || '用户' }}</span>
              <DownOutlined />
            </a>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile">
                  <UserOutlined />
                  个人信息
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="refresh" @click="handleRefreshPermissions">
                  <ReloadOutlined />
                  刷新权限
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="handleLogout">
                  <LogoutOutlined />
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>
      
      <!-- 内容区 -->
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { 
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DashboardOutlined,
  BankOutlined,
  ShopOutlined,
  UserOutlined,
  ReadOutlined,
  HomeOutlined,
  FileTextOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  DollarOutlined,
  CreditCardOutlined,
  DownOutlined,
  LogoutOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const appTitle = import.meta.env.VITE_APP_TITLE

const collapsed = ref(false)
const selectedKeys = ref([route.path])

// 计算侧边栏宽度
const sidebarWidth = computed(() => {
  return collapsed.value ? 80 : 200
})

// 切换折叠状态
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
}

// 监听路由变化，更新选中的菜单
watch(
  () => route.path,
  (newPath) => {
    selectedKeys.value = [newPath]
  }
)

// 获取角色颜色
const getRoleColor = (role) => {
  const colors = {
    '平台管理员': 'purple',
    '公司管理员': 'red',
    'admin': 'blue',
    'supervisor': 'cyan',
    'manager': 'green',
    'service': 'orange',
    'host': 'gold'
  }
  return colors[role] || 'default'
}

// 获取账户级别颜色
const getAccountLevelColor = (level) => {
  const colors = {
    'platform': 'purple',
    'company': 'blue',
    'store': 'green'
  }
  return colors[level] || 'default'
}

// 获取账户级别文本
const getAccountLevelText = (level) => {
  const texts = {
    'platform': '平台级',
    'company': '公司级',
    'store': '门店级'
  }
  return texts[level] || level
}

// 处理菜单点击
const handleMenuClick = ({ key }) => {
  // 检查访问权限
  if (!authStore.canAccessMenu(key)) {
    message.error('权限不足，无法访问该页面')
    return
  }
  
  router.push(key)
}

// 刷新权限
const handleRefreshPermissions = async () => {
  try {
    await authStore.fetchUserProfile()
    message.success('权限信息已刷新')
  } catch (error) {
    message.error('刷新权限失败')
  }
}

// 处理退出登录
const handleLogout = () => {
  authStore.logout()
}
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  overflow: hidden;
}

.sidebar {
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  transition: all 0.2s;
}

/* Logo容器样式 */
.logo-container {
  height: 64px;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  margin: 16px;
  border-radius: 6px;
  position: relative;
  padding: 0 16px;
  justify-content: space-between;
}

/* 折叠状态下居中显示按钮 */
.sidebar.ant-layout-sider-collapsed .logo-container {
  justify-content: center;
  padding: 0;
}

.logo {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo.collapsed {
  justify-content: flex-start;
}

.logo h3 {
  color: white;
  margin: 0;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
}

/* 折叠按钮样式 */
.collapse-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: white;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s;
  flex-shrink: 0;
}

.collapse-trigger:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #1890ff;
}

/* 主内容区域 */
.main-content {
  transition: margin-left 0.2s;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
  height: 40px;
  flex-shrink: 0;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-role-badge {
  display: flex;
  align-items: center;
  margin-right: 16px;
}

.user-info {
  padding: 0 12px;
  color: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  text-decoration: none;
}

.user-info:hover {
  color: #1890ff;
}

.content {
  margin: 0;
  padding: 24px;
  background: #f0f2f5;
  flex: 1;
  overflow-y: auto;
  height: calc(100vh - 64px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }
  
  .sidebar.mobile-visible {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0 !important;
  }
  
  .header {
    padding: 0 16px;
  }
  
  .content {
    margin: 0;
    padding: 16px;
  }
}

/* 菜单项图标对齐优化 */
:deep(.ant-menu-item) {
  display: flex;
  align-items: center;
}

:deep(.ant-menu-item .anticon) {
  min-width: 14px;
  margin-right: 10px;
}

/* 收缩状态下的菜单优化 */
:deep(.ant-layout-sider-collapsed .ant-menu-item) {
  padding-left: 24px !important;
  padding-right: 24px !important;
}

:deep(.ant-layout-sider-collapsed .ant-menu-item .anticon) {
  margin-right: 0;
  font-size: 16px;
}
</style> 