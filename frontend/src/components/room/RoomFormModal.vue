<template>
  <a-modal
    v-model:open="modalVisible"
    :title="mode === 'create' ? '新建房间' : '编辑房间'"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
    width="600px"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      layout="vertical"
    >
      <!-- 门店选择 -->
      <a-form-item label="所属门店" name="store_id" v-if="!storeId">
        <a-select
          v-model:value="formData.store_id"
          placeholder="选择门店"
          :disabled="mode === 'edit'"
        >
          <a-select-option 
            v-for="store in availableStores" 
            :key="store.id" 
            :value="store.id"
          >
            {{ store.name }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- 房间基本信息 -->
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="房间名称" name="name">
            <a-input v-model:value="formData.name" placeholder="请输入房间名称" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="房间类型" name="room_type">
            <a-select v-model:value="formData.room_type" placeholder="选择房间类型">
              <a-select-option value="剧本杀">剧本杀</a-select-option>
              <a-select-option value="密室">密室</a-select-option>
              <a-select-option value="混合">混合</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="房间容量" name="capacity">
            <a-input-number 
              v-model:value="formData.capacity" 
              :min="1" 
              :max="50"
              placeholder="1-50人"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12" v-if="mode === 'edit'">
          <a-form-item label="房间状态" name="status">
            <a-select v-model:value="formData.status" placeholder="选择房间状态">
              <a-select-option value="正常">正常</a-select-option>
              <a-select-option value="维护">维护</a-select-option>
              <a-select-option value="关闭">关闭</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 房间描述 -->
      <a-form-item label="房间描述" name="description">
        <a-textarea 
          v-model:value="formData.description" 
          placeholder="请输入房间描述"
          :rows="3"
          :maxlength="1000"
          show-count
        />
      </a-form-item>

      <!-- 设备信息 -->
      <a-form-item label="设备信息" name="equipment">
        <a-textarea 
          v-model:value="formData.equipment" 
          placeholder="请输入设备信息"
          :rows="2"
          :maxlength="500"
          show-count
        />
      </a-form-item>

      <!-- 备注 -->
      <a-form-item label="备注" name="notes">
        <a-textarea 
          v-model:value="formData.notes" 
          placeholder="请输入备注信息"
          :rows="2"
          :maxlength="500"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { roomAPI } from '@/api/room'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'create' // 'create' | 'edit'
  },
  roomData: {
    type: Object,
    default: null
  },
  storeId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 响应式数据
const loading = ref(false)
const availableStores = ref([])
const formRef = ref()

// 弹窗显示状态
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 表单数据
const formData = reactive({
  store_id: props.storeId || null,
  name: '',
  room_type: '',
  capacity: 1,
  status: '正常',
  description: '',
  equipment: '',
  notes: ''
})

// 表单验证规则
const formRules = computed(() => ({
  store_id: props.storeId ? [] : [
    { required: true, message: '请选择所属门店', trigger: 'change' }
  ],
  name: [
    { required: true, message: '请输入房间名称', trigger: 'blur' },
    { min: 1, max: 255, message: '房间名称长度在1-255字符之间', trigger: 'blur' }
  ],
  room_type: [
    { required: true, message: '请选择房间类型', trigger: 'change' }
  ],
  capacity: [
    { required: true, message: '请输入房间容量', trigger: 'blur' },
    { type: 'number', min: 1, max: 50, message: '房间容量应在1-50之间', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择房间状态', trigger: 'change' }
  ]
}))

// 方法
const loadAvailableStores = async () => {
  if (props.storeId) return
  
  try {
    const response = await roomAPI.getAvailableStores()
    availableStores.value = response.data || []
  } catch (error) {
    console.error('获取可选门店列表失败:', error)
  }
}

const resetForm = () => {
  Object.assign(formData, {
    store_id: props.storeId || null,
    name: '',
    room_type: '',
    capacity: 1,
    status: '正常',
    description: '',
    equipment: '',
    notes: ''
  })
  
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

const fillForm = () => {
  if (props.roomData && props.mode === 'edit') {
    Object.assign(formData, {
      store_id: props.roomData.store_id,
      name: props.roomData.name,
      room_type: props.roomData.room_type,
      capacity: props.roomData.capacity,
      status: props.roomData.status,
      description: props.roomData.description || '',
      equipment: props.roomData.equipment || '',
      notes: props.roomData.notes || ''
    })
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true
    
    // 准备提交数据
    const submitData = { ...formData }
    
    // 确保使用正确的门店ID
    if (props.storeId) {
      submitData.store_id = props.storeId
    }
    
    if (props.mode === 'create') {
      await roomAPI.createRoom(submitData)
      message.success('房间创建成功')
    } else {
      await roomAPI.updateRoom(props.roomData.id, submitData)
      message.success('房间更新成功')
    }
    
    emit('success')
  } catch (error) {
    if (error.errorFields) {
      // 表单验证错误
      return
    }
    message.error('操作失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  modalVisible.value = false
  resetForm()
}

// 监听弹窗显示状态
watch(() => props.visible, (visible) => {
  if (visible) {
    loadAvailableStores()
    if (props.mode === 'create') {
      resetForm()
    } else {
      fillForm()
    }
  }
})

// 生命周期
onMounted(() => {
  loadAvailableStores()
})
</script>

<style scoped>
/* 组件样式 */
</style> 