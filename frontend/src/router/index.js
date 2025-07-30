import { createRouter, createWebHistory } from 'vue-router'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/components/layout/MainLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: '主控台' }
      },
      {
        path: '/company',
        name: 'Company',
        component: () => import('@/views/CompanyView.vue'),
        meta: { 
          title: '公司管理',
          permission: 'company.view'
        }
      },
      {
        path: '/stores',
        name: 'Stores',
        component: () => import('@/views/StoreView.vue'),
        meta: { 
          title: '门店管理',
          permission: 'store.view'
        }
      },
      {
        path: '/users',
        name: 'Users',
        component: () => import('@/views/UserView.vue'),
        meta: { 
          title: '用户管理',
          permission: 'user.view'
        }
      },
      {
        path: '/scripts',
        name: 'Scripts',
        component: () => import('@/views/ScriptView.vue'),
        meta: { 
          title: '剧本管理',
          permission: 'script.view'
        }
      },
      {
        path: '/escape-rooms',
        name: 'EscapeRooms',
        component: () => import('@/views/EscapeRoomView.vue'),
        meta: { 
          title: '密室管理',
          permission: 'escape_room.view'
        }
      },
      {
        path: '/orders',
        name: 'Orders',
        component: () => import('@/views/OrderView.vue'),
        meta: { 
          title: '订单管理',
          permission: 'order.view'
        }
      },
      {
        path: '/booking',
        name: 'Booking',
        component: () => import('@/views/BookingView.vue'),
        meta: { 
          title: '在线预订',
          permission: 'order.view'
        }
      },
      {
        path: '/game-host',
        name: 'GameHost',
        component: () => import('@/views/GameHostView.vue'),
        meta: { 
          title: 'Game Host',
          permission: 'game_host.view'
        }
      },
      {
        path: '/permissions',
        name: 'Permissions',
        component: () => import('@/views/PermissionView.vue'),
        meta: { 
          title: '权限管理',
          permission: 'system.permission'
        }
      },
      {
        path: '/role-pricing',
        name: 'RolePricing',
        component: () => import('@/views/RolePricingView.vue'),
        meta: { 
          title: '角色定价模板',
          permission: 'role.pricing.view'
        }
      },
      {
        path: '/pricing-calendar',
        name: 'PricingCalendar',
        component: () => import('@/views/PricingCalendarView.vue'),
        meta: { 
          title: '定价日历',
          permission: 'pricing.calendar.view'
        }
      },
      {
        path: '/payment-query',
        name: 'PaymentQuery',
        component: () => import('@/views/PaymentQueryView.vue'),
        meta: { 
          title: '支付查询',
          permission: 'order.view'
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  console.log('路由跳转:', from.path, '->', to.path)
  console.log('认证状态:', authStore.isLoggedIn)
  console.log('用户信息:', {
    role: authStore.userRole,
    account_level: authStore.accountLevel,
    company_id: authStore.companyId
  })
  
  // 检查是否需要登录
  if (to.meta.requiresAuth !== false && !authStore.isLoggedIn) {
    console.log('需要登录，跳转到登录页')
    next('/login')
    return
  }
  
  // 已登录用户访问登录页，重定向到主页
  if (to.path === '/login' && authStore.isLoggedIn) {
    console.log('已登录，跳转到主页')
    next('/dashboard')
    return
  }
  
  // 检查页面访问权限
  if (authStore.isLoggedIn && to.meta.permission) {
    if (!authStore.hasPermission(to.meta.permission)) {
      console.log('权限不足，拒绝访问:', to.path)
      message.error('您没有权限访问此页面')
      next('/dashboard')
      return
    }
  }
  
  console.log('路由守卫通过')
  next()
})

export default router 