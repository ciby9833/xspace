<template>
  <div class="game-host-container">
    <!-- 顶部状态栏 -->
    <div class="status-bar">
      <div class="status-info">
        <div class="status-item">
          <div class="status-label">当前状态</div>
          <div class="status-value" :class="getStatusClass()">
            {{ getCurrentStatusText() }}
          </div>
        </div>
        <div class="status-item">
          <div class="status-label">今日完成</div>
          <div class="status-value">{{ todayStats.completed_orders || 0 }}/{{ todayStats.total_orders || 0 }}</div>
        </div>
        <div class="status-item">
          <div class="status-label">服务人数</div>
          <div class="status-value">{{ todayStats.total_players || 0 }}人</div>
        </div>
      </div>
      <div class="status-actions">
        <a-button @click="handleRefresh" :loading="loading" type="text" class="refresh-btn">
          <ReloadOutlined />
          刷新
        </a-button>
      </div>
    </div>

    <!-- 当前订单卡片 -->
    <div v-if="currentOrder" class="current-order-section">
      <div class="section-header">
        <div class="section-title">
          <PlayCircleOutlined class="section-icon active" />
          <span>当前进行中</span>
        </div>
        <div class="order-timer">
          <ClockCircleOutlined />
          <span>{{ getOrderDuration() }}</span>
        </div>
      </div>
      
      <div class="current-order-card">
        <div class="order-header">
          <div class="customer-info">
            <div class="customer-name">{{ currentOrder.customer_name || '未知客户' }}</div>
            <div class="customer-phone">{{ currentOrder.customer_phone || '无电话' }}</div>
          </div>
          <div class="order-type">
            <a-tag :color="currentOrder.order_type === '剧本杀' ? 'blue' : 'green'">
              {{ currentOrder.order_type || '未知类型' }}
            </a-tag>
          </div>
        </div>
        
        <div class="order-content">
          <div class="content-name">
            {{ getOrderContentName() }}
          </div>
          <div class="order-details">
            <div class="detail-item">
              <EnvironmentOutlined />
              <span>{{ currentOrder.room_name || '未分配房间' }}</span>
            </div>
            <div class="detail-item">
              <UserOutlined />
              <span>{{ currentOrder.player_count || 0 }}人</span>
              <span v-if="currentOrder.support_player_count > 0" class="support-count">
                (+{{ currentOrder.support_player_count }})
              </span>
            </div>
            <div class="detail-item">
              <ClockCircleOutlined />
              <span>{{ formatTime(currentOrder.start_time) }} - {{ formatTime(currentOrder.end_time) }}</span>
            </div>
          </div>
        </div>
        
        <div class="order-actions">
          <a-button 
            type="primary" 
            size="large"
            @click="handleCompleteCurrentGame"
            :loading="completing"
            class="complete-btn"
          >
            <CheckCircleOutlined />
            完成游戏
          </a-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-current-order">
      <div class="empty-icon">
        <PlayCircleOutlined />
      </div>
      <div class="empty-text">暂无进行中的订单</div>
    </div>

    <!-- 订单列表 -->
    <div class="orders-section">
      <div class="section-header">
        <div class="section-title">
          <FileTextOutlined class="section-icon" />
          <span>今日订单</span>
        </div>
        <div class="section-filters">
          <a-date-picker
            v-model:value="selectedDate"
            @change="handleDateChange"
            :disabled-date="disabledDate"
            placeholder="选择日期"
            size="small"
          />
        </div>
      </div>

      <!-- 按状态分组的订单列表 -->
      <div class="orders-by-status">
        <!-- 待开始订单 -->
        <div v-if="confirmedOrders.length > 0" class="status-group">
          <div class="group-header confirmed">
            <div class="group-title">
              <div class="status-dot confirmed"></div>
              <span>待开始 ({{ confirmedOrders.length }})</span>
            </div>
          </div>
          <div class="order-cards">
            <div 
              v-for="order in confirmedOrders" 
              :key="order.id" 
              class="order-card confirmed"
            >
              <div class="card-header">
                <div class="customer-info">
                  <div class="customer-name">{{ order.customer_name || '未知客户' }}</div>
                  <div class="order-time">{{ formatTime(order.start_time) }} - {{ formatTime(order.end_time) }}</div>
                </div>
                <div class="card-actions">
                  <a-button 
                    type="primary"
                    size="small"
                    @click="handleStartGame(order)"
                    :loading="starting === order.id"
                    class="start-btn"
                  >
                    开始游戏
                  </a-button>
                  <a-dropdown :trigger="['click']">
                    <a-button size="small" class="more-btn">
                      <MoreOutlined />
                    </a-button>
                    <template #overlay>
                      <a-menu>
                        <a-menu-item @click="handleEditOrder(order)">
                          <EditOutlined />
                          编辑订单
                        </a-menu-item>
                        <a-menu-item @click="handleViewDetail(order)">
                          <EyeOutlined />
                          查看详情
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </div>
              </div>
              
              <div class="card-content">
                <div class="content-title">
                  <a-tag :color="order.order_type === '剧本杀' ? 'blue' : 'green'" size="small">
                    {{ order.order_type || '未知类型' }}
                  </a-tag>
                  <span class="content-name">
                    {{ getCardContentName(order) }}
                  </span>
                </div>
                
                <div class="card-details">
                  <div class="detail-row">
                    <EnvironmentOutlined />
                    <span>{{ order.room_name || '未分配房间' }}</span>
                  </div>
                  <div class="detail-row">
                    <UserOutlined />
                    <span>{{ order.player_count || 0 }}人</span>
                    <span v-if="order.support_player_count > 0" class="support-count">
                      (+{{ order.support_player_count }})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 进行中订单 -->
        <div v-if="inProgressOrders.length > 0" class="status-group">
          <div class="group-header in-progress">
            <div class="group-title">
              <div class="status-dot in-progress"></div>
              <span>进行中 ({{ inProgressOrders.length }})</span>
            </div>
          </div>
          <div class="order-cards">
            <div 
              v-for="order in inProgressOrders" 
              :key="order.id" 
              class="order-card in-progress"
            >
              <div class="card-header">
                <div class="customer-info">
                  <div class="customer-name">{{ order.customer_name || '未知客户' }}</div>
                  <div class="order-time">{{ formatTime(order.start_time) }} - {{ formatTime(order.end_time) }}</div>
                </div>
                <div class="card-actions">
                  <a-button 
                    type="primary"
                    size="small"
                    @click="handleCompleteGame(order)"
                    :loading="completing === order.id"
                    class="complete-btn"
                  >
                    完成游戏
                  </a-button>
                  <a-dropdown :trigger="['click']">
                    <a-button size="small" class="more-btn">
                      <MoreOutlined />
                    </a-button>
                    <template #overlay>
                      <a-menu>
                        <a-menu-item @click="handleEditOrder(order)">
                          <EditOutlined />
                          编辑订单
                        </a-menu-item>
                        <a-menu-item @click="handleViewDetail(order)">
                          <EyeOutlined />
                          查看详情
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </div>
              </div>
              
              <div class="card-content">
                <div class="content-title">
                  <a-tag :color="order.order_type === '剧本杀' ? 'blue' : 'green'" size="small">
                    {{ order.order_type || '未知类型' }}
                  </a-tag>
                  <span class="content-name">
                    {{ getCardContentName(order) }}
                  </span>
                </div>
                
                <div class="card-details">
                  <div class="detail-row">
                    <EnvironmentOutlined />
                    <span>{{ order.room_name || '未分配房间' }}</span>
                  </div>
                  <div class="detail-row">
                    <UserOutlined />
                    <span>{{ order.player_count || 0 }}人</span>
                    <span v-if="order.support_player_count > 0" class="support-count">
                      (+{{ order.support_player_count }})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 已完成订单 -->
        <div v-if="completedOrders.length > 0" class="status-group">
          <div class="group-header completed">
            <div class="group-title">
              <div class="status-dot completed"></div>
              <span>已完成 ({{ completedOrders.length }})</span>
            </div>
          </div>
          <div class="order-cards">
            <div 
              v-for="order in completedOrders" 
              :key="order.id" 
              class="order-card completed"
            >
              <div class="card-header">
                <div class="customer-info">
                  <div class="customer-name">{{ order.customer_name || '未知客户' }}</div>
                  <div class="order-time">{{ formatTime(order.start_time) }} - {{ formatTime(order.end_time) }}</div>
                </div>
                <div class="card-actions">
                  <a-dropdown :trigger="['click']">
                    <a-button size="small" class="more-btn">
                      <MoreOutlined />
                    </a-button>
                    <template #overlay>
                      <a-menu>
                        <a-menu-item @click="handleViewDetail(order)">
                          <EyeOutlined />
                          查看详情
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </div>
              </div>
              
              <div class="card-content">
                <div class="content-title">
                  <a-tag :color="order.order_type === '剧本杀' ? 'blue' : 'green'" size="small">
                    {{ order.order_type || '未知类型' }}
                  </a-tag>
                  <span class="content-name">
                    {{ getCardContentName(order) }}
                  </span>
                </div>
                
                <div class="card-details">
                  <div class="detail-row">
                    <EnvironmentOutlined />
                    <span>{{ order.room_name || '未分配房间' }}</span>
                  </div>
                  <div class="detail-row">
                    <UserOutlined />
                    <span>{{ order.player_count || 0 }}人</span>
                    <span v-if="order.support_player_count > 0" class="support-count">
                      (+{{ order.support_player_count }})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="orders.length === 0 && !loading" class="empty-orders">
          <FileTextOutlined class="empty-icon" />
          <div class="empty-text">暂无订单</div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <a-spin size="large" />
          <div>加载中...</div>
        </div>
      </div>
    </div>

    <!-- 底部统计信息 -->
    <div class="bottom-stats">
      <div class="stat-item">
        <div class="stat-value">{{ todayStats.total_orders || 0 }}</div>
        <div class="stat-label">总订单</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ todayStats.completed_orders || 0 }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ todayStats.total_players || 0 }}</div>
        <div class="stat-label">总人数</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ todayStats.total_support_players || 0 }}</div>
        <div class="stat-label">补位</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, h, onErrorCaptured, computed, onBeforeUnmount } from 'vue'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  PlayCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  ReloadOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  MoreOutlined
} from '@ant-design/icons-vue'
import * as gameHostAPI from '@/api/gameHost'

// 响应式数据 - 使用更安全的初始化
const loading = ref(false)
const starting = ref(null)
const completing = ref(null)
const currentOrder = ref(null)
const orders = ref([])
const selectedDate = ref(dayjs())

// 今日统计数据 - 使用更安全的初始化
const todayStats = reactive({
  total_orders: 0,
  confirmed_orders: 0,
  in_progress_orders: 0,
  completed_orders: 0,
  script_orders: 0,
  escape_room_orders: 0,
  total_players: 0,
  total_support_players: 0
})

// 计算属性 - 按状态分组订单，添加安全检查
const confirmedOrders = computed(() => {
  try {
    return Array.isArray(orders.value) ? orders.value.filter(order => order && order.status === 'confirmed') : []
  } catch (error) {
    console.error('计算confirmedOrders失败:', error)
    return []
  }
})

const inProgressOrders = computed(() => {
  try {
    return Array.isArray(orders.value) ? orders.value.filter(order => order && order.status === 'in_progress') : []
  } catch (error) {
    console.error('计算inProgressOrders失败:', error)
    return []
  }
})

const completedOrders = computed(() => {
  try {
    return Array.isArray(orders.value) ? orders.value.filter(order => order && order.status === 'completed') : []
  } catch (error) {
    console.error('计算completedOrders失败:', error)
    return []
  }
})

// 错误捕获 - 增强错误处理
onErrorCaptured((error, instance, info) => {
  console.error('GameHostView 错误捕获:', error, info)
  
  // 特殊处理delay相关错误
  if (error.message && error.message.includes('delay')) {
    console.warn('捕获到delay相关错误，可能是Ant Design Vue内部问题')
    return false // 阻止错误继续传播
  }
  
  // 尝试恢复状态
  try {
    if (error.message && error.message.includes('Cannot read properties of null')) {
      console.log('尝试恢复组件状态...')
      nextTick(() => {
        // 重新初始化可能有问题的数据
        if (!Array.isArray(orders.value)) {
          orders.value = []
        }
        if (!currentOrder.value || typeof currentOrder.value !== 'object') {
          currentOrder.value = null
        }
      })
    }
  } catch (recoveryError) {
    console.error('状态恢复失败:', recoveryError)
  }
  
  return false
})

// 生命周期 - 增强初始化
onMounted(async () => {
  try {
    await nextTick()
    console.log('GameHostView 组件挂载完成')
    
    // 确保数据结构正确初始化
    if (!Array.isArray(orders.value)) {
      orders.value = []
    }
    
    await handleRefresh()
  } catch (error) {
    console.error('组件初始化失败:', error)
    message.error('页面初始化失败，请刷新重试')
  }
})

// 清理函数
onBeforeUnmount(() => {
  // 清理可能的定时器或监听器
  starting.value = null
  completing.value = null
})

// 工具函数 - 增强错误处理
const formatTime = (time) => {
  if (!time) return '--:--'
  try {
    return dayjs(time, 'HH:mm:ss').format('HH:mm')
  } catch (error) {
    console.error('formatTime错误:', error)
    return '--:--'
  }
}

const getStatusClass = () => {
  try {
    if (currentOrder.value && currentOrder.value.status === 'in_progress') {
      return 'status-active'
    }
    return 'status-idle'
  } catch (error) {
    console.error('计算状态类名失败:', error)
    return 'status-idle'
  }
}

const getCurrentStatusText = () => {
  try {
    if (currentOrder.value && currentOrder.value.status === 'in_progress') {
      return '游戏进行中'
    }
    return '等待订单'
  } catch (error) {
    console.error('计算状态文本失败:', error)
    return '等待订单'
  }
}

const getOrderDuration = () => {
  try {
    if (!currentOrder.value || !currentOrder.value.actual_start_time) return '未开始'
    
    const startTime = dayjs(currentOrder.value.actual_start_time)
    const now = dayjs()
    const duration = now.diff(startTime, 'minute')
    
    if (isNaN(duration) || duration < 0) return '计算中'
    
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    }
    return `${minutes}分钟`
  } catch (error) {
    console.error('计算游戏时长失败:', error)
    return '计算中'
  }
}

const getOrderContentName = () => {
  try {
    if (!currentOrder.value) return '未知剧本或密室'
    if (currentOrder.value.order_type === '剧本杀') {
      return currentOrder.value.current_script_name || currentOrder.value.script_name || '未知剧本'
    } else {
      return currentOrder.value.current_escape_room_name || currentOrder.value.escape_room_name || '未知密室'
    }
  } catch (error) {
    console.error('获取订单内容名称失败:', error)
    return '未知剧本或密室'
  }
}

const getCardContentName = (order) => {
  try {
    if (!order) return '未知剧本或密室'
    if (order.order_type === '剧本杀') {
      return order.current_script_name || order.script_name || '未知剧本'
    } else {
      return order.current_escape_room_name || order.escape_room_name || '未知密室'
    }
  } catch (error) {
    console.error('获取卡片内容名称失败:', error)
    return '未知剧本或密室'
  }
}

const disabledDate = (current) => {
  try {
    return current && current > dayjs().add(30, 'day')
  } catch (error) {
    console.error('日期禁用检查失败:', error)
    return false
  }
}

// 数据加载方法 - 增强错误处理
const handleRefresh = async () => {
  try {
    console.log('开始加载数据...')
    
    // 并行加载数据，但增加错误隔离
    const promises = [
      loadCurrentOrder().catch(err => {
        console.error('加载当前订单失败:', err)
        currentOrder.value = null
        return null
      }),
      loadTodayStats().catch(err => {
        console.error('加载统计数据失败:', err)
        return null
      }),
      loadOrders().catch(err => {
        console.error('加载订单列表失败:', err)
        orders.value = []
        return null
      })
    ]
    
    await Promise.allSettled(promises)
    console.log('数据加载完成')
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('数据加载失败，请重试')
  }
}

const loadCurrentOrder = async () => {
  try {
    console.log('正在加载当前订单...')
    const response = await gameHostAPI.getCurrentOrder()
    console.log('当前订单响应:', response)
    
    if (response && response.success && response.data) {
      // 确保数据结构完整
      currentOrder.value = {
        ...response.data,
        customer_name: response.data.customer_name || '未知客户',
        customer_phone: response.data.customer_phone || '无电话',
        order_type: response.data.order_type || '未知类型',
        room_name: response.data.room_name || '未分配房间',
        player_count: response.data.player_count || 0,
        support_player_count: response.data.support_player_count || 0
      }
      console.log('当前订单设置成功:', currentOrder.value)
    } else {
      currentOrder.value = null
      console.log('没有当前订单')
    }
  } catch (error) {
    console.error('加载当前订单失败:', error)
    currentOrder.value = null
  }
}

const loadTodayStats = async () => {
  try {
    console.log('正在加载统计数据...')
    const response = await gameHostAPI.getTodayStats()
    console.log('统计数据响应:', response)
    
    if (response && response.success && response.data) {
      const stats = response.data
      // 安全地更新统计数据
      Object.keys(todayStats).forEach(key => {
        if (stats.hasOwnProperty(key)) {
          const value = parseInt(stats[key])
          todayStats[key] = isNaN(value) ? 0 : value
        }
      })
      console.log('统计数据更新完成:', todayStats)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const loadOrders = async () => {
  loading.value = true
  try {
    console.log('正在加载订单列表...')
    const params = {
      start_date: selectedDate.value.format('YYYY-MM-DD'),
      end_date: selectedDate.value.format('YYYY-MM-DD')
    }
    
    console.log('订单查询参数:', params)
    const response = await gameHostAPI.getGameHostOrders(params)
    console.log('订单列表响应:', response)
    
    if (response && response.success && Array.isArray(response.data)) {
      // 确保每个订单数据结构完整
      orders.value = response.data.map(order => ({
        ...order,
        customer_name: order.customer_name || '未知客户',
        order_type: order.order_type || '未知类型',
        room_name: order.room_name || '未分配房间',
        player_count: order.player_count || 0,
        support_player_count: order.support_player_count || 0
      }))
      console.log('订单列表更新完成，共', orders.value.length, '条订单')
    } else {
      orders.value = []
      console.log('订单列表为空或格式错误')
    }
  } catch (error) {
    console.error('加载订单失败:', error)
    message.error('加载订单失败')
    orders.value = []
  } finally {
    loading.value = false
  }
}

// 事件处理 - 增强错误处理
const handleDateChange = () => {
  try {
    loadOrders()
  } catch (error) {
    console.error('日期变更处理失败:', error)
  }
}

const handleStartGame = async (order) => {
  if (!order || !order.id) {
    console.error('开始游戏失败：订单信息无效', order)
    message.error('订单信息无效')
    return
  }
  
  try {
    const result = await Modal.confirm({
      title: '确认开始游戏',
      icon: h(ExclamationCircleOutlined),
      content: `确定要开始 ${order.customer_name || '未知客户'} 的游戏吗？`,
      okText: '确定',
      cancelText: '取消'
    })
    
    if (result) {
      starting.value = order.id
      try {
        console.log('正在开始游戏，订单ID:', order.id)
        const response = await gameHostAPI.startGame(order.id)
        console.log('开始游戏响应:', response)
        
        if (response && response.success) {
          message.success('游戏开始成功')
          await handleRefresh()
        } else {
          throw new Error(response?.message || '开始游戏失败')
        }
      } catch (error) {
        console.error('开始游戏失败:', error)
        const errorMessage = error.response?.data?.error || error.message || '开始游戏失败'
        message.error(errorMessage)
      } finally {
        starting.value = null
      }
    }
  } catch (error) {
    console.error('开始游戏确认失败:', error)
    starting.value = null
  }
}

const handleCompleteGame = async (order) => {
  if (!order || !order.id) {
    console.error('完成游戏失败：订单信息无效', order)
    message.error('订单信息无效')
    return
  }
  
  try {
    const result = await Modal.confirm({
      title: '确认完成游戏',
      icon: h(ExclamationCircleOutlined),
      content: `确定要完成 ${order.customer_name || '未知客户'} 的游戏吗？`,
      okText: '确定',
      cancelText: '取消'
    })
    
    if (result) {
      completing.value = order.id
      try {
        console.log('正在完成游戏，订单ID:', order.id)
        const response = await gameHostAPI.completeGame(order.id, {
          game_host_notes: '游戏完成'
        })
        console.log('完成游戏响应:', response)
        
        if (response && response.success) {
          message.success('游戏完成成功')
          await handleRefresh()
        } else {
          throw new Error(response?.message || '完成游戏失败')
        }
      } catch (error) {
        console.error('完成游戏失败:', error)
        const errorMessage = error.response?.data?.error || error.message || '完成游戏失败'
        message.error(errorMessage)
      } finally {
        completing.value = null
      }
    }
  } catch (error) {
    console.error('完成游戏确认失败:', error)
    completing.value = null
  }
}

const handleCompleteCurrentGame = () => {
  if (currentOrder.value) {
    handleCompleteGame(currentOrder.value)
  }
}

const handleEditOrder = (order) => {
  try {
    message.info('编辑功能开发中...')
  } catch (error) {
    console.error('编辑订单失败:', error)
  }
}

const handleViewDetail = (order) => {
  try {
    message.info('详情功能开发中...')
  } catch (error) {
    console.error('查看详情失败:', error)
  }
}
</script>

<style scoped>
.game-host-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f2f5 0%, #e6f7ff 100%);
  padding: 0;
}

/* 状态栏 */
.status-bar {
  background: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.status-info {
  display: flex;
  gap: 32px;
}

.status-item {
  text-align: center;
}

.status-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.status-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.status-value.status-active {
  color: #52c41a;
}

.status-value.status-idle {
  color: #8c8c8c;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
}

/* 当前订单区域 */
.current-order-section {
  padding: 20px;
  background: white;
  margin: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.section-icon {
  font-size: 18px;
}

.section-icon.active {
  color: #52c41a;
  animation: pulse 2s infinite;
}

.order-timer {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 14px;
}

.current-order-card {
  background: #f6ffed;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #b7eb8f;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.customer-info {
  flex: 1;
}

.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.customer-phone {
  font-size: 14px;
  color: #666;
}

.order-content {
  margin-bottom: 16px;
}

.content-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.order-details {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 13px;
}

.support-count {
  color: #fa8c16;
  font-weight: 500;
}

.order-actions {
  display: flex;
  justify-content: center;
}

.complete-btn {
  height: 36px;
  border-radius: 6px;
  font-weight: 500;
  min-width: 100px;
}

/* 空状态 */
.empty-current-order {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  background: white;
  margin: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 16px;
}

/* 订单列表区域 */
.orders-section {
  background: white;
  margin: 16px;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-filters {
  display: flex;
  gap: 8px;
}

/* 按状态分组 */
.orders-by-status {
  margin-top: 16px;
}

.status-group {
  margin-bottom: 24px;
}

.group-header {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.group-header.confirmed {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
}

.group-header.in-progress {
  background: #fff2e8;
  border: 1px solid #ffbb96;
}

.group-header.completed {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #333;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.confirmed {
  background: #1890ff;
}

.status-dot.in-progress {
  background: #fa8c16;
}

.status-dot.completed {
  background: #52c41a;
}

/* 订单卡片 */
.order-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.order-card {
  background: white;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.order-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.order-card.confirmed {
  border-left: 4px solid #1890ff;
}

.order-card.in-progress {
  border-left: 4px solid #fa8c16;
}

.order-card.completed {
  border-left: 4px solid #52c41a;
  opacity: 0.8;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.order-time {
  font-size: 12px;
  color: #666;
}

.card-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.start-btn {
  background: #1890ff;
  border-color: #1890ff;
  font-size: 12px;
}

.complete-btn {
  background: #fa8c16;
  border-color: #fa8c16;
  font-size: 12px;
}

.more-btn {
  border: none;
  box-shadow: none;
  color: #666;
}

.card-content {
  margin-bottom: 0;
}

.content-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.content-name {
  font-weight: 500;
  color: #333;
  flex: 1;
  font-size: 13px;
}

.card-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 12px;
}

/* 空状态和加载状态 */
.empty-orders, .loading-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty-orders .empty-icon {
  font-size: 48px;
  color: #d9d9d9;
  margin-bottom: 16px;
}

/* 底部统计 */
.bottom-stats {
  display: flex;
  justify-content: space-around;
  background: white;
  padding: 16px;
  margin: 0 16px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

/* 动画效果 */
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .status-info {
    gap: 16px;
  }
  
  .status-item {
    min-width: 60px;
  }
  
  .current-order-section,
  .orders-section {
    margin: 8px;
    padding: 16px;
  }
  
  .section-filters {
    flex-direction: column;
    gap: 8px;
  }
  
  .order-cards {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .card-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .start-btn,
  .complete-btn {
    width: 100%;
  }
  
  .bottom-stats {
    margin: 0 8px 8px;
  }
}

@media (min-width: 1200px) {
  .order-cards {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}
</style> 