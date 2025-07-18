<template>
  <a-modal
    v-model:visible="visible"
    title="编辑订单信息"
    width="800px"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
      v-if="order"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="客户姓名">
            <a-input :value="order.customer_name" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="客户电话">
            <a-input :value="order.customer_phone" disabled />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="玩家人数" name="player_count">
            <a-input-number
              v-model:value="form.player_count"
              :min="1"
              :max="20"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="补位人数" name="support_player_count">
            <a-input-number
              v-model:value="form.support_player_count"
              :min="0"
              :max="10"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="支持语言">
            <a-input 
              :value="getDisplayLanguages(order)"
              disabled
              placeholder="剧本/密室支持语言"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="内部补位" name="internal_support">
            <a-switch v-model:checked="form.internal_support" />
            <span style="margin-left: 8px; color: #666;">
              {{ form.internal_support ? '是' : '否' }}
            </span>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="房间" name="room_id">
            <a-select
              v-model:value="form.room_id"
              placeholder="选择房间"
              @focus="loadRooms"
              :loading="roomsLoading"
            >
              <a-select-option
                v-for="room in availableRooms"
                :key="room.id"
                :value="room.id"
              >
                {{ room.name }} ({{ room.room_type }})
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16" v-if="order.order_type === '剧本杀'">
        <a-col :span="24">
          <a-form-item label="剧本" name="script_id">
            <a-select
              v-model:value="form.script_id"
              placeholder="选择剧本"
              @focus="loadScripts"
              :loading="scriptsLoading"
            >
              <a-select-option
                v-for="script in availableScripts"
                :key="script.id"
                :value="script.id"
              >
                {{ script.name }} ({{ script.min_players }}-{{ script.max_players }}人)
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16" v-if="order.order_type === '密室'">
        <a-col :span="24">
          <a-form-item label="密室" name="escape_room_id">
            <a-select
              v-model:value="form.escape_room_id"
              placeholder="选择密室"
              @focus="loadEscapeRooms"
              :loading="escapeRoomsLoading"
            >
              <a-select-option
                v-for="escapeRoom in availableEscapeRooms"
                :key="escapeRoom.id"
                :value="escapeRoom.id"
              >
                {{ escapeRoom.name }} (恐怖等级: {{ escapeRoom.horror_level }})
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- NPC信息 -->
      <a-row :gutter="16" v-if="order.order_type === '密室'">
        <a-col :span="8">
          <a-form-item label="NPC数量">
            <a-input-number
              :value="selectedEscapeRoom?.npc_count || 0"
              :min="0"
              :max="10"
              style="width: 100%"
              disabled
              placeholder="根据密室自动设置"
            />
          </a-form-item>
        </a-col>
        <a-col :span="16">
          <a-form-item label="NPC角色选择" name="selected_npc_roles">
            <a-select
              v-model:value="form.selected_npc_roles"
              mode="multiple"
              placeholder="从密室NPC角色中选择"
              style="width: 100%"
              :disabled="!selectedEscapeRoom || !selectedEscapeRoom.npc_roles || selectedEscapeRoom.npc_roles.length === 0"
            >
              <a-select-option
                v-for="role in selectedEscapeRoom?.npc_roles || []"
                :key="role"
                :value="role"
              >
                {{ role }}
              </a-select-option>
            </a-select>
            <div v-if="selectedEscapeRoom?.npc_roles && selectedEscapeRoom.npc_roles.length > 0" style="font-size: 12px; color: #666; margin-top: 4px;">
              可选角色：{{ selectedEscapeRoom.npc_roles.join(', ') }}
            </div>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="Game Host备注" name="game_host_notes">
        <a-textarea
          v-model:value="form.game_host_notes"
          :rows="4"
          placeholder="输入备注信息..."
          :maxlength="1000"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import * as gameHostAPI from '@/api/gameHost'

const props = defineProps({
  visible: Boolean,
  order: Object
})

const emit = defineEmits(['update:visible', 'success'])

// 响应式数据
const loading = ref(false)
const formRef = ref()
const roomsLoading = ref(false)
const scriptsLoading = ref(false)
const escapeRoomsLoading = ref(false)
const availableRooms = ref([])
const availableScripts = ref([])
const availableEscapeRooms = ref([])
const selectedEscapeRoom = ref(null) // 用于存储当前选中的密室信息

// 表单数据
const form = reactive({
  player_count: 1,
  support_player_count: 0,
  internal_support: false,
  room_id: null,
  script_id: null,
  escape_room_id: null,
  selected_npc_roles: [], // 新增：用于存储选中的NPC角色
  game_host_notes: ''
})

// 表单验证规则
const rules = {
  player_count: [
    { required: true, message: '请输入玩家人数' },
    { type: 'number', min: 1, max: 20, message: '玩家人数必须在1-20之间' }
  ],
  support_player_count: [
    { type: 'number', min: 0, max: 10, message: '补位人数必须在0-10之间' }
  ],
  room_id: [
    { required: true, message: '请选择房间' }
  ],
  script_id: [
    { required: true, message: '请选择剧本' }
  ],
  escape_room_id: [
    { required: true, message: '请选择密室' }
  ],
  selected_npc_roles: [
    { type: 'array', message: '选择的NPC角色必须是数组格式' }
  ],
  game_host_notes: [
    { max: 1000, message: '备注不能超过1000个字符' }
  ]
}

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 监听密室选择变化，更新NPC角色选项
watch(() => form.escape_room_id, async (newEscapeRoomId) => {
  if (newEscapeRoomId) {
    selectedEscapeRoom.value = availableEscapeRooms.value.find(room => room.id === newEscapeRoomId)
    // 如果订单已有NPC角色，保留它们；否则默认选择所有可用角色
    if (!form.selected_npc_roles || form.selected_npc_roles.length === 0) {
      form.selected_npc_roles = selectedEscapeRoom.value?.npc_roles || []
    }
  } else {
    selectedEscapeRoom.value = null
    form.selected_npc_roles = []
  }
}, { immediate: true }) // immediate: true 确保在组件挂载时也执行一次

// 监听订单变化，初始化表单
watch(() => props.order, (newOrder) => {
  if (newOrder) {
    Object.assign(form, {
      player_count: newOrder.player_count || 1,
      support_player_count: newOrder.support_player_count || 0,
      internal_support: newOrder.internal_support || false,
      room_id: newOrder.room_id,
      script_id: newOrder.script_id,
      escape_room_id: newOrder.escape_room_id,
      selected_npc_roles: newOrder.escape_room_npc_roles || [], // 使用escape_room_npc_roles字段
      game_host_notes: newOrder.game_host_notes || ''
    })
    
    // 设置当前选中的密室信息
    if (newOrder.escape_room_id) {
      setTimeout(() => {
        selectedEscapeRoom.value = availableEscapeRooms.value.find(room => room.id === newOrder.escape_room_id)
      }, 100)
    }
  }
}, { immediate: true })

// 方法
const loadRooms = async () => {
  if (availableRooms.value.length > 0) return
  
  roomsLoading.value = true
  try {
    const response = await gameHostAPI.getAvailableRooms()
    availableRooms.value = response.data || []
  } catch (error) {
    console.error('加载房间列表失败:', error)
    message.error('加载房间列表失败')
  } finally {
    roomsLoading.value = false
  }
}

const loadScripts = async () => {
  if (availableScripts.value.length > 0) return
  
  scriptsLoading.value = true
  try {
    const response = await gameHostAPI.getAvailableScripts()
    availableScripts.value = response.data || []
  } catch (error) {
    console.error('加载剧本列表失败:', error)
    message.error('加载剧本列表失败')
  } finally {
    scriptsLoading.value = false
  }
}

const loadEscapeRooms = async () => {
  if (availableEscapeRooms.value.length > 0) return
  
  escapeRoomsLoading.value = true
  try {
    const response = await gameHostAPI.getAvailableEscapeRooms()
    availableEscapeRooms.value = response.data || []
  } catch (error) {
    console.error('加载密室列表失败:', error)
    message.error('加载密室列表失败')
  } finally {
    escapeRoomsLoading.value = false
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    loading.value = true
    
    // 准备更新数据
    const updateData = { ...form }
    
    // 🆕 处理支付类型字段 - 根据订单的is_free字段设置free_pay
    if (props.order.is_free !== undefined) {
      updateData.free_pay = props.order.is_free ? 'Free' : 'Pay'
    }
    
    // 🆕 处理NPC角色数据
    if (props.order.order_type === '密室' && updateData.selected_npc_roles) {
      updateData.escape_room_npc_roles = updateData.selected_npc_roles
    }
    
    // 根据订单类型移除不需要的字段
    if (props.order.order_type === '剧本杀') {
      delete updateData.escape_room_id
      delete updateData.selected_npc_roles
    } else if (props.order.order_type === '密室') {
      delete updateData.script_id
    }
    
    // 清理临时字段
    delete updateData.selected_npc_roles
    
    await gameHostAPI.updateOrder(props.order.id, updateData)
    
    message.success('订单更新成功')
    emit('success')
    visible.value = false
  } catch (error) {
    if (error.errorFields) {
      // 表单验证错误
      return
    }
    console.error('更新订单失败:', error)
    message.error(error.response?.data?.error || '更新订单失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  visible.value = false
}

// 获取显示语言
const getDisplayLanguages = (order) => {
  if (!order) return '未知'
  
  // 优先使用display_languages字段
  if (order.display_languages) {
    return order.display_languages
  }
  
  // 兼容旧数据
  const languages = []
  if (order.script_supported_languages) {
    const scriptLangs = Array.isArray(order.script_supported_languages) 
      ? order.script_supported_languages 
      : [order.script_supported_languages]
    languages.push(...scriptLangs.map(lang => getLanguageText(lang)))
  }
  if (order.escape_room_supported_languages) {
    const roomLangs = Array.isArray(order.escape_room_supported_languages) 
      ? order.escape_room_supported_languages 
      : [order.escape_room_supported_languages]
    languages.push(...roomLangs.map(lang => getLanguageText(lang)))
  }
  
  return languages.length > 0 ? languages.join(' / ') : '未知'
}

const getLanguageText = (language) => {
  const languageMap = {
    'CN': '中文',
    'EN': '英语',
    'IND': '印尼语'
  }
  return languageMap[language] || language
}

// 清理数据
watch(visible, (newVisible) => {
  if (!newVisible) {
    // 重置表单
    formRef.value?.resetFields()
    // 清空缓存的数据
    availableRooms.value = []
    availableScripts.value = []
    availableEscapeRooms.value = []
    selectedEscapeRoom.value = null
  }
})
</script>

<style scoped>
.ant-form-item {
  margin-bottom: 16px;
}

.ant-input-number {
  width: 100%;
}

.ant-select {
  width: 100%;
}
</style> 