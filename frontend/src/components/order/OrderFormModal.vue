<template>
  <a-modal
    :open="visible"
    :title="isEdit ? '编辑订单' : '新增订单'"
    :confirm-loading="loading"
    width="800px"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="订单类型" name="order_type">
            <a-select v-model:value="form.order_type" placeholder="选择订单类型">
              <a-select-option value="剧本杀">剧本杀</a-select-option>
              <a-select-option value="密室">密室</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="门店" name="store_id">
            <a-select 
              v-model:value="form.store_id" 
              placeholder="选择门店"
              :loading="loadingStores"
              show-search
              option-filter-prop="children"
            >
              <a-select-option 
                v-for="store in storeList" 
                :key="store.id" 
                :value="store.id"
              >
                {{ store.name }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="客户姓名" name="customer_name">
            <a-input v-model:value="form.customer_name" placeholder="输入客户姓名" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="客户电话" name="customer_phone">
            <a-input v-model:value="form.customer_phone" placeholder="输入客户电话（选填）" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="订单日期" name="order_date">
            <a-date-picker 
              v-model:value="form.order_date" 
              placeholder="选择日期" 
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="开始时间" name="start_time">
            <a-time-picker 
              v-model:value="form.start_time" 
              placeholder="选择开始时间" 
              format="HH:mm"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="结束时间" name="end_time">
            <a-time-picker 
              v-model:value="form.end_time" 
              placeholder="选择结束时间" 
              format="HH:mm"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="玩家人数" name="player_count">
            <a-input-number 
              v-model:value="form.player_count" 
              :min="1" 
              :max="20" 
              placeholder="玩家人数"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="预订类型" name="booking_type">
            <a-select v-model:value="form.booking_type" placeholder="选择预订类型">
              <a-select-option value="Booking">预订</a-select-option>
              <a-select-option value="Walk In">临时</a-select-option>
              <a-select-option value="Traveloka">Traveloka</a-select-option>
              <a-select-option value="Tiket.com">Tiket.com</a-select-option>
              <a-select-option value="Gamehost/Staff Booking">Gamehost/Staff Booking</a-select-option>
              <a-select-option value="MyValue（Gramedia）">MyValue（Gramedia）</a-select-option>
              <a-select-option value="Promo">Promo</a-select-option>
              <a-select-option value="Group Booking">始发拼团</a-select-option>
              <a-select-option value="Online Booking">线上预订</a-select-option>
              <a-select-option value="Phone Booking">电话预订</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 工作人员配置 -->
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Game Host" name="game_host_id">
            <a-select 
              v-model:value="form.game_host_id" 
              placeholder="选择Game Host"
              :loading="loadingResources"
              :disabled="!form.store_id"
              show-search
              option-filter-prop="children"
            >
              <a-select-option 
                v-for="user in userList" 
                :key="user.id" 
                :value="user.id"
              >
                {{ user.name }} ({{ user.username }})
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="PIC负责人" name="pic_id">
            <a-select 
              v-model:value="form.pic_id" 
              placeholder="选择PIC（选填）"
              :loading="loadingResources"
              :disabled="!form.store_id"
              allowClear
              show-search
              option-filter-prop="children"
            >
              <a-select-option 
                v-for="user in userList" 
                :key="user.id" 
                :value="user.id"
              >
                {{ user.name }} ({{ user.username }})
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="PIC Payment" name="pic_payment">
            <a-input 
              v-model:value="form.pic_payment" 
              placeholder="PIC Payment（选填）"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="支付类型" name="free_pay">
            <a-radio-group v-model:value="form.free_pay">
              <a-radio value="Free">免费</a-radio>
              <a-radio value="Pay">付费</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="支付状态" name="payment_status">
            <a-select v-model:value="form.payment_status" placeholder="选择支付状态">
              <a-select-option value="FULL">已付全款</a-select-option>
              <a-select-option value="DP">已付定金</a-select-option>
              <a-select-option value="Not Yet">未付款</a-select-option>
              <a-select-option value="Free">免费</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16" v-if="form.free_pay === 'Pay'">
        <a-col :span="12">
          <a-form-item label="付款方式" name="payment_method">
            <a-select v-model:value="form.payment_method" placeholder="选择付款方式">
              <a-select-option value="Bank Transfer">Bank Transfer</a-select-option>
              <a-select-option value="QR BCA">QR BCA</a-select-option>
              <a-select-option value="DEBIT">DEBIT</a-select-option>
              <a-select-option value="CC">CC</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="单价" name="unit_price">
            <a-input-number 
              v-model:value="form.unit_price" 
              :min="0" 
              placeholder="项目单价"
              style="width: 100%"
              :formatter="value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
              :parser="value => value.replace(/Rp\s?|(,*)/g, '')"
              @change="calculateTotalAmount"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16" v-if="form.free_pay === 'Pay'">
        <a-col :span="12">
          <a-form-item label="总金额" name="total_amount">
            <a-input-number 
              v-model:value="form.total_amount" 
              :min="0" 
              placeholder="自动计算：人数 × 单价"
              style="width: 100%"
              :formatter="value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
              :parser="value => value.replace(/Rp\s?|(,*)/g, '')"
              @change="calculateRemainingAmount"
            />
            <small class="calculation-note">
              自动计算：{{ form.player_count || 0 }} 人 × Rp {{ formatPrice(form.unit_price || 0) }} = Rp {{ formatPrice((form.player_count || 0) * (form.unit_price || 0)) }}
            </small>
          </a-form-item>
        </a-col>
        <a-col :span="12" v-if="form.payment_status === 'DP'">
          <a-form-item label="预付金额" name="prepaid_amount">
            <a-input-number 
              v-model:value="form.prepaid_amount" 
              :min="0" 
              :max="form.total_amount"
              placeholder="预付金额（选填）"
              style="width: 100%"
              :formatter="value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
              :parser="value => value.replace(/Rp\s?|(,*)/g, '')"
              @change="calculateRemainingAmount"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16" v-if="form.free_pay === 'Pay' && form.payment_status === 'DP'">
        <a-col :span="12">
          <a-form-item label="剩余应付金额">
            <a-input-number 
              v-model:value="form.remaining_amount" 
              :min="0"
              placeholder="自动计算"
              style="width: 100%"
              :formatter="value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
              :parser="value => value.replace(/Rp\s?|(,*)/g, '')"
              readonly
              class="calculated-field"
            />
            <small class="calculation-note">
              自动计算：Rp {{ formatPrice(form.total_amount || 0) }} - Rp {{ formatPrice(form.prepaid_amount || 0) }}
            </small>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="优惠数量" name="promo_quantity">
            <a-input-number 
              v-model:value="form.promo_quantity" 
              :min="0" 
              placeholder="优惠数量（选填）"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item name="internal_support">
            <a-checkbox v-model:checked="form.internal_support">内部补位</a-checkbox>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item name="is_group_booking">
            <a-checkbox v-model:checked="form.is_group_booking">始发拼团</a-checkbox>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 剧本杀专用字段 -->
      <div v-if="form.order_type === '剧本杀'">
        <a-divider>剧本杀信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="剧本" name="script_id">
              <a-select 
                v-model:value="form.script_id" 
                placeholder="选择剧本"
                :loading="loadingResources"
                :disabled="!form.store_id"
                show-search
                option-filter-prop="children"
              >
                <a-select-option 
                  v-for="script in scriptList" 
                  :key="script.id" 
                  :value="script.id"
                >
                  {{ script.name }} (Rp {{ script.store_price?.toLocaleString() || script.price?.toLocaleString() || '价格待定' }})
                </a-select-option>
              </a-select>
              <div v-if="!form.store_id" style="font-size: 12px; color: #999; margin-top: 4px;">
                请先选择门店
              </div>
              <div v-else-if="loadingResources" style="font-size: 12px; color: #999; margin-top: 4px;">
                正在加载门店剧本...
              </div>
              <div v-else-if="scriptList.length === 0" style="font-size: 12px; color: #ff4d4f; margin-top: 4px;">
                该门店暂无可用剧本
              </div>
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <!-- 密室专用字段 -->
      <div v-if="form.order_type === '密室'">
        <a-divider>密室信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="密室主题" name="escape_room_id">
              <a-select 
                v-model:value="form.escape_room_id" 
                placeholder="选择密室主题"
                :loading="loadingResources"
                :disabled="!form.store_id"
                show-search
                option-filter-prop="children"
              >
                <a-select-option 
                  v-for="room in escapeRoomList" 
                  :key="room.id" 
                  :value="room.id"
                >
                  {{ room.name }} (Rp {{ room.store_price?.toLocaleString() || room.price?.toLocaleString() || '价格待定' }})
                </a-select-option>
              </a-select>
              <div v-if="!form.store_id" style="font-size: 12px; color: #999; margin-top: 4px;">
                请先选择门店
              </div>
              <div v-else-if="loadingResources" style="font-size: 12px; color: #999; margin-top: 4px;">
                正在加载门店密室...
              </div>
              <div v-else-if="escapeRoomList.length === 0" style="font-size: 12px; color: #ff4d4f; margin-top: 4px;">
                该门店暂无可用密室
              </div>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item name="is_group_booking">
              <a-checkbox v-model:checked="form.is_group_booking">拼团</a-checkbox>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item name="include_photos">
              <a-checkbox v-model:checked="form.include_photos">包含拍照</a-checkbox>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item name="include_cctv">
              <a-checkbox v-model:checked="form.include_cctv">包含监控</a-checkbox>
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="房间" name="room_id">
            <a-select 
              v-model:value="form.room_id" 
              placeholder="选择房间"
              :loading="loadingResources || checkingRoom"
              :disabled="!form.store_id"
              show-search
              option-filter-prop="children"
            >
              <a-select-option 
                v-for="room in roomList" 
                :key="room.id" 
                :value="room.id"
                :disabled="room.status !== '正常' || (roomOccupancy[room.id] && !roomOccupancy[room.id].is_available)"
              >
                {{ getRoomDisplayInfo(room) }}
              </a-select-option>
            </a-select>
            <div v-if="checkingRoom" style="font-size: 12px; color: #999; margin-top: 4px;">
              正在检查房间可用性...
            </div>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="24">
          <a-form-item label="备注" name="notes">
            <a-textarea 
              v-model:value="form.notes" 
              placeholder="输入备注信息"
              :rows="3"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 支付凭证上传 -->
      <a-row :gutter="16" v-if="form.free_pay === 'Pay'">
        <a-col :span="24">
          <a-form-item label="支付凭证">
            <a-upload
              v-model:file-list="paymentImages"
              list-type="picture-card"
              :before-upload="beforeUpload"
              @preview="handlePreview"
              @remove="handleRemove"
              :multiple="true"
              accept="image/*"
              :max-count="5"
              :action="null"
              :custom-request="() => {}"
              :show-upload-list="true"
            >
              <div v-if="paymentImages.length < 5">
                <plus-outlined />
                <div style="margin-top: 8px">上传图片</div>
              </div>
            </a-upload>
            <div style="font-size: 12px; color: #999; margin-top: 4px;">
              支持JPG、PNG格式，最多上传5张图片，每张不超过2MB
            </div>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <!-- 图片预览模态框 -->
    <a-modal :open="previewVisible" :footer="null" @cancel="() => previewVisible = false">
      <img alt="preview" style="width: 100%" :src="previewImage" />
    </a-modal>
  </a-modal>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { orderAPI } from '@/api/order'
import { PlusOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  formData: {
    type: Object,
    default: () => ({})
  },
  isEdit: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'submit'])

const formRef = ref()
const loading = ref(false)
const loadingStores = ref(false)
const loadingResources = ref(false)
const checkingRoom = ref(false)

// 图片相关
const paymentImages = ref([])
const previewVisible = ref(false)
const previewImage = ref('')

// 🆕 数据列表
const storeList = ref([])
const scriptList = ref([])
const escapeRoomList = ref([])
const roomList = ref([])
const roomOccupancy = ref({})
const userList = ref([])

// 🆕 重置表单函数 - 移到前面避免初始化错误
const resetForm = () => {
  Object.keys(form).forEach(key => {
    if (key === 'player_count') {
      form[key] = 1
    } else if (key === 'booking_type') {
      form[key] = 'Booking'
    } else if (key === 'payment_status') {
      form[key] = 'Not Yet'
    } else if (key === 'free_pay') {
      form[key] = 'Free'
    } else if (key === 'total_amount' || key === 'promo_quantity') {
      form[key] = 0
    } else if (typeof form[key] === 'boolean') {
      form[key] = false
    } else {
      form[key] = null
    }
  })
  paymentImages.value = []
}

// 表单数据 - 增加房间字段和新的金额字段
const form = reactive({
  order_type: null,
  store_id: null,
  room_id: null,
  customer_name: '',
  customer_phone: '',
  order_date: null,
  start_time: null,
  end_time: null,
  player_count: 1,
  booking_type: 'Booking',
  payment_status: 'Not Yet',
  total_amount: 0,
  script_id: null,
  escape_room_id: null,
  is_group_booking: false,
  include_photos: false,
  include_cctv: false,
  notes: '',
  game_host_id: null,
  pic_id: null,
  pic_payment: '',
  free_pay: 'Free',
  payment_method: null,
  promo_quantity: 0,
  internal_support: false,
  // 🆕 新增金额字段
  unit_price: 0,
  prepaid_amount: 0,
  remaining_amount: 0
})

// 🆕 更新的表单验证规则
const rules = {
  order_type: [{ required: true, message: '请选择订单类型' }],
  store_id: [{ required: true, message: '请选择门店' }],
  room_id: [{ required: true, message: '请选择房间' }],
  customer_name: [{ required: true, message: '请输入客户姓名' }],
  customer_phone: [], // 客户电话改为非必填
  order_date: [{ required: true, message: '请选择订单日期' }],
  start_time: [{ required: true, message: '请选择开始时间' }],
  end_time: [{ required: true, message: '请选择结束时间' }],
  player_count: [{ required: true, message: '请输入玩家人数' }],
  booking_type: [{ required: true, message: '请选择预订类型' }],
  payment_status: [{ required: true, message: '请选择支付状态' }],
  game_host_id: [{ required: true, message: '请选择Game Host' }],
  free_pay: [{ required: true, message: '请选择支付类型' }],
  script_id: [
    { 
      validator: (rule, value) => {
        if (form.order_type === '剧本杀' && !value) {
          return Promise.reject('剧本杀订单必须选择剧本')
        }
        return Promise.resolve()
      }
    }
  ],
  escape_room_id: [
    { 
      validator: (rule, value) => {
        if (form.order_type === '密室' && !value) {
          return Promise.reject('密室订单必须选择密室主题')
        }
        return Promise.resolve()
      }
    }
  ],
  payment_method: [
    { 
      validator: (rule, value) => {
        if (form.free_pay === 'Pay' && !value) {
          return Promise.reject('付费订单必须选择付款方式')
        }
        return Promise.resolve()
      }
    }
  ],
  total_amount: [
    { 
      validator: (rule, value) => {
        if (form.free_pay === 'Pay' && (!value || value <= 0)) {
          return Promise.reject('付费订单必须输入有效金额')
        }
        return Promise.resolve()
      }
    }
  ]
}

// 🆕 计算属性：过滤后的房间列表（根据状态和占用情况）
const availableRooms = computed(() => {
  return roomList.value.filter(room => {
    // 只显示正常状态的房间
    if (room.status !== '正常') return false
    
    // 如果有选择日期和时间，检查是否被占用
    if (form.order_date && form.start_time && form.end_time && roomOccupancy.value[room.id]) {
      const occupancy = roomOccupancy.value[room.id]
      return occupancy.is_available
    }
    
    return true
  })
})

// 🆕 监听表单数据变化 - 修复编辑时数据加载问题
watch(() => props.formData, async (newData) => {
  if (newData && Object.keys(newData).length > 0) {
    console.log('加载订单数据:', newData);
    
    // 重置表单
    Object.keys(form).forEach(key => {
      if (key === 'order_date' && newData[key]) {
        form[key] = dayjs(newData[key])
      } else if ((key === 'start_time' || key === 'end_time') && newData[key]) {
        form[key] = dayjs(newData[key], 'HH:mm')
      } else if (newData[key] !== undefined && newData[key] !== null) {
        form[key] = newData[key]
      }
    })
    
    // 🆕 处理支付类型映射
    if (newData.is_free !== undefined) {
      form.free_pay = newData.is_free ? 'Free' : 'Pay'
    }
    
    // 🆕 加载支付凭证图片
    if (newData.images && Array.isArray(newData.images)) {
      paymentImages.value = newData.images.map((img, index) => ({
        uid: img.id || `${index}`,
        name: img.image_name || `image_${index + 1}`,
        status: 'done',
        url: img.image_url,
        response: img
      }))
    } else {
      paymentImages.value = []
    }
    
    // 如果有门店ID，加载对应资源
    if (newData.store_id) {
      await loadStoreResources(newData.store_id)
    }
  } else {
    // 新建订单时重置表单
    resetForm()
  }
}, { immediate: true, deep: true })

// 🆕 监听门店变化 - 修复编辑时不应重置已选项目
watch(() => form.store_id, async (newStoreId, oldStoreId) => {
  if (newStoreId && newStoreId !== oldStoreId) {
    // 如果是编辑模式且第一次加载，保留现有选择
    const isFirstLoad = props.isEdit && !oldStoreId && props.formData?.store_id === newStoreId
    
    if (!isFirstLoad) {
      // 只有在非首次加载时才重置相关字段
      form.script_id = null
      form.escape_room_id = null
      form.room_id = null
    }
    
    // 清空资源列表
    scriptList.value = []
    escapeRoomList.value = []
    roomList.value = []
    roomOccupancy.value = {}
    userList.value = []
    
    // 加载门店资源
    await loadStoreResources(newStoreId)
  }
})

// 🆕 监听时间变化，检查房间可用性
watch([() => form.order_date, () => form.start_time, () => form.end_time], 
  async ([date, startTime, endTime]) => {
    if (form.store_id && date && startTime && endTime && roomList.value.length > 0) {
      await checkAllRoomsAvailability()
    }
  }, { deep: true }
)

// 🆕 监听人数变化，自动重新计算总金额
watch(() => form.player_count, () => {
  if (form.free_pay === 'Pay' && form.unit_price > 0) {
    calculateTotalAmount()
  }
})

// 🆕 监听支付状态变化
watch(() => form.payment_status, (newStatus) => {
  if (newStatus === 'FULL') {
    // 全额支付
    form.prepaid_amount = form.total_amount
    form.remaining_amount = 0
  } else if (newStatus === 'Not Yet') {
    // 未付款
    form.prepaid_amount = 0
    form.remaining_amount = form.total_amount
  } else if (newStatus === 'DP') {
    // 定金支付 - 清空预付金额让用户手动输入
    form.prepaid_amount = 0
    calculateRemainingAmount()
  }
})

// 生命周期
onMounted(() => {
  loadAvailableStores()
})

// 🆕 加载用户可选门店列表
const loadAvailableStores = async () => {
  try {
    loadingStores.value = true
    const response = await orderAPI.getAvailableStores()
    storeList.value = response.data || []
    
    // 如果只有一个门店（门店级用户），自动选择
    if (storeList.value.length === 1) {
      form.store_id = storeList.value[0].id
    }
  } catch (error) {
    console.error('加载门店列表失败:', error)
    message.error('加载门店列表失败')
  } finally {
    loadingStores.value = false
  }
}

// 🆕 加载门店资源（剧本、密室、房间）
const loadStoreResources = async (storeId) => {
  if (!storeId) return
  
  try {
    loadingResources.value = true
    const response = await orderAPI.getStoreResources(storeId)
    const data = response.data || {}
    
    scriptList.value = data.scripts || []
    escapeRoomList.value = data.escape_rooms || []
    roomList.value = data.rooms || []
    userList.value = data.users || [] // 🆕 加载用户列表
    
    // 如果有选择日期和时间，检查房间可用性
    if (form.order_date && form.start_time && form.end_time) {
      await checkAllRoomsAvailability()
    }
  } catch (error) {
    console.error('加载门店资源失败:', error)
    message.error('加载门店资源失败')
  } finally {
    loadingResources.value = false
  }
}

// 🆕 检查所有房间的可用性
const checkAllRoomsAvailability = async () => {
  if (!form.store_id || !form.order_date || !form.start_time || !form.end_time) return
  
  try {
    checkingRoom.value = true
    const date = form.order_date.format('YYYY-MM-DD')
    const startTime = form.start_time.format('HH:mm')
    const endTime = form.end_time.format('HH:mm')
    
    // 并发检查所有房间的可用性
    const checkPromises = roomList.value.map(async (room) => {
      try {
        const response = await orderAPI.checkRoomAvailability(
          form.store_id, 
          room.id, 
          { 
            date, 
            start_time: startTime, 
            end_time: endTime,
            exclude_order_id: props.isEdit && props.formData?.id ? props.formData.id : undefined
          }
        )
        return {
          roomId: room.id,
          ...response.data
        }
      } catch (error) {
        console.error(`检查房间 ${room.name} 可用性失败:`, error)
        return {
          roomId: room.id,
          is_available: false,
          conflicts: []
        }
      }
    })
    
    const results = await Promise.all(checkPromises)
    
    // 更新房间占用信息
    const occupancyMap = {}
    results.forEach(result => {
      occupancyMap[result.roomId] = result
    })
    roomOccupancy.value = occupancyMap
    
    // 如果当前选择的房间不可用，清空选择
    if (form.room_id && !roomOccupancy.value[form.room_id]?.is_available) {
      form.room_id = null
      message.warning('当前选择的房间在该时间段不可用，请重新选择')
    }
  } catch (error) {
    console.error('检查房间可用性失败:', error)
  } finally {
    checkingRoom.value = false
  }
}

// 🆕 获取房间显示信息
const getRoomDisplayInfo = (room) => {
  const occupancy = roomOccupancy.value[room.id]
  let suffix = ''
  
  if (occupancy) {
    if (occupancy.is_available) {
      suffix = ' ✅'
    } else {
      const conflictCount = occupancy.conflicts?.length || 0
      suffix = ` ❌ (${conflictCount}个冲突)`
    }
  } else if (room.status !== '正常') {
    suffix = ` (${room.status})`
  }
  
  return `${room.name} [${room.room_type}, 容量${room.capacity}]${suffix}`
}

// 🆕 计算总金额
const calculateTotalAmount = () => {
  const playerCount = form.player_count || 0
  const unitPrice = form.unit_price || 0
  form.total_amount = playerCount * unitPrice
  
  calculateRemainingAmount()
}

// 🆕 计算剩余应付金额
const calculateRemainingAmount = () => {
  const totalAmount = form.total_amount || 0
  const prepaidAmount = form.prepaid_amount || 0
  form.remaining_amount = Math.max(0, totalAmount - prepaidAmount)
}

// 🆕 格式化价格
const formatPrice = (price) => {
  if (!price) return '0'
  return new Intl.NumberFormat('id-ID').format(price)
}

// 🆕 图片上传相关函数
const beforeUpload = (file) => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png'
  if (!isJpgOrPng) {
    message.error('只能上传 JPG/PNG 格式的图片!')
    return false
  }
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isLt2M) {
    message.error('图片大小不能超过 2MB!')
    return false
  }
  
  // 检查图片数量限制
  if (paymentImages.value.length >= 5) {
    message.error('最多只能上传5张图片!')
    return false
  }
  
  return true // 允许上传组件处理
}

const handlePreview = (file) => {
  previewImage.value = file.url || file.thumbUrl
  previewVisible.value = true
}

const handleRemove = (file) => {
  const index = paymentImages.value.findIndex(item => item.uid === file.uid)
  if (index > -1) {
    paymentImages.value.splice(index, 1)
  }
  return true
}

// 🆕 上传图片到服务器
const uploadImagesToServer = async () => {
  // 获取需要上传的新图片（有originFileObj的）
  const newImages = paymentImages.value.filter(img => img.originFileObj && img.status !== 'error')
  
  // 获取已经存在的图片（有response的）
  const existingImages = paymentImages.value
    .filter(img => img.response || (img.url && !img.originFileObj))
    .map(img => img.response || {
      image_url: img.url,
      image_name: img.name,
      image_type: 'proof'
    })
  
  if (newImages.length === 0) {
    // 没有新图片，返回现有图片
    return existingImages
  }
  
  try {
    const formData = new FormData()
    newImages.forEach(img => {
      formData.append('images', img.originFileObj)
    })
    
    const response = await orderAPI.uploadImages(formData)
    console.log('图片上传响应:', response)
    
    // 处理响应数据
    let uploadedImages = []
    if (response.data?.images) {
      uploadedImages = response.data.images
    } else if (response.data && Array.isArray(response.data)) {
      uploadedImages = response.data
    } else {
      console.warn('意外的响应格式:', response)
      uploadedImages = []
    }
    
    // 确保uploadedImages是数组
    const imagesArray = Array.isArray(uploadedImages) ? uploadedImages : []
    
    // 合并现有图片和新上传的图片
    return [...existingImages, ...imagesArray]
  } catch (error) {
    console.error('图片上传失败:', error)
    message.error('图片上传失败: ' + (error.message || '未知错误'))
    throw error
  }
}

// 处理提交
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    // 再次检查房间可用性
    if (form.room_id && form.order_date && form.start_time && form.end_time) {
      const date = form.order_date.format('YYYY-MM-DD')
      const startTime = form.start_time.format('HH:mm')
      const endTime = form.end_time.format('HH:mm')
      
      const response = await orderAPI.checkRoomAvailability(
        form.store_id, 
        form.room_id, 
        { 
          date, 
          start_time: startTime, 
          end_time: endTime,
          exclude_order_id: props.isEdit && props.formData?.id ? props.formData.id : undefined
        }
      )
      
      if (!response.data.is_available) {
        message.error('所选房间在该时间段不可用，请重新选择')
        return
      }
    }
    
    loading.value = true

    // 准备提交数据
    const submitData = { ...form }
    
    // 格式化日期和时间
    if (submitData.order_date) {
      submitData.order_date = submitData.order_date.format('YYYY-MM-DD')
    }
    if (submitData.start_time) {
      submitData.start_time = submitData.start_time.format('HH:mm')
    }
    if (submitData.end_time) {
      submitData.end_time = submitData.end_time.format('HH:mm')
    }

    // 🆕 处理图片上传
    if (form.free_pay === 'Pay' && paymentImages.value.length > 0) {
      try {
        const uploadedImages = await uploadImagesToServer()
        submitData.images = uploadedImages
      } catch (error) {
        loading.value = false
        return // 图片上传失败，停止提交
      }
    } else {
      submitData.images = []
    }

    // 🆕 处理支付类型转换
    submitData.is_free = submitData.free_pay === 'Free'
    
    // 🆕 添加默认语言
    submitData.language = 'IND'

    // 清理不需要的字段
    if (submitData.order_type === '剧本杀') {
      delete submitData.escape_room_id
      delete submitData.is_group_booking
      delete submitData.include_photos
      delete submitData.include_cctv
    } else if (submitData.order_type === '密室') {
      delete submitData.script_id
    }

    // 如果是编辑模式，包含订单ID
    if (props.isEdit && props.formData?.id) {
      submitData.id = props.formData.id
    }

    emit('submit', submitData)
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}

// 处理取消
const handleCancel = () => {
  formRef.value.resetFields()
  // 重置状态
  scriptList.value = []
  escapeRoomList.value = []
  roomList.value = []
  roomOccupancy.value = {}
  userList.value = []
  paymentImages.value = []
  previewVisible.value = false
  previewImage.value = ''
  emit('update:visible', false)
}
</script>

<style scoped>
.ant-form-item {
  margin-bottom: 16px;
}

.ant-divider {
  margin: 16px 0;
}



.calculation-note {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
  font-style: italic;
}

.calculated-field {
  background-color: #f5f5f5 !important;
  cursor: not-allowed !important;
}

.calculated-field :deep(.ant-input-number-input) {
  background-color: #f5f5f5 !important;
  cursor: not-allowed !important;
}
</style> 