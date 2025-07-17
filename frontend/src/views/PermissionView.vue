<template>
  <div class="permission-view">
    <div class="page-header">
      <h1>权限管理</h1>
      <p>管理系统角色和权限配置</p>
    </div>

    <a-row :gutter="24">
      <!-- 左侧：角色列表 -->
      <a-col :xs="24" :lg="8">
        <a-card title="角色管理" class="role-card">
          <template #extra>
            <a-button 
              type="primary" 
              @click="showCreateRoleModal"
              :disabled="!canManageRoles"
            >
              <PlusOutlined />
              新建角色
            </a-button>
          </template>

          <!-- 筛选条件 -->
          <div class="filter-section" v-if="showCompanyFilter">
            <a-form layout="inline" class="filter-form">
              <a-form-item label="查看范围">
                <a-select 
                  v-model:value="selectedCompanyId" 
                  @change="handleCompanyChange"
                  style="width: 200px"
                  placeholder="选择查看范围"
                >
                  <a-select-option value="">
                    {{ isPlatformUser ? '全部角色' : '本公司全部角色' }}
                  </a-select-option>
                  <a-select-option 
                    v-if="isPlatformUser" 
                    value="platform"
                  >
                    仅平台级角色
                  </a-select-option>
                  <a-select-option 
                    v-for="company in availableCompanies" 
                    :key="company.id"
                    :value="company.id"
                  >
                    {{ company.display_name }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-form>
          </div>

          <a-divider v-if="showCompanyFilter" style="margin: 16px 0" />

          <a-list 
            :loading="rolesLoading"
            :data-source="filteredRoles"
            class="role-list"
          >
            <template #renderItem="{ item }">
              <a-list-item
                :class="{ active: selectedRole?.id === item.id }"
                @click="selectRole(item)"
                class="role-item"
              >
                <div class="role-info">
                  <div class="role-name">
                    {{ item.display_name }}
                    <a-tag 
                      :color="getRoleTagColor(item)" 
                      size="small"
                    >
                      {{ getRoleTagText(item) }}
                    </a-tag>
                  </div>
                  <div class="role-description">{{ item.description }}</div>
                  <div class="role-meta">
                    <span class="role-level">{{ getRoleLevelText(item.role_level) }}</span>
                    <span class="role-company" v-if="item.company_name">
                      归属: {{ item.company_name }}
                    </span>
                    <span class="role-company" v-else-if="item.role_level === 'platform'">
                      归属: 平台
                    </span>
                  </div>
                </div>
                <div class="role-actions" v-if="canEditRole(item) || canDeleteRole(item)">
                  <a-button 
                    type="text" 
                    size="small" 
                    @click.stop="editRole(item)"
                    v-if="canEditRole(item)"
                  >
                    <EditOutlined />
                  </a-button>
                  <a-popconfirm
                    title="确定要删除这个角色吗？"
                    @confirm="deleteRole(item.id)"
                    @click.stop
                    v-if="canDeleteRole(item)"
                  >
                    <a-button 
                      type="text" 
                      size="small" 
                      danger
                    >
                      <DeleteOutlined />
                    </a-button>
                  </a-popconfirm>
                </div>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>

      <!-- 右侧：权限配置 -->
      <a-col :xs="24" :lg="16">
        <a-card 
          :title="selectedRole ? `${selectedRole.display_name} - 权限配置` : '请选择角色'"
          class="permission-card"
        >
          <template #extra v-if="selectedRole && canManageRolePermissions(selectedRole)">
            <a-space>
              <a-button @click="resetPermissions">重置</a-button>
              <a-button 
                type="primary" 
                @click="savePermissions"
                :loading="savingPermissions"
              >
                保存权限
              </a-button>
            </a-space>
          </template>

          <div v-if="!selectedRole" class="empty-state">
            <a-empty description="请从左侧选择一个角色来配置权限" />
          </div>

          <div v-else class="permission-content">
            <!-- 角色信息展示 -->
            <div class="role-detail-info">
              <a-descriptions :column="2" size="small">
                <a-descriptions-item label="角色名称">
                  {{ selectedRole.display_name }}
                </a-descriptions-item>
                <a-descriptions-item label="角色层级">
                  {{ getRoleLevelText(selectedRole.role_level) }}
                </a-descriptions-item>
                <a-descriptions-item label="归属公司">
                  {{ selectedRole.company_name || '平台' }}
                </a-descriptions-item>
                <a-descriptions-item label="创建者">
                  {{ selectedRole.created_by_username || '系统' }}
                </a-descriptions-item>
              </a-descriptions>
            </div>

            <a-divider />

            <!-- 权限统计信息 -->
            <div class="permission-stats">
              <a-row :gutter="16">
                <a-col :span="6">
                  <div class="stat-item">
                    <div class="stat-number">{{ totalPermissions }}</div>
                    <div class="stat-label">总权限数</div>
                  </div>
                </a-col>
                <a-col :span="6">
                  <div class="stat-item">
                    <div class="stat-number">{{ selectedPermissionsCount }}</div>
                    <div class="stat-label">已选择</div>
                  </div>
                </a-col>
                <a-col :span="6">
                  <div class="stat-item">
                    <div class="stat-number">{{ totalModules }}</div>
                    <div class="stat-label">权限模块</div>
                  </div>
                </a-col>
                <a-col :span="6">
                  <div class="stat-item">
                    <div class="stat-number">{{ selectedModulesCount }}</div>
                    <div class="stat-label">已选模块</div>
                  </div>
                </a-col>
              </a-row>
            </div>

            <a-divider />

            <!-- 快速操作栏 -->
            <div class="quick-actions" v-if="canManageRolePermissions(selectedRole)">
              <a-space>
                <a-button size="small" @click="selectAllPermissions">
                  <CheckOutlined />
                  全选
                </a-button>
                <a-button size="small" @click="clearAllPermissions">
                  <ClearOutlined />
                  清空
                </a-button>
                <a-button size="small" @click="expandAllModules">
                  <DownOutlined />
                  展开全部
                </a-button>
                <a-button size="small" @click="collapseAllModules">
                  <UpOutlined />
                  收起全部
                </a-button>
              </a-space>
            </div>

            <a-divider style="margin: 16px 0" />

            <!-- 权限模块列表 -->
            <a-spin :spinning="permissionsLoading">
              <div class="permission-modules-container">
                <a-collapse v-model:activeKey="activeModules" ghost>
                  <a-collapse-panel 
                    v-for="module in permissionStructure" 
                    :key="module.id"
                    :header="module.display_name"
                    class="permission-module"
                  >
                    <template #extra>
                      <div class="module-actions">
                        <span class="module-count">
                          {{ getModuleSelectedCount(module) }}/{{ module.permissions.length }}
                        </span>
                        <a-checkbox
                          :checked="isModuleFullyChecked(module)"
                          :indeterminate="isModuleIndeterminate(module)"
                          @change="toggleModule(module, $event.target.checked)"
                          @click.stop
                          :disabled="!canManageRolePermissions(selectedRole)"
                        >
                          全选
                        </a-checkbox>
                      </div>
                    </template>

                    <div class="permission-list">
                      <a-row :gutter="[16, 12]">
                        <a-col 
                          v-for="permission in module.permissions" 
                          :key="permission.id"
                          :xs="24" :sm="12" :md="8" :lg="6"
                        >
                          <div class="permission-card-item">
                            <a-checkbox
                              v-model:checked="selectedPermissions[permission.id]"
                              :disabled="!canManageRolePermissions(selectedRole)"
                            >
                              <div class="permission-item-content">
                                <div class="permission-name">{{ permission.display_name }}</div>
                                <div class="permission-desc">{{ permission.description }}</div>
                              </div>
                            </a-checkbox>
                          </div>
                        </a-col>
                      </a-row>
                    </div>
                  </a-collapse-panel>
                </a-collapse>
              </div>
            </a-spin>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 创建/编辑角色弹窗 -->
    <a-modal
      v-model:open="roleModalVisible"
      :title="isEditingRole ? '编辑角色' : '创建角色'"
      @ok="handleRoleSubmit"
      :confirm-loading="submittingRole"
      width="600px"
    >
      <a-form
        ref="roleFormRef"
        :model="roleForm"
        :rules="roleFormRules"
        layout="vertical"
      >
        <a-form-item label="角色名称" name="name" v-if="!isEditingRole">
          <a-input 
            v-model:value="roleForm.name" 
            placeholder="请输入角色名称（英文标识）"
            :disabled="isEditingRole"
          />
          <div class="form-help">
            用于系统内部识别，只能包含字母、数字和下划线
          </div>
        </a-form-item>

        <a-form-item label="显示名称" name="display_name">
          <a-input 
            v-model:value="roleForm.display_name" 
            placeholder="请输入显示名称"
          />
        </a-form-item>

        <a-form-item label="角色层级" name="role_level" v-if="!isEditingRole">
          <a-select 
            v-model:value="roleForm.role_level" 
            placeholder="请选择角色层级"
            @change="handleRoleLevelChange"
          >
            <a-select-option 
              v-for="level in creatableRoleLevels" 
              :key="level.value"
              :value="level.value"
            >
              {{ level.label }} - {{ level.description }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item 
          label="归属公司" 
          name="company_id" 
          v-if="!isEditingRole && needCompanySelection"
        >
          <a-select 
            v-model:value="roleForm.company_id" 
            placeholder="请选择归属公司"
          >
            <a-select-option 
              v-for="company in availableCompaniesForRole" 
              :key="company.id"
              :value="company.id"
            >
              {{ company.display_name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="角色描述" name="description">
          <a-textarea 
            v-model:value="roleForm.description" 
            placeholder="请输入角色描述"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  CheckOutlined,
  ClearOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons-vue'
import { permissionAPI } from '@/api/permission'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 响应式数据
const roles = ref([])
const selectedRole = ref(null)
const permissionStructure = ref([])
const selectedPermissions = reactive({})
const originalPermissions = reactive({})
const selectedCompanyId = ref('')
const availableCompanies = ref([])
const creatableRoleLevels = ref([])
const availableCompaniesForRole = ref([])

// 加载状态
const rolesLoading = ref(false)
const permissionsLoading = ref(false)
const savingPermissions = ref(false)

// 角色弹窗
const roleModalVisible = ref(false)
const isEditingRole = ref(false)
const submittingRole = ref(false)
const roleFormRef = ref(null)

// 权限面板展开状态
const activeModules = ref([])

// 角色表单
const roleForm = reactive({
  name: '',
  display_name: '',
  description: '',
  role_level: '',
  company_id: ''
})

// 表单验证规则
const roleFormRules = {
  name: [
    { required: true, message: '请输入角色名称' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线' }
  ],
  display_name: [
    { required: true, message: '请输入显示名称' }
  ],
  role_level: [
    { required: true, message: '请选择角色层级' }
  ],
  company_id: [
    { 
      required: true, 
      message: '请选择归属公司',
      validator: (rule, value) => {
        if (needCompanySelection.value && !value) {
          return Promise.reject('请选择归属公司')
        }
        return Promise.resolve()
      }
    }
  ]
}

// 计算属性
const isPlatformUser = computed(() => {
  return authStore.user?.account_level === 'platform'
})

const isCompanyUser = computed(() => {
  return authStore.user?.account_level === 'company'
})

const isStoreUser = computed(() => {
  return authStore.user?.account_level === 'store'
})

const canManageRoles = computed(() => {
  return authStore.hasPermission('system.role') || 
         authStore.hasPermission('system.permission')
})

const showCompanyFilter = computed(() => {
  return isPlatformUser.value || isCompanyUser.value
})

const filteredRoles = computed(() => {
  if (!selectedCompanyId.value) {
    return roles.value
  }
  
  if (selectedCompanyId.value === 'platform') {
    return roles.value.filter(role => role.role_level === 'platform')
  }
  
  return roles.value.filter(role => role.company_id === selectedCompanyId.value)
})

const needCompanySelection = computed(() => {
  return roleForm.role_level && 
         roleForm.role_level !== 'platform' && 
         isPlatformUser.value
})

// 权限统计
const totalPermissions = computed(() => {
  return permissionStructure.value.reduce((total, module) => {
    return total + module.permissions.length
  }, 0)
})

const selectedPermissionsCount = computed(() => {
  return Object.keys(selectedPermissions).filter(key => selectedPermissions[key]).length
})

const totalModules = computed(() => {
  return permissionStructure.value.length
})

const selectedModulesCount = computed(() => {
  return permissionStructure.value.filter(module => 
    module.permissions.some(p => selectedPermissions[p.id])
  ).length
})

// 检查是否可以编辑指定角色
const canEditRole = (role) => {
  if (!canManageRoles.value) return false
  
  // 超级管理员角色不能编辑
  if (role.name === 'superadmin' && role.is_system_role) {
    return false
  }
  
  // 平台用户可以编辑所有角色
  if (isPlatformUser.value) {
    return true
  }
  
  // 公司用户可以编辑本公司的公司级和门店级角色
  if (isCompanyUser.value) {
    return role.company_id === authStore.user?.company_id &&
           ['company', 'store'].includes(role.role_level)
  }
  
  // 门店用户只能编辑本公司的门店级角色
  if (isStoreUser.value) {
    return role.company_id === authStore.user?.company_id &&
           role.role_level === 'store'
  }
  
  return false
}

// 检查是否可以删除指定角色
const canDeleteRole = (role) => {
  if (!canEditRole(role)) return false
  
  // 系统角色不能删除
  if (role.is_system_role) return false
  
  // 超级管理员角色不能删除
  if (role.name === 'superadmin') return false
  
  return true
}

// 检查是否可以管理角色权限
const canManageRolePermissions = (role) => {
  if (!role) return false
  
  // 超级管理员角色权限不能修改
  if (role.name === 'superadmin' && role.is_system_role) {
    return false
  }
  
  return canEditRole(role)
}

// 获取角色标识颜色
const getRoleTagColor = (role) => {
  if (role.role_level === 'platform') return 'purple'
  if (role.role_level === 'company') return 'blue'
  if (role.role_level === 'store') return 'green'
  return 'default'
}

// 获取角色标识文本
const getRoleTagText = (role) => {
  if (role.is_system_role) return '系统角色'
  return getRoleLevelText(role.role_level)
}

// 获取角色层级文本
const getRoleLevelText = (level) => {
  const levelMap = {
    'platform': '平台级',
    'company': '公司级',
    'store': '门店级'
  }
  return levelMap[level] || level
}

// 检查模块是否全部选中
const isModuleFullyChecked = (module) => {
  return module.permissions.every(p => selectedPermissions[p.id])
}

// 检查模块是否部分选中
const isModuleIndeterminate = (module) => {
  const checkedCount = module.permissions.filter(p => selectedPermissions[p.id]).length
  return checkedCount > 0 && checkedCount < module.permissions.length
}

// 获取模块已选权限数量
const getModuleSelectedCount = (module) => {
  return module.permissions.filter(p => selectedPermissions[p.id]).length
}

// 方法
const loadRoles = async () => {
  try {
    rolesLoading.value = true
    const response = await permissionAPI.getRoles(
      selectedCompanyId.value === 'platform' ? null : selectedCompanyId.value
    )
    
    roles.value = response.data || []
  } catch (error) {
    message.error('加载角色列表失败')
    console.error('加载角色失败:', error)
  } finally {
    rolesLoading.value = false
  }
}

const loadPermissionStructure = async () => {
  try {
    const response = await permissionAPI.getPermissionStructure()
    permissionStructure.value = response.data || []
    
    // 默认展开所有模块
    activeModules.value = permissionStructure.value.map(m => m.id)
  } catch (error) {
    message.error('加载权限结构失败')
    console.error('加载权限结构失败:', error)
  }
}

const loadCreatableRoleLevels = async () => {
  try {
    const response = await permissionAPI.getCreatableRoleLevels()
    const data = response.data || {}
    
    // 将后端返回的数据转换为前端期望的格式
    if (data.creatable_levels && data.level_descriptions) {
      creatableRoleLevels.value = data.creatable_levels.map(level => ({
        value: level,
        label: getLevelDisplayName(level),
        description: data.level_descriptions[level] || ''
      }))
    } else {
      creatableRoleLevels.value = []
    }
  } catch (error) {
    console.error('加载可创建角色层级失败:', error)
    creatableRoleLevels.value = []
  }
}

// 添加获取层级显示名称的辅助函数
const getLevelDisplayName = (level) => {
  const levelMap = {
    'platform': '平台级',
    'company': '公司级', 
    'store': '门店级'
  }
  return levelMap[level] || level
}

const loadCompaniesForRole = async () => {
  try {
    const response = await permissionAPI.getCompaniesForRole()
    const companies = response.data || []
    
    // 为每个公司添加display_name字段
    const companiesWithDisplayName = companies.map(company => ({
      ...company,
      display_name: `${company.name} (${company.type})`
    }))
    
    availableCompaniesForRole.value = companiesWithDisplayName
    
    // 如果是平台用户，同时设置筛选用的公司列表
    if (isPlatformUser.value) {
      availableCompanies.value = companiesWithDisplayName
    } else if (isCompanyUser.value) {
      // 公司用户只能看到自己的公司
      availableCompanies.value = companiesWithDisplayName.filter(
        company => company.id === authStore.user?.company_id
      )
    }
  } catch (error) {
    console.error('加载公司列表失败:', error)
  }
}

const handleCompanyChange = () => {
  selectedRole.value = null
  Object.keys(selectedPermissions).forEach(key => {
    delete selectedPermissions[key]
  })
  loadRoles()
}

const handleRoleLevelChange = () => {
  roleForm.company_id = ''
}

const selectRole = async (role) => {
  selectedRole.value = role
  await loadRolePermissions(role.id)
}

const loadRolePermissions = async (roleId) => {
  try {
    permissionsLoading.value = true
    const response = await permissionAPI.getRoleDetails(roleId)
    
    // 清空之前的选择
    Object.keys(selectedPermissions).forEach(key => {
      delete selectedPermissions[key]
    })
    Object.keys(originalPermissions).forEach(key => {
      delete originalPermissions[key]
    })
    
    // 设置当前角色的权限
    if (response.data?.permissions) {
      response.data.permissions.forEach(permission => {
        selectedPermissions[permission.id] = true
        originalPermissions[permission.id] = true
      })
    }
  } catch (error) {
    message.error('加载角色权限失败')
    console.error('加载角色权限失败:', error)
  } finally {
    permissionsLoading.value = false
  }
}

const toggleModule = (module, checked) => {
  module.permissions.forEach(permission => {
    selectedPermissions[permission.id] = checked
  })
}

const resetPermissions = () => {
  Object.keys(selectedPermissions).forEach(key => {
    delete selectedPermissions[key]
  })
  Object.keys(originalPermissions).forEach(key => {
    selectedPermissions[key] = true
  })
}

// 快速操作方法
const selectAllPermissions = () => {
  permissionStructure.value.forEach(module => {
    module.permissions.forEach(permission => {
      selectedPermissions[permission.id] = true
    })
  })
}

const clearAllPermissions = () => {
  Object.keys(selectedPermissions).forEach(key => {
    selectedPermissions[key] = false
  })
}

const expandAllModules = () => {
  activeModules.value = permissionStructure.value.map(m => m.id)
}

const collapseAllModules = () => {
  activeModules.value = []
}

const savePermissions = async () => {
  if (!selectedRole.value) return
  
  try {
    savingPermissions.value = true
    const permissionIds = Object.keys(selectedPermissions).filter(
      key => selectedPermissions[key]
    )
    
    await permissionAPI.assignPermissions(selectedRole.value.id, permissionIds)
    
    // 更新原始权限状态
    Object.keys(originalPermissions).forEach(key => {
      delete originalPermissions[key]
    })
    permissionIds.forEach(id => {
      originalPermissions[id] = true
    })
    
    message.success('权限保存成功')
  } catch (error) {
    message.error('权限保存失败')
    console.error('权限保存失败:', error)
  } finally {
    savingPermissions.value = false
  }
}

const showCreateRoleModal = async () => {
  isEditingRole.value = false
  roleForm.name = ''
  roleForm.display_name = ''
  roleForm.description = ''
  roleForm.role_level = ''
  roleForm.company_id = ''
  
  // 加载可创建的角色层级
  await loadCreatableRoleLevels()
  
  roleModalVisible.value = true
}

const editRole = (role) => {
  isEditingRole.value = true
  roleForm.name = role.name
  roleForm.display_name = role.display_name
  roleForm.description = role.description || ''
  roleForm.role_level = role.role_level
  roleForm.company_id = role.company_id || ''
  roleForm.id = role.id
  roleModalVisible.value = true
}

const handleRoleSubmit = async () => {
  try {
    await roleFormRef.value.validate()
    submittingRole.value = true
    
    if (isEditingRole.value) {
      await permissionAPI.updateRole(roleForm.id, {
        display_name: roleForm.display_name,
        description: roleForm.description
      })
      message.success('角色更新成功')
    } else {
      await permissionAPI.createRole(roleForm)
      message.success('角色创建成功')
    }
    
    roleModalVisible.value = false
    await loadRoles()
  } catch (error) {
    if (error.errorFields) {
      // 表单验证错误
      return
    }
    message.error(isEditingRole.value ? '角色更新失败' : '角色创建失败')
    console.error('角色操作失败:', error)
  } finally {
    submittingRole.value = false
  }
}

const deleteRole = async (roleId) => {
  try {
    await permissionAPI.deleteRole(roleId)
    message.success('角色删除成功')
    
    // 如果删除的是当前选中的角色，清空选择
    if (selectedRole.value?.id === roleId) {
      selectedRole.value = null
      Object.keys(selectedPermissions).forEach(key => {
        delete selectedPermissions[key]
      })
    }
    
    await loadRoles()
  } catch (error) {
    message.error('角色删除失败')
    console.error('角色删除失败:', error)
  }
}

// 监听角色层级变化
watch(() => roleForm.role_level, () => {
  if (roleForm.role_level === 'platform') {
    roleForm.company_id = ''
  }
})

// 生命周期
onMounted(async () => {
  await Promise.all([
    loadPermissionStructure(),
    loadCompaniesForRole()
  ])
  
  // 设置默认查询范围
  if (isPlatformUser.value) {
    selectedCompanyId.value = 'platform' // 平台用户默认查看平台级角色
  } else {
    selectedCompanyId.value = '' // 其他用户默认查看全部
  }
  
  await loadRoles()
})
</script>

<style scoped>
.permission-view {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.85);
}

.page-header p {
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 0;
}

.role-card {
  height: calc(100vh - 200px);
  overflow: hidden;
}

.permission-card {
  height: calc(100vh - 200px);
  overflow: hidden;
}

.permission-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.filter-section {
  margin-bottom: 16px;
}

.filter-form {
  width: 100%;
}

.role-list {
  height: calc(100% - 120px);
  overflow-y: auto;
}

.role-item {
  cursor: pointer;
  border-radius: 6px;
  margin-bottom: 8px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
}

.role-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.role-item.active {
  border-color: #1890ff;
  background-color: #f6ffed;
}

.role-info {
  flex: 1;
}

.role-name {
  font-weight: 500;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-description {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 4px;
}

.role-meta {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.35);
  display: flex;
  gap: 12px;
}

.role-level {
  font-weight: 500;
}

.role-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.role-item:hover .role-actions {
  opacity: 1;
}

.role-detail-info {
  background: #fafafa;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

/* 权限统计样式 */
.permission-stats {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #1890ff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

/* 快速操作栏 */
.quick-actions {
  margin-bottom: 16px;
  flex-shrink: 0;
}

/* 权限模块容器 */
.permission-modules-container {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 500px);
  min-height: 300px;
  padding-bottom: 20px;
}

.permission-module {
  margin-bottom: 16px;
}

.permission-module:last-child {
  margin-bottom: 0;
  padding-bottom: 150px;
}

.module-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-count {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.permission-list {
  padding: 16px 0;
}

.permission-card-item {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px;
  transition: all 0.3s;
}

.permission-card-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.permission-item-content {
  margin-left: 8px;
}

.permission-name {
  font-weight: 500;
  margin-bottom: 4px;
  color: rgba(0, 0, 0, 0.85);
}

.permission-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.form-help {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .permission-view {
    padding: 16px;
  }
  
  .role-card,
  .permission-card {
    height: auto;
    margin-bottom: 16px;
  }
  
  .filter-form {
    flex-direction: column;
  }
  
  .role-meta {
    flex-direction: column;
    gap: 4px;
  }
  
  .permission-stats .ant-col {
    margin-bottom: 12px;
  }
  
  .quick-actions {
    text-align: center;
  }
  
  .quick-actions .ant-space {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* 滚动条样式 */
.permission-modules-container::-webkit-scrollbar {
  width: 6px;
}

.permission-modules-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.permission-modules-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.permission-modules-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style> 