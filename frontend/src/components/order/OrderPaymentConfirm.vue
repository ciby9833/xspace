<template>
  <div class="payment-confirm-container">
    <a-spin :spinning="loading" tip="加载中...">
      <!-- 预订信息摘要卡片 -->
      <div class="booking-summary-card">
        <div class="compact-header">
          <CheckCircleOutlined class="header-icon" />
          <span class="header-title">预订信息确认</span>
        </div>
        <div class="booking-info-grid">
          <div class="info-item">
            <label>项目名称</label>
            <span class="value">{{ bookingData.item_name }}</span>
          </div>
          <div class="info-item">
            <label>门店</label>
            <span class="value">{{ bookingData.store_name }}</span>
          </div>
          <div class="info-item">
            <label>房间</label>
            <span class="value">{{ bookingData.room_name }}</span>
          </div>
          <div class="info-item">
            <label>日期</label>
            <span class="value highlight">{{ formatDateWithWeekday(bookingData.date) }}</span>
          </div>
          <div class="info-item">
            <label>时间</label>
            <span class="value highlight">{{ bookingData.start_time }} - {{ bookingData.end_time }}</span>
          </div>
        </div>
      </div>

      <!-- 客户信息卡片 -->
      <div class="form-card">
        <div class="compact-header">
          <UserOutlined class="header-icon" />
          <span class="header-title">客户信息</span>
        </div>
        <div class="form-grid">
          <div class="form-item">
            <label class="required">游戏人数</label>
            <a-input-number 
              v-model:value="formData.player_count"
              :min="1"
              :max="20"
              placeholder="请输入人数"
              class="full-width"
            />
          </div>
          
          <div class="form-item">
            <label class="required">客户姓名</label>
            <a-input 
              v-model:value="formData.customer_name"
              placeholder="请输入客户姓名"
            />
          </div>
          
          <div class="form-item">
            <label>客户电话</label>
            <a-input 
              v-model:value="formData.customer_phone"
              placeholder="请输入客户电话（选填）"
            />
          </div>
          

        </div>
      </div>

      <!-- 工作人员配置卡片 -->
      <div class="form-card">
        <div class="compact-header">
          <TeamOutlined class="header-icon" />
          <span class="header-title">工作人员配置</span>
        </div>
        <div class="form-grid">
          <div class="form-item">
            <label class="required">Game Host</label>
            <a-select 
              v-model:value="formData.game_host_id"
              placeholder="请选择Game Host"
              :loading="loadingHosts"
              class="full-width"
              show-search
              :filter-option="filterOption"
            >
              <a-select-option 
                v-for="host in gameHosts" 
                :key="host.user_id" 
                :value="host.user_id"
              >
                <div class="staff-option">
                  <UserOutlined />
                  <span>{{ host.username }}</span>
                  <span class="real-name">({{ host.real_name || host.username }})</span>
                </div>
              </a-select-option>
            </a-select>
          </div>
          
          <div class="form-item">
            <label>PIC 负责人</label>
            <a-select 
              v-model:value="formData.pic_id"
              placeholder="请选择PIC（选填）"
              :loading="loadingHosts"
              class="full-width"
              allowClear
              show-search
              :filter-option="filterOption"
            >
              <a-select-option 
                v-for="host in gameHosts" 
                :key="host.user_id" 
                :value="host.user_id"
              >
                <div class="staff-option">
                  <UserOutlined />
                  <span>{{ host.username }}</span>
                  <span class="real-name">({{ host.real_name || host.username }})</span>
                </div>
              </a-select-option>
            </a-select>
          </div>
          
          <!-- 🆕 密室NPC角色选择 -->
          <div v-if="bookingData.item_type === 'escape_room' && escapeRoomNpcRoles.length > 0" class="form-item full-width">
            <label>NPC角色</label>
            <a-select 
              v-model:value="formData.escape_room_npc_roles"
              mode="multiple"
              placeholder="请选择NPC角色（可多选）"
              class="full-width"
              allowClear
              show-search
              :filter-option="filterNpcOption"
            >
              <a-select-option 
                v-for="role in escapeRoomNpcRoles" 
                :key="role" 
                :value="role"
              >
                <div class="npc-role-option">
                  <TeamOutlined />
                  <span>{{ role }}</span>
                </div>
              </a-select-option>
            </a-select>
            <small class="npc-role-hint">
              该密室共有{{ escapeRoomNpcRoles.length }}个NPC角色可选，可根据需要选择多个角色
            </small>
          </div>
          
          <!-- PIC Payment 改为隐藏的文本字段 -->
          <div class="form-item" style="display: none;">
            <label>PIC Payment</label>
            <a-input 
              v-model:value="formData.pic_payment"
              placeholder="PIC Payment"
            />
          </div>
        </div>
      </div>

      <!-- 订单状态卡片 -->
      <div class="form-card">
        <div class="compact-header">
          <CheckCircleOutlined class="header-icon" />
          <span class="header-title">订单状态</span>
        </div>
        <div class="form-grid">
          <div class="form-item">
            <label class="required">订单状态</label>
            <a-select 
              v-model:value="formData.status"
              placeholder="请选择订单状态"
              class="full-width"
            >
              <a-select-option value="pending">
                <ClockCircleOutlined style="color: #faad14" /> 待确认
              </a-select-option>
              <a-select-option value="confirmed">
                <CheckCircleOutlined style="color: #52c41a" /> 已确认
              </a-select-option>
            </a-select>
          </div>
        </div>
      </div>

      <!-- 支付信息卡片 -->
      <div class="form-card">
        <div class="compact-header">
          <CreditCardOutlined class="header-icon" />
          <span class="header-title">支付信息</span>
        </div>
        <div class="payment-section">
          <!-- Free/Pay 选择 -->
          <div class="payment-type-selector">
            <label class="required">支付类型</label>
            <a-radio-group 
              v-model:value="formData.free_pay" 
              class="payment-radio-group"
              @change="handlePaymentTypeChange"
            >
              <a-radio-button value="Free" class="free-option">
                <GiftOutlined /> Free
              </a-radio-button>
              <a-radio-button value="Pay" class="pay-option">
                <DollarOutlined /> Pay
              </a-radio-button>
            </a-radio-group>
          </div>
          
          <!-- 费用计算 -->
          <div v-if="formData.free_pay === 'Pay'" class="payment-details">
            <div class="form-grid">
              <div class="form-item">
                <label>单价</label>
                <a-input-number 
                  v-model:value="formData.unit_price"
                  :min="0"
                  placeholder="剧本/密室单价"
                  class="full-width"
                  :formatter="value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/Rp\s?|(,*)/g, '')"
                  @change="calculateAmounts"
                  readonly
                />
              </div>
              
              <div class="form-item">
                <label class="required">总金额</label>
                <a-input-number 
                  v-model:value="formData.total_amount"
                  :min="0"
                  placeholder="自动计算：人数 × 单价"
                  class="full-width"
                  :formatter="value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/Rp\s?|(,*)/g, '')"
                  @change="calculateRemainingAmount"
                />
                <small class="calculation-note">
                  自动计算：{{ formData.player_count || 0 }} 人 × Rp {{ formatPrice(formData.unit_price || 0) }} = Rp {{ formatPrice((formData.player_count || 0) * (formData.unit_price || 0)) }}
                </small>
              </div>
              
              <div class="form-item">
                <label class="required">支付状态</label>
                <a-select 
                  v-model:value="formData.payment_status"
                  placeholder="请选择支付状态"
                  class="full-width"
                  @change="handlePaymentStatusChange"
                >
                  <a-select-option value="FULL">
                    <CheckCircleOutlined style="color: #52c41a" /> FULL (已全付)
                  </a-select-option>
                  <a-select-option value="DP">
                    <ClockCircleOutlined style="color: #faad14" /> DP (定金)
                  </a-select-option>
                  <a-select-option value="Not Yet">
                    <ExclamationCircleOutlined style="color: #ff4d4f" /> Not Yet (未付)
                  </a-select-option>
                </a-select>
              </div>
              
              <div class="form-item">
                <label class="required">付款方式</label>
                <a-select 
                  v-model:value="formData.payment_method"
                  placeholder="请选择付款方式"
                  class="full-width"
                >
                  <a-select-option value="Bank Transfer">
                    <BankOutlined /> Bank Transfer
                  </a-select-option>
                  <a-select-option value="QR BCA">
                    <QrcodeOutlined /> QR BCA
                  </a-select-option>
                  <a-select-option value="DEBIT">
                    <CreditCardOutlined /> DEBIT
                  </a-select-option>
                  <a-select-option value="CC">
                    <CreditCardOutlined /> CC
                  </a-select-option>
                </a-select>
              </div>
              
              <div v-if="formData.payment_status === 'DP'" class="form-item">
                <label>预付金额</label>
                <a-input-number 
                  v-model:value="formData.prepaid_amount"
                  :min="0"
                  :max="formData.total_amount"
                  placeholder="请输入预付金额（选填）"
                  class="full-width"
                  :formatter="value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/Rp\s?|(,*)/g, '')"
                  @change="calculateRemainingAmount"
                />
              </div>
              
              <div v-if="formData.payment_status === 'DP'" class="form-item">
                <label>剩余应付金额</label>
                <a-input-number 
                  v-model:value="formData.remaining_amount"
                  :min="0"
                  placeholder="自动计算：总金额 - 预付金额"
                  class="full-width calculated-field"
                  :formatter="value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                  :parser="value => value.replace(/Rp\s?|(,*)/g, '')"
                  readonly
                />
                <small class="calculation-note">自动计算：Rp {{ formatPrice(formData.total_amount || 0) }} - Rp {{ formatPrice(formData.prepaid_amount || 0) }}</small>
              </div>
            </div>
          </div>
          
          <!-- 免费情况 -->
          <div v-else-if="formData.free_pay === 'Free'" class="free-notice">
            <a-alert 
              message="免费游戏" 
              description="此订单为免费游戏，无需支付费用" 
              type="success" 
              show-icon 
            />
          </div>
        </div>
      </div>

      <!-- 预订类型和促销卡片 -->
      <div class="form-card">
        <div class="compact-header">
          <TagOutlined class="header-icon" />
          <span class="header-title">预订详情</span>
        </div>
        <div class="form-grid">
          <div class="form-item">
            <label class="required">预订类型</label>
            <a-select 
              v-model:value="formData.booking_type"
              placeholder="请选择预订类型"
              class="full-width"
            >
              <a-select-option value="Booking">📅 Booking</a-select-option>
              <a-select-option value="Walk In">🚶 Walk In</a-select-option>
              <a-select-option value="Traveloka">✈️ Traveloka</a-select-option>
              <a-select-option value="Tiket.com">🎫 Tiket.com</a-select-option>
              <a-select-option value="Gamehost/Staff Booking">👨‍💼 Gamehost/Staff Booking</a-select-option>
              <a-select-option value="MyValue（Gramedia）">📚 MyValue（Gramedia）</a-select-option>
              <a-select-option value="Promo">🎉 Promo</a-select-option>
              <a-select-option value="Group Booking">👥 始发拼团</a-select-option>
              <a-select-option value="Online Booking">💻 线上预订</a-select-option>
              <a-select-option value="Phone Booking">📞 电话预订</a-select-option>
            </a-select>
          </div>
          
          <div class="form-item">
            <label>促销数量</label>
            <a-input-number 
              v-model:value="formData.promo_quantity"
              :min="0"
              placeholder="请输入促销数量（选填）"
              class="full-width"
            />
          </div>
          
          <!-- 🆕 始发拼团选项 -->
          <div class="form-item">
            <label>是否始发拼团</label>
            <a-radio-group v-model:value="formData.is_group_booking" class="radio-group">
              <a-radio :value="false">否</a-radio>
              <a-radio :value="true">是</a-radio>
            </a-radio-group>
          </div>
        </div>
      </div>

      <!-- 🆕 密室专用选项卡片 -->
      <div v-if="bookingData.item_type === 'escape_room'" class="form-card">
        <div class="compact-header">
          <HomeOutlined class="header-icon" />
          <span class="header-title">密室专用选项</span>
        </div>
        <div class="form-grid">
          <div class="form-item">
            <label>是否包含CCTV</label>
            <a-radio-group v-model:value="formData.include_cctv" class="radio-group">
              <a-radio :value="false">否</a-radio>
              <a-radio :value="true">是</a-radio>
            </a-radio-group>
          </div>
          
          <div class="form-item">
            <label>是否包含拍照</label>
            <a-radio-group v-model:value="formData.include_photos" class="radio-group">
              <a-radio :value="false">否</a-radio>
              <a-radio :value="true">是</a-radio>
            </a-radio-group>
          </div>
        </div>
      </div>

      <!-- 付款凭证拍照卡片 -->
      <div v-if="formData.free_pay === 'Pay'" class="form-card">
        <div class="compact-header">
          <CameraOutlined class="header-icon" />
          <span class="header-title">付款凭证</span>
          <span class="header-subtitle">拍摄客户付款凭证图片</span>
        </div>
        
        <div class="photo-section">
          <!-- 拍照按钮 -->
          <div class="photo-actions">
            <a-button 
              type="primary" 
              @click="openCamera"
              :loading="cameraLoading"
              class="camera-btn"
            >
              <CameraOutlined />
              拍摄付款凭证
            </a-button>
            
            <a-upload
              :file-list="[]"
              :before-upload="handleFileUpload"
              accept="image/*"
              :show-upload-list="false"
            >
              <a-button class="upload-btn">
                <UploadOutlined />
                从相册选择
              </a-button>
            </a-upload>
          </div>
          
          <!-- 图片预览 -->
          <div v-if="paymentImages.length > 0" class="images-preview">
            <div class="images-grid">
              <div 
                v-for="(image, index) in paymentImages" 
                :key="index"
                class="image-item"
              >
                <img :src="image.url" :alt="`付款凭证${index + 1}`" />
                <div class="image-overlay">
                  <a-button 
                    type="text" 
                    size="small" 
                    @click="previewImage(image.url)"
                    class="preview-btn"
                  >
                    <EyeOutlined />
                  </a-button>
                  <a-button 
                    type="text" 
                    size="small" 
                    @click="removeImage(index)"
                    class="remove-btn"
                  >
                    <DeleteOutlined />
                  </a-button>
                </div>
              </div>
            </div>
            <div class="images-info">
              <InfoCircleOutlined />
              已添加 {{ paymentImages.length }} 张付款凭证图片
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else class="empty-photos">
            <div class="empty-icon">
              <CameraOutlined />
            </div>
            <p>暂无付款凭证图片</p>
            <p class="empty-hint">点击上方按钮拍摄或选择图片</p>
          </div>
        </div>
      </div>

      <!-- 备注卡片 -->
      <div class="form-card">
        <div class="compact-header">
          <EditOutlined class="header-icon" />
          <span class="header-title">备注信息</span>
        </div>
        <div class="textarea-container">
          <a-textarea 
            v-model:value="formData.notes"
            placeholder="请输入备注信息（选填）"
            :rows="3"
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <a-button @click="handleCancel" class="cancel-btn">
          <LeftOutlined />
          返回预订
        </a-button>
        <a-button 
          type="primary" 
          @click="handleSubmit"
          :loading="submitting"
          class="submit-btn"
        >
          <CheckOutlined />
          确认创建订单
        </a-button>
      </div>
    </a-spin>

    <!-- 相机模态框 -->
    <a-modal
      v-model:open="cameraVisible"
      title="拍摄付款凭证"
      :footer="null"
      width="90%"
      :style="{ maxWidth: '600px' }"
      @cancel="closeCamera"
    >
      <div class="camera-container">
        <video 
          ref="videoRef" 
          autoplay 
          playsinline 
          class="camera-video"
          :style="{ display: cameraActive ? 'block' : 'none' }"
        ></video>
        <canvas 
          ref="canvasRef" 
          class="camera-canvas" 
          style="display: none;"
        ></canvas>
        
        <div class="camera-controls">
          <a-button 
            type="primary" 
            size="large" 
            @click="capturePhoto"
            :disabled="!cameraActive"
            class="capture-btn"
          >
            <CameraOutlined />
            拍照
          </a-button>
          <a-button 
            size="large" 
            @click="closeCamera"
            class="close-camera-btn"
          >
            关闭相机
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- 图片预览模态框 -->
    <a-modal
      v-model:open="previewVisible"
      :footer="null"
      width="80%"
      :style="{ maxWidth: '800px' }"
    >
      <img :src="previewImageUrl" style="width: 100%" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  UserOutlined,
  TeamOutlined,
  CreditCardOutlined,
  TagOutlined,
  CameraOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  LeftOutlined,
  UploadOutlined,
  EyeOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  GiftOutlined,
  DollarOutlined,
  BankOutlined,
  QrcodeOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  HomeOutlined
} from '@ant-design/icons-vue'
import { orderAPI } from '@/api/order'
import { getUsersByStore } from '@/api/user'

// Props
const props = defineProps({
  bookingData: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['cancel', 'success'])

// 响应式数据
const loading = ref(false)
const loadingHosts = ref(false)
const submitting = ref(false)
const gameHosts = ref([])

// 🆕 密室NPC角色相关数据
const escapeRoomNpcRoles = ref([])

// 相机相关
const cameraVisible = ref(false)
const cameraLoading = ref(false)
const cameraActive = ref(false)
const videoRef = ref()
const canvasRef = ref()
const mediaStream = ref(null)

// 图片相关
const paymentImages = ref([])
const previewVisible = ref(false)
const previewImageUrl = ref('')

// 表单数据
const formData = reactive({
  player_count: null,
  customer_name: '',
  customer_phone: '',
  game_host_id: null,
  pic_id: null,
  pic_payment: '',
  free_pay: '',
  payment_status: '',
  booking_type: '',
  payment_method: '',
  promo_quantity: null,
  total_amount: null,
  notes: '',
  // 🆕 新增字段
  is_group_booking: false,
  include_cctv: false,
  include_photos: false,
  // 🆕 密室NPC角色字段
  escape_room_npc_roles: [],
  // 🆕 新增支付相关字段
  status: 'confirmed', // 默认为已确认
  unit_price: 0, // 单价
  prepaid_amount: 0, // 预付金额
  remaining_amount: 0 // 剩余应付金额
})

// 生命周期
onMounted(() => {
  initForm()
  loadGameHosts()
})

// 🆕 监听人数变化，自动重新计算总金额
watch(() => formData.player_count, () => {
  if (formData.free_pay === 'Pay') {
    calculateTotalAmount()
  }
})

// 方法
const initForm = () => {
  // 初始化单价
  if (props.bookingData.store_price) {
    formData.unit_price = props.bookingData.store_price
  }
  // 如果有价格，默认设置为Pay
  if (props.bookingData.store_price > 0) {
    formData.free_pay = 'Pay'
    formData.payment_status = 'Not Yet'
  }
  // 初始化人数为1
  if (!formData.player_count) {
    formData.player_count = 1
  }
  // 计算初始总金额
  calculateTotalAmount()
  
  // 🆕 加载密室NPC角色
  loadEscapeRoomNpcRoles()
}

const loadGameHosts = async () => {
  if (!props.bookingData.store_id) return
  
  try {
    loadingHosts.value = true
    const response = await getUsersByStore(props.bookingData.store_id)
    gameHosts.value = response.data || []
  } catch (error) {
    console.error('加载Game Host失败:', error)
    message.error('加载Game Host失败')
  } finally {
    loadingHosts.value = false
  }
}

// 🆕 加载密室NPC角色
const loadEscapeRoomNpcRoles = async () => {
  // 只有密室项目才需要加载NPC角色
  if (props.bookingData.item_type !== 'escape_room') {
    escapeRoomNpcRoles.value = []
    return
  }
  
  try {
    let npcRoles = []
    
    // 🆕 优先使用从BookingView传递过来的item_info中的NPC角色信息
    if (props.bookingData.item_info && props.bookingData.item_info.npc_roles) {
      if (typeof props.bookingData.item_info.npc_roles === 'string') {
        try {
          npcRoles = JSON.parse(props.bookingData.item_info.npc_roles)
        } catch (e) {
          console.warn('解析预检查NPC角色失败:', e)
        }
      } else if (Array.isArray(props.bookingData.item_info.npc_roles)) {
        npcRoles = props.bookingData.item_info.npc_roles
      }
      
      escapeRoomNpcRoles.value = npcRoles || []
      console.log('从预检查获取密室NPC角色:', escapeRoomNpcRoles.value)
      return
    }
    
    // 如果没有预检查数据，则从API获取密室详情
    const escapeRoomAPI = await import('@/api/escapeRoom')
    const response = await escapeRoomAPI.getEscapeRoomById(props.bookingData.item_id)
    
    // 解析NPC角色数据
    if (response.data && response.data.npc_roles) {
      if (typeof response.data.npc_roles === 'string') {
        try {
          npcRoles = JSON.parse(response.data.npc_roles)
        } catch (e) {
          console.warn('解析API NPC角色失败:', e)
        }
      } else if (Array.isArray(response.data.npc_roles)) {
        npcRoles = response.data.npc_roles
      }
    }
    
    escapeRoomNpcRoles.value = npcRoles || []
    console.log('从API获取密室NPC角色:', escapeRoomNpcRoles.value)
  } catch (error) {
    console.error('加载密室NPC角色失败:', error)
    escapeRoomNpcRoles.value = []
  }
}

// 格式化日期显示（加上星期几）
const formatDateWithWeekday = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const weekday = weekdays[date.getDay()]
  
  return `${dateString} ${weekday}`
}

// 过滤选项
const filterOption = (input, option) => {
  // 在Vue 3中，获取选项文本内容
  const optionText = option.label || option.children || ''
  const searchText = input.toLowerCase()
  
  // 如果有label属性，直接使用
  if (typeof optionText === 'string') {
    return optionText.toLowerCase().includes(searchText)
  }
  
  // 否则尝试从gameHosts数组中找到对应的用户
  const hostId = option.value
  const host = gameHosts.value.find(h => h.user_id === hostId)
  if (host) {
    return host.username.toLowerCase().includes(searchText) || 
           (host.real_name && host.real_name.toLowerCase().includes(searchText))
  }
  
  return false
}

// 🆕 NPC角色过滤方法
const filterNpcOption = (input, option) => {
  const roleText = option.value || ''
  const searchText = input.toLowerCase()
  return roleText.toLowerCase().includes(searchText)
}

// 🆕 自动计算总金额
const calculateTotalAmount = () => {
  const playerCount = formData.player_count || 0
  const unitPrice = formData.unit_price || 0
  formData.total_amount = playerCount * unitPrice
  
  // 如果是定金支付，重新计算剩余金额
  if (formData.payment_status === 'DP') {
    calculateRemainingAmount()
  }
}

// 🆕 计算剩余应付金额
const calculateRemainingAmount = () => {
  const totalAmount = formData.total_amount || 0
  const prepaidAmount = formData.prepaid_amount || 0
  formData.remaining_amount = Math.max(0, totalAmount - prepaidAmount)
}

// 🆕 处理支付类型变更
const handlePaymentTypeChange = () => {
  if (formData.free_pay === 'Free') {
    // 免费游戏时清空支付相关字段
    formData.payment_status = 'Free'
    formData.payment_method = null
    formData.unit_price = 0
    formData.total_amount = 0
    formData.prepaid_amount = 0
    formData.remaining_amount = 0
  } else {
    // 付费游戏时设置默认值
    formData.payment_status = 'Not Yet'
    formData.unit_price = props.bookingData.store_price || 0
    calculateTotalAmount()
  }
}

// 🆕 处理支付状态变更
const handlePaymentStatusChange = () => {
  if (formData.payment_status === 'FULL') {
    // 全额支付时，预付金额等于总金额，剩余为0
    formData.prepaid_amount = formData.total_amount
    formData.remaining_amount = 0
  } else if (formData.payment_status === 'Not Yet') {
    // 未付款时，预付和剩余都为0
    formData.prepaid_amount = 0
    formData.remaining_amount = formData.total_amount
  } else if (formData.payment_status === 'DP') {
    // 定金支付时，清空预付金额让用户手动输入
    formData.prepaid_amount = 0
    formData.remaining_amount = formData.total_amount
  }
}

// 🆕 格式化价格显示
const formatPrice = (price) => {
  if (!price) return '0'
  return new Intl.NumberFormat('id-ID').format(price)
}

// 相机功能
const openCamera = async () => {
  cameraVisible.value = true
  cameraLoading.value = true
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment' // 后置摄像头
      } 
    })
    
    await nextTick()
    
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      mediaStream.value = stream
      cameraActive.value = true
    }
  } catch (error) {
    console.error('无法访问相机:', error)
    message.error('无法访问相机，请检查权限设置')
  } finally {
    cameraLoading.value = false
  }
}

const closeCamera = () => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(track => track.stop())
    mediaStream.value = null
  }
  cameraActive.value = false
  cameraVisible.value = false
}

const capturePhoto = () => {
  if (!videoRef.value || !canvasRef.value) return
  
  const video = videoRef.value
  const canvas = canvasRef.value
  const context = canvas.getContext('2d')
  
  // 设置画布尺寸
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  // 绘制视频帧到画布
  context.drawImage(video, 0, 0)
  
  // 转换为blob
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob)
    const timestamp = new Date().getTime()
    
    paymentImages.value.push({
      url: url,
      blob: blob,
      name: `payment_${timestamp}.jpg`,
      type: 'payment'
    })
    
    message.success('拍照成功')
    closeCamera()
  }, 'image/jpeg', 0.8)
}

// 文件上传
const handleFileUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    message.error('只能上传图片文件')
    return false
  }
  
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    message.error('图片大小不能超过5MB')
    return false
  }
  
  const url = URL.createObjectURL(file)
  paymentImages.value.push({
    url: url,
    blob: file,
    name: file.name,
    type: 'payment'
  })
  
  message.success('图片添加成功')
  return false // 阻止自动上传
}

// 图片预览
const previewImage = (url) => {
  previewImageUrl.value = url
  previewVisible.value = true
}

// 删除图片
const removeImage = (index) => {
  const image = paymentImages.value[index]
  URL.revokeObjectURL(image.url)
  paymentImages.value.splice(index, 1)
  message.success('图片删除成功')
}

// 表单验证
const validateForm = () => {
  if (!formData.player_count || formData.player_count < 1) {
    message.error('请输入有效的游戏人数')
    return false
  }
  
  if (!formData.customer_name?.trim()) {
    message.error('请输入客户姓名')
    return false
  }
  
  if (!formData.game_host_id) {
    message.error('请选择Game Host')
    return false
  }
  
  if (!formData.free_pay) {
    message.error('请选择支付类型')
    return false
  }
  
  if (formData.free_pay === 'Pay') {
    if (!formData.payment_status) {
      message.error('请选择支付状态')
      return false
    }
    
    if (!formData.payment_method) {
      message.error('请选择付款方式')
      return false
    }
    
    if (!formData.total_amount || formData.total_amount <= 0) {
      message.error('请输入有效的总金额')
      return false
    }
    
    // 验证预付金额不能超过总金额
    if (formData.payment_status === 'DP' && formData.prepaid_amount && formData.prepaid_amount > formData.total_amount) {
      message.error('预付金额不能超过总金额')
      return false
    }
  }
  
  if (!formData.booking_type) {
    message.error('请选择预订类型')
    return false
  }
  
  return true
}

const handleSubmit = async () => {
  if (!validateForm()) return
  
  try {
    submitting.value = true
    
    // 上传付款凭证图片
    let uploadedImages = []
    if (paymentImages.value.length > 0) {
      uploadedImages = await uploadPaymentImages()
    }
    
    // 使用默认语言（印尼语）
    const defaultLanguage = 'IND'
    
    // 构建订单数据
    const orderData = {
      // 基本订单信息
      order_type: props.bookingData.item_type === 'script' ? '剧本杀' : '密室',
      store_id: props.bookingData.store_id,
      room_id: props.bookingData.room_id,
      order_date: props.bookingData.date,
      start_time: props.bookingData.start_time,
      end_time: props.bookingData.end_time,
      
      // 项目信息
      ...(props.bookingData.item_type === 'script' ? {
        script_id: props.bookingData.item_id,
        script_name: props.bookingData.item_name
      } : {
        escape_room_id: props.bookingData.item_id,
        escape_room_name: props.bookingData.item_name
      }),
      
      // 客户信息
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone || null,
      player_count: formData.player_count,
      language: defaultLanguage, // 使用默认语言
      
      // 业务信息
      game_host_id: formData.game_host_id,
      pic_id: formData.pic_id || null,
      pic_payment: formData.pic_payment,
      free_pay: formData.free_pay,
      payment_status: formData.free_pay === 'Free' ? 'Free' : formData.payment_status,
      booking_type: formData.booking_type,
      payment_method: formData.free_pay === 'Pay' ? formData.payment_method : null,
      promo_quantity: formData.promo_quantity || null,
      total_amount: formData.free_pay === 'Pay' ? formData.total_amount : 0,
      notes: formData.notes,
      
      // 图片
      images: uploadedImages,
      
      // 🆕 新增字段
      is_group_booking: formData.is_group_booking,
      include_cctv: formData.include_cctv,
      include_photos: formData.include_photos,
      
      // 🆕 密室NPC角色字段
      escape_room_npc_roles: props.bookingData.item_type === 'escape_room' ? formData.escape_room_npc_roles : null,
      
      // 🆕 新增支付字段
      unit_price: formData.unit_price,
      original_price: formData.unit_price, // 原价等于单价
      prepaid_amount: formData.prepaid_amount,
      remaining_amount: formData.remaining_amount,
      
      // 状态
      status: formData.status
    }
    
    console.log('创建订单数据:', orderData)
    
    const response = await orderAPI.create(orderData)
    
    message.success('订单创建成功！')
    emit('success', response.data)
    
  } catch (error) {
    console.error('创建订单失败:', error)
    message.error(error.response?.data?.message || '创建订单失败')
  } finally {
    submitting.value = false
  }
}

// 上传付款凭证图片
const uploadPaymentImages = async () => {
  try {
    const formData = new FormData()
    
    paymentImages.value.forEach((image, index) => {
      formData.append('images', image.blob, image.name)
    })
    
    const response = await orderAPI.uploadImages(formData)
    return response.data.images || []
  } catch (error) {
    console.error('上传图片失败:', error)
    message.error('上传付款凭证失败')
    return []
  }
}

const handleCancel = () => {
  // 清理图片资源
  paymentImages.value.forEach(image => {
    URL.revokeObjectURL(image.url)
  })
  emit('cancel')
}


</script>

<style scoped>
.payment-confirm-container {
  padding: 16px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  background: #f8f9fa;
}

/* 卡片样式 */
.booking-summary-card,
.form-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

/* 紧凑的标题样式 */
.compact-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
}

.header-icon {
  color: #1890ff;
  font-size: 14px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-subtitle {
  font-size: 12px;
  color: #666;
  margin-left: auto;
  font-weight: normal;
}

/* 预订信息网格 */
.booking-info-grid {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.info-item .value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.info-item .value.highlight {
  color: #1890ff;
  font-weight: 700;
}

/* 表单网格 */
.form-grid {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  position: relative;
}

.form-item label.required::after {
  content: '*';
  color: #ff4d4f;
  margin-left: 4px;
}

/* 文本域容器 */
.textarea-container {
  padding: 16px;
}

.full-width {
  width: 100%;
}

/* 输入控件样式优化 */
:deep(.ant-input),
:deep(.ant-input-number),
:deep(.ant-select-selector),
:deep(.ant-input-number-input) {
  height: 36px !important;
  line-height: 34px !important;
}

:deep(.ant-select-selection-item) {
  line-height: 34px !important;
}

:deep(.ant-input-number-handler-wrap) {
  height: 34px !important;
}

:deep(.ant-textarea) {
  padding: 8px 12px !important;
}

/* 工作人员选择样式 */
.staff-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.staff-option .real-name {
  color: #666;
  font-size: 12px;
}

/* 🆕 NPC角色选择样式 */
.npc-role-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.npc-role-hint {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
  font-style: italic;
}

.full-width {
  grid-column: 1 / -1;
}

/* 支付部分样式 */
.payment-section {
  padding: 16px;
}

.payment-type-selector {
  margin-bottom: 16px;
}

.payment-radio-group {
  margin-top: 6px;
  width: 100%;
}

.payment-radio-group .ant-radio-button-wrapper {
  flex: 1;
  text-align: center;
  height: 40px;
  line-height: 38px;
  font-weight: 600;
  font-size: 14px;
}

.free-option.ant-radio-button-wrapper-checked {
  background: #52c41a;
  border-color: #52c41a;
}

.pay-option.ant-radio-button-wrapper-checked {
  background: #1890ff;
  border-color: #1890ff;
}

.payment-details {
  margin-top: 16px;
}

.free-notice {
  margin-top: 16px;
}

/* 单选按钮组样式 */
.radio-group {
  width: 100%;
}

.radio-group .ant-radio-wrapper {
  margin-right: 16px;
  font-size: 14px;
}

/* 🆕 计算字段样式 */
.calculated-field {
  background-color: #f5f5f5 !important;
  cursor: not-allowed !important;
}

.calculated-field :deep(.ant-input-number-input) {
  background-color: #f5f5f5 !important;
  cursor: not-allowed !important;
}

.calculation-note {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
  font-style: italic;
}



/* 拍照功能样式 */
.photo-section {
  padding: 16px;
}

.photo-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.camera-btn {
  background: #1890ff;
  border: none;
  font-weight: 600;
  height: 36px;
  font-size: 14px;
}

.upload-btn {
  border: 2px dashed #d9d9d9;
  background: #fafafa;
  height: 36px;
  font-size: 14px;
}

.images-preview {
  margin-top: 16px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #f0f0f0;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 0 0 0 8px;
}

.preview-btn,
.remove-btn {
  color: white;
  border: none;
  background: transparent;
  padding: 4px;
  font-size: 12px;
}

.preview-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.remove-btn:hover {
  background: rgba(255, 77, 79, 0.8);
}

.images-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #52c41a;
  font-size: 14px;
  font-weight: 500;
}

.empty-photos {
  text-align: center;
  padding: 30px 20px;
  color: #999;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-hint {
  font-size: 12px;
  margin-top: 4px;
}

/* 相机模态框样式 */
.camera-container {
  text-align: center;
}

.camera-video {
  width: 100%;
  max-width: 500px;
  border-radius: 8px;
}

.camera-controls {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  gap: 12px;
}

.capture-btn {
  background: #52c41a;
  border-color: #52c41a;
  font-weight: 600;
  min-width: 120px;
  height: 36px;
  font-size: 14px;
}

.close-camera-btn {
  min-width: 100px;
  height: 36px;
  font-size: 14px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;
}

.cancel-btn {
  min-width: 120px;
  height: 40px;
  font-weight: 600;
  font-size: 14px;
}

.submit-btn {
  min-width: 140px;
  height: 40px;
  background: #52c41a;
  border: none;
  font-weight: 600;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .payment-confirm-container {
    padding: 12px;
  }
  
  .booking-info-grid,
  .form-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 12px;
  }
  
  .photo-actions {
    flex-direction: column;
  }
  
  .action-buttons {
    flex-direction: column;
    padding: 12px;
  }
  
  .camera-btn,
  .upload-btn,
  .cancel-btn,
  .submit-btn {
    width: 100%;
  }
  
  .compact-header {
    padding: 10px 12px;
  }
  
  .payment-section,
  .photo-section,
  .textarea-container {
    padding: 12px;
  }
}
</style> 