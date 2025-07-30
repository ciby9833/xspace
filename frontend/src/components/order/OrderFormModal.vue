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

      <!-- 🆕 项目选择区域 -->
      <a-divider orientation="left">
        <span class="section-title">项目选择</span>
      </a-divider>

      <!-- 剧本杀专用字段 -->
      <div v-if="form.order_type === '剧本杀'" class="project-section">
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
                @change="handleScriptChange"
              >
                <a-select-option 
                  v-for="script in scriptList" 
                  :key="script.id" 
                  :value="script.id"
                >
                  {{ script.name }} (Rp {{ script.store_price?.toLocaleString() || script.price?.toLocaleString() || '价格待定' }})
                </a-select-option>
              </a-select>
              <div v-if="!form.store_id" class="help-text">
                请先选择门店
              </div>
              <div v-else-if="loadingResources" class="help-text">
                正在加载门店剧本...
              </div>
              <div v-else-if="scriptList.length === 0" class="help-text error">
                该门店暂无可用剧本
              </div>
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <!-- 密室专用字段 -->
      <div v-if="form.order_type === '密室'" class="project-section">
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
                @change="handleEscapeRoomChange"
              >
                <a-select-option 
                  v-for="room in escapeRoomList" 
                  :key="room.id" 
                  :value="room.id"
                >
                  {{ room.name }} (Rp {{ room.store_price?.toLocaleString() || room.price?.toLocaleString() || '价格待定' }})
                </a-select-option>
              </a-select>
              <div v-if="!form.store_id" class="help-text">
                请先选择门店
              </div>
              <div v-else-if="loadingResources" class="help-text">
                正在加载门店密室...
              </div>
              <div v-else-if="escapeRoomList.length === 0" class="help-text error">
                该门店暂无可用密室
              </div>
            </a-form-item>
          </a-col>
        </a-row>
        
        <!-- NPC信息 -->
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="NPC数量">
              <a-input-number 
                :value="selectedEscapeRoom?.npc_count || 0"
                :min="0" 
                :max="10" 
                placeholder="根据密室自动设置"
                style="width: 100%"
                disabled
                class="readonly-field"
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
              <div v-if="selectedEscapeRoom?.npc_roles && selectedEscapeRoom.npc_roles.length > 0" class="help-text">
                可选角色：{{ selectedEscapeRoom.npc_roles.join(', ') }}
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

      <!-- 🆕 角色定价选择区域 -->
      <div v-if="form.order_type && form.store_id && (form.script_id || form.escape_room_id)" class="role-pricing-wrapper">
        <a-divider orientation="left">
          <span class="section-title">角色定价选择</span>
        </a-divider>
        
        <div class="role-pricing-section">
          <!-- 加载状态 -->
          <div v-if="loadingRolePricing" class="loading-container">
            <a-spin />
            <span>加载角色定价中...</span>
          </div>

          <!-- 角色定价卡片列表 -->
          <div v-else-if="availableRoleTemplates.length > 0" class="role-cards-container">
            <div class="role-cards-grid">
              <div 
                v-for="template in availableRoleTemplates" 
                :key="template.id"
                :class="[
                  'role-card',
                  { 'selected': isRoleTemplateSelected(template.id) }
                ]"
                @click="toggleRoleTemplate(template)"
              >
                <div class="role-card-header">
                  <div class="role-info">
                    <h5 class="role-name">{{ template.role_name }}</h5>
                    <span class="role-discount">
                      {{ formatDiscount(template.discount_type, template.discount_value, template.discount_display) }}
                    </span>
                  </div>
                  <div class="role-checkbox">
                    <a-checkbox :checked="isRoleTemplateSelected(template.id)" />
                  </div>
                </div>
                
                <div v-if="template.role_description" class="role-description">
                  {{ template.role_description }}
                </div>
                
                <!-- 人数输入（仅在选中时显示） -->
                <div v-if="isRoleTemplateSelected(template.id)" class="player-count-input" @click.stop>
                  <label>人数:</label>
                  <a-input-number
                    :value="getSelectedRolePlayerCount(template.id)"
                    :min="1"
                    :max="form.player_count || 20"
                    @change="updateRolePlayerCount(template.id, $event)"
                    size="small"
                  />
                </div>

                <!-- 有效期显示 -->
                <div v-if="template.validity_display" class="role-validity">
                  <small class="validity-text">
                    有效期: {{ template.validity_display }}
                  </small>
                </div>
              </div>
            </div>

            <!-- 选择汇总 -->
            <div v-if="selectedRoleTemplates.length > 0" class="selected-roles-summary">
              <div class="summary-header">
                <h5>已选择角色 ({{ selectedRoleTemplates.length }})</h5>
              </div>
              <div class="summary-items">
                <div 
                  v-for="selected in selectedRoleTemplates" 
                  :key="selected.template_id"
                  class="summary-item"
                >
                  <span class="role-name">{{ getRoleTemplateName(selected.template_id) }}</span>
                  <span class="player-count">{{ selected.player_count }} 人</span>
                  <span class="discount">{{ getRoleTemplateDiscount(selected.template_id) }}</span>
                </div>
              </div>
              <div class="total-players">
                <span>角色定价总人数: {{ getTotalRolePlayers() }} / {{ form.player_count || 0 }}</span>
              </div>
            </div>
          </div>

          <!-- 无数据状态 -->
          <div v-else class="no-role-templates">
            <div class="empty-icon">
              <TagOutlined />
            </div>
            <p>暂无可用的角色定价方案</p>
            <p class="empty-hint">当前门店尚未配置角色定价模板</p>
          </div>
        </div>
      </div>

      <!-- 🆕 支付配置区域 -->
      <a-divider orientation="left">
        <span class="section-title">支付配置</span>
      </a-divider>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="支付类型" name="free_pay">
            <a-radio-group v-model:value="form.free_pay" size="large">
              <a-radio-button value="Free">免费</a-radio-button>
              <a-radio-button value="Pay">付费</a-radio-button>
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
              class="price-input"
            />
            
            <!-- 🆕 折扣明细（放在单价下面） -->
            <div v-if="form.unit_price > 0 && form.player_count > 0" class="discount-detail-container">
              <!-- 角色折扣明细 -->
              <div v-if="priceDetail.roleDiscounts.length > 0" class="price-section">
                <h6 class="price-section-title">角色折扣明细</h6>
                <div 
                  v-for="(role, index) in priceDetail.roleDiscounts" 
                  :key="index"
                  class="price-item"
                >
                  <div class="price-item-header">
                    <span class="role-name">{{ role.role_name }}</span>
                    <span class="role-discount">{{ role.discount_info }}</span>
                  </div>
                  <div class="price-item-detail">
                    <span class="player-info">{{ role.player_count }}人 × Rp {{ formatPrice(role.unit_price) }}</span>
                    <span class="original-amount">= Rp {{ formatPrice(role.original_amount) }}</span>
                  </div>
                  <div class="price-item-result">
                    <span class="discount-amount">折扣: -Rp {{ formatPrice(role.discount_amount) }}</span>
                    <span class="final-amount">应收: Rp {{ formatPrice(role.final_amount) }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 无折扣明细 -->
              <div v-if="priceDetail.noDiscountPlayers > 0" class="price-section">
                <h6 class="price-section-title">无折扣明细</h6>
                <div class="price-item">
                  <div class="price-item-header">
                    <span class="role-name">标准价格</span>
                  </div>
                  <div class="price-item-detail">
                    <span class="player-info">{{ priceDetail.noDiscountPlayers }}人 × Rp {{ formatPrice(form.unit_price || 0) }}</span>
                    <span class="final-amount">= Rp {{ formatPrice(priceDetail.noDiscountAmount) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16" v-if="form.free_pay === 'Pay'">
        <a-col :span="12">
          <a-form-item label="总金额" name="total_amount">
            <a-input-number 
              v-model:value="form.total_amount" 
              :min="0" 
              placeholder="自动计算：考虑角色折扣"
              style="width: 100%"
              :formatter="value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
              :parser="value => value.replace(/Rp\s?|(,*)/g, '')"
              @change="calculateRemainingAmount"
              readonly
              class="readonly-field"
            />
            
            <!-- 🆕 总计汇总（放在总金额下面） -->
            <div v-if="form.unit_price > 0 && form.player_count > 0" class="total-summary-container">
              <div class="price-summary">
                <div class="summary-row">
                  <span>原价总计:</span>
                  <span>Rp {{ formatPrice((form.player_count || 0) * (form.unit_price || 0)) }}</span>
                </div>
                <div v-if="priceDetail.totalDiscount > 0" class="summary-row discount">
                  <span>折扣总计:</span>
                  <span>-Rp {{ formatPrice(priceDetail.totalDiscount) }}</span>
                </div>
                <div class="summary-row total">
                  <span>应收总计:</span>
                  <span>Rp {{ formatPrice(priceDetail.totalAmount) }}</span>
                </div>
              </div>
            </div>
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
              class="readonly-field"
            />
            <small class="calculation-note">
              自动计算：Rp {{ formatPrice(form.total_amount || 0) }} - Rp {{ formatPrice(form.prepaid_amount || 0) }}
            </small>
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
            <div class="help-text">
              支持JPG、PNG格式，最多上传5张图片，每张不超过2MB
            </div>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 🆕 其他配置区域 -->
      <a-divider orientation="left">
        <span class="section-title">其他配置</span>
      </a-divider>

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
            <div v-if="checkingRoom" class="help-text">
              正在检查房间可用性...
            </div>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="优惠数量" name="promo_quantity">
            <a-input-number 
              v-model:value="form.promo_quantity" 
              :min="0" 
              placeholder="优惠数量（选填）"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
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
import { PlusOutlined, TagOutlined } from '@ant-design/icons-vue'
import { rolePricingTemplateAPI } from '@/api/multiPayment'
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

// 🆕 角色定价相关数据
const loadingRolePricing = ref(false)
const availableRoleTemplates = ref([])
const selectedRoleTemplates = ref([])

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
    } else if (key === 'unit_price' || key === 'prepaid_amount' || key === 'remaining_amount') {
      form[key] = 0
    } else if (key === 'selected_npc_roles') {
      form[key] = []
    } else if (typeof form[key] === 'boolean') {
      form[key] = false
    } else {
      form[key] = null
    }
  })
  paymentImages.value = []
  selectedRoleTemplates.value = []
  availableRoleTemplates.value = []
  loadingRolePricing.value = false
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
  remaining_amount: 0,
  // 🆕 新增密室NPC角色选择
  selected_npc_roles: [],
  // 🆕 角色定价模板选择（保存历史数据）
  selected_role_templates: []
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
  ],
  selected_npc_roles: [
    { type: 'array', message: '选择的NPC角色必须是数组格式' }
  ],
  selected_role_templates: [
    {
      validator: (rule, value) => {
        // 验证角色定价人数不能超过游戏总人数
        if (form.free_pay === 'Pay') {
          const totalRolePlayers = getTotalRolePlayers()
          if (totalRolePlayers > form.player_count) {
            return Promise.reject(`角色定价总人数(${totalRolePlayers})不能超过游戏总人数(${form.player_count})`)
          }
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
    
    // 🆕 处理NPC角色数据
    if (newData.escape_room_npc_roles) {
      form.selected_npc_roles = newData.escape_room_npc_roles
    }
    
    // 🆕 处理角色定价数据（编辑时加载原有选择）
    if (newData.selected_role_templates && Array.isArray(newData.selected_role_templates)) {
      form.selected_role_templates = newData.selected_role_templates
      // 同步到响应式状态中
      selectedRoleTemplates.value = newData.selected_role_templates.map(template => ({
        template_id: template.template_id,
        player_count: template.player_count || 1
      }))
      console.log('🎯 加载订单原有角色定价:', selectedRoleTemplates.value)
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
      // 🆕 编辑模式下加载角色定价模板
      await loadAvailableRolePricingTemplates(newData.store_id)
    }
  } else {
    // 新建订单时重置表单
    resetForm()
  }
}, { immediate: true, deep: true })

// 🆕 监听表单弹窗显示状态 - 确保每次打开都重新加载数据
watch(() => props.visible, async (isVisible) => {
  if (isVisible) {
    console.log('📖 表单弹窗打开，准备加载数据')
    
    // 如果有门店ID，立即加载角色定价模板
    if (form.store_id) {
      console.log('🎯 检测到门店ID，开始加载角色定价模板:', form.store_id)
      await loadAvailableRolePricingTemplates(form.store_id)
    }
  } else {
    // 弹窗关闭时清理数据，确保下次打开时状态干净
    console.log('📖 表单弹窗关闭，清理数据状态')
    availableRoleTemplates.value = []
    selectedRoleTemplates.value = []
    loadingRolePricing.value = false
  }
})

// 🆕 监听门店变化 - 修复编辑时不应重置已选项目
watch(() => form.store_id, async (newStoreId, oldStoreId) => {
  if (newStoreId && newStoreId !== oldStoreId) {
    console.log('🏪 门店变化:', { newStoreId, oldStoreId, isEdit: props.isEdit })
    
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
    
    // 🆕 加载角色定价模板（无论是新增还是编辑都要加载）
    console.log('🎯 门店变化，开始加载角色定价模板:', newStoreId)
    await loadAvailableRolePricingTemplates(newStoreId)
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

// 🆕 监听密室选择变化
watch(() => form.escape_room_id, (newEscapeRoomId) => {
  if (newEscapeRoomId) {
    const escapeRoom = escapeRoomList.value.find(room => room.id === newEscapeRoomId)
    if (escapeRoom && escapeRoom.npc_roles) {
      // 默认选择所有可用的NPC角色
      form.selected_npc_roles = [...escapeRoom.npc_roles]
    } else {
      form.selected_npc_roles = []
    }
  } else {
    form.selected_npc_roles = []
  }
})

// 🆕 监听人数变化，自动重新计算总金额
watch(() => form.player_count, () => {
  if (form.free_pay === 'Pay' && form.unit_price > 0) {
    calculateTotalAmount()
  }
})

// 🆕 监听单价变化，自动重新计算总金额
watch(() => form.unit_price, () => {
  if (form.free_pay === 'Pay' && form.player_count > 0) {
    calculateTotalAmount()
  }
})

// 🆕 监听角色模板变化，自动重新计算总金额
watch(() => selectedRoleTemplates.value, () => {
  if (form.free_pay === 'Pay' && form.unit_price > 0 && form.player_count > 0) {
    calculateTotalAmount()
  }
}, { deep: true })

// 🆕 监听支付类型变化 - 确保从Free切换到Pay时能加载角色定价模板
watch(() => form.free_pay, async (newPayType) => {
  if (newPayType === 'Pay' && form.store_id && availableRoleTemplates.value.length === 0) {
    console.log('💰 支付类型切换到付费，检查角色定价模板:', form.store_id)
    await loadAvailableRolePricingTemplates(form.store_id)
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

// 🆕 计算属性：获取当前选择的密室信息
const selectedEscapeRoom = computed(() => {
  return escapeRoomList.value.find(room => room.id === form.escape_room_id)
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
      
      // 🆕 新增订单时自动选择门店后，立即加载角色定价模板和其他资源
      if (!props.isEdit) {
        console.log('🆕 新增订单自动选择门店，开始加载资源:', form.store_id)
        await loadStoreResources(form.store_id)
        await loadAvailableRolePricingTemplates(form.store_id)
      }
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

// 🆕 计算总金额（考虑角色定价折扣）
const calculateTotalAmount = () => {
  const playerCount = form.player_count || 0
  const unitPrice = form.unit_price || 0
  
  // 🆕 计算角色定价折扣后的总金额
  const priceDetail = calculateDetailedPrice()
  form.total_amount = priceDetail.totalAmount
  
  calculateRemainingAmount()
}

// 🆕 计算详细价格明细（包含角色折扣）
const calculateDetailedPrice = () => {
  const playerCount = form.player_count || 0
  const unitPrice = form.unit_price || 0
  
  if (playerCount === 0 || unitPrice === 0) {
    return {
      roleDiscounts: [],
      noDiscountPlayers: playerCount,
      noDiscountAmount: 0,
      totalAmount: 0,
      totalDiscount: 0
    }
  }
  
  // 计算有折扣的角色
  const roleDiscounts = selectedRoleTemplates.value.map(selected => {
    const template = availableRoleTemplates.value.find(t => t.id === selected.template_id)
    if (!template) return null
    
    const originalAmount = selected.player_count * unitPrice
    let discountAmount = 0
    let finalAmount = originalAmount
    
    // 计算折扣金额
    if (template.discount_type === 'percentage') {
      discountAmount = originalAmount * (template.discount_value / 100)
      finalAmount = originalAmount - discountAmount
    } else if (template.discount_type === 'fixed') {
      discountAmount = Math.min(template.discount_value * selected.player_count, originalAmount)
      finalAmount = originalAmount - discountAmount
    }
    
    return {
      role_name: template.role_name,
      player_count: selected.player_count,
      unit_price: unitPrice,
      original_amount: originalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      discount_info: formatDiscount(template.discount_type, template.discount_value, template.discount_display)
    }
  }).filter(Boolean)
  
  // 计算已使用的人数
  const usedPlayers = roleDiscounts.reduce((sum, role) => sum + role.player_count, 0)
  
  // 计算无折扣人数
  const noDiscountPlayers = Math.max(0, playerCount - usedPlayers)
  const noDiscountAmount = noDiscountPlayers * unitPrice
  
  // 计算总金额
  const discountedAmount = roleDiscounts.reduce((sum, role) => sum + role.final_amount, 0)
  const totalAmount = discountedAmount + noDiscountAmount
  const totalDiscount = roleDiscounts.reduce((sum, role) => sum + role.discount_amount, 0)
  
  return {
    roleDiscounts,
    noDiscountPlayers,
    noDiscountAmount,
    totalAmount,
    totalDiscount
  }
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

// 🆕 加载当前门店可用的角色定价模板
const loadAvailableRolePricingTemplates = async (storeId) => {
  if (!storeId) {
    console.log('❌ 加载角色定价模板失败：门店ID为空')
    return
  }
  
  try {
    console.log('🔄 开始加载角色定价模板，门店ID:', storeId)
    loadingRolePricing.value = true
    
    const response = await rolePricingTemplateAPI.getTemplatesForOrder(storeId)
    
    if (response && response.data) {
      availableRoleTemplates.value = response.data
      console.log(`✅ 加载角色定价模板成功: ${response.data.length} 个可用模板`, {
        isEdit: props.isEdit,
        storeId,
        templates: response.data.map(t => ({ id: t.id, role_name: t.role_name }))
      })
      
      if (response.meta) {
        console.log('📊 角色定价模板元信息:', response.meta)
      }
      
      // 如果有角色定价历史数据，在模板加载后重新验证选择
      if (selectedRoleTemplates.value.length > 0) {
        console.log('🔍 验证历史角色定价选择:', selectedRoleTemplates.value)
        validateSelectedRoleTemplates()
      }
    } else {
      availableRoleTemplates.value = []
      console.log('⚠️ 角色定价模板响应为空')
    }
  } catch (error) {
    console.error('❌ 加载角色定价模板失败:', {
      storeId,
      isEdit: props.isEdit,
      error: error.message,
      response: error.response?.data
    })
    availableRoleTemplates.value = []
    
    // 显示用户友好的错误信息
    if (error.response?.status === 403) {
      console.warn('权限不足，无法加载角色定价模板')
    } else if (error.response?.status === 404) {
      console.warn('门店不存在或无角色定价模板')
    } else {
      console.error('网络错误或服务器错误:', error.message)
    }
  } finally {
    loadingRolePricing.value = false
    console.log('🏁 角色定价模板加载完成')
  }
}

// 🆕 验证已选择的角色定价模板是否仍然可用
const validateSelectedRoleTemplates = () => {
  const originalCount = selectedRoleTemplates.value.length
  
  const validSelections = selectedRoleTemplates.value.filter(selected => {
    const isValid = availableRoleTemplates.value.some(template => template.id === selected.template_id)
    if (!isValid) {
      console.log('❌ 发现无效的角色定价选择:', selected)
    }
    return isValid
  })
  
  if (validSelections.length !== originalCount) {
    const removedCount = originalCount - validSelections.length
    console.log(`🧹 清理了 ${removedCount} 个无效的角色定价选择`, {
      原始数量: originalCount,
      有效数量: validSelections.length,
      有效选择: validSelections
    })
    selectedRoleTemplates.value = validSelections
  } else {
    console.log('✅ 所有历史角色定价选择都有效')
  }
}

// 🆕 格式化折扣显示
const formatDiscount = (type, value, displayText = null) => {
  if (displayText) {
    return displayText
  }
  
  if (type === 'percentage') {
    return `-${value}%`
  } else if (type === 'fixed') {
    return `-Rp ${formatPrice(value)}`
  }
  return '无折扣'
}

// 🆕 判断角色定价模板是否被选中
const isRoleTemplateSelected = (templateId) => {
  return selectedRoleTemplates.value.some(s => s.template_id === templateId)
}

// 🆕 获取选中的角色模板人数
const getSelectedRolePlayerCount = (templateId) => {
  const selected = selectedRoleTemplates.value.find(s => s.template_id === templateId)
  return selected ? selected.player_count : 1
}

// 🆕 更新选中的角色模板人数
const updateRolePlayerCount = (templateId, value) => {
  if (!value || value < 1) value = 1
  
  const selectedIndex = selectedRoleTemplates.value.findIndex(s => s.template_id === templateId)
  if (selectedIndex !== -1) {
    // 计算其他角色的总人数
    const otherRolesTotal = selectedRoleTemplates.value
      .filter(s => s.template_id !== templateId)
      .reduce((sum, s) => sum + s.player_count, 0)
    
    // 验证总人数不超过游戏人数
    if (otherRolesTotal + value > (form.player_count || 0)) {
      message.error(`角色定价总人数不能超过游戏总人数 ${form.player_count}`)
      return
    }
    
    selectedRoleTemplates.value[selectedIndex].player_count = value
  }
}

// 🆕 切换角色定价模板选择
const toggleRoleTemplate = (template) => {
  const selectedIndex = selectedRoleTemplates.value.findIndex(s => s.template_id === template.id)
  if (selectedIndex !== -1) {
    // 取消选择
    selectedRoleTemplates.value.splice(selectedIndex, 1)
  } else {
    // 添加选择前，检查人数限制
    const currentTotal = selectedRoleTemplates.value.reduce((sum, s) => sum + s.player_count, 0)
    if (currentTotal + 1 > (form.player_count || 0)) {
      message.error(`添加角色定价会超出游戏总人数 ${form.player_count}，请先调整现有角色人数`)
      return
    }
    
    // 添加选择，默认人数为1
    selectedRoleTemplates.value.push({
      template_id: template.id,
      player_count: 1
    })
  }
}

// 🆕 获取角色模板名称
const getRoleTemplateName = (templateId) => {
  const template = availableRoleTemplates.value.find(t => t.id === templateId)
  return template ? template.role_name : '未知角色'
}

// 🆕 获取角色模板折扣显示
const getRoleTemplateDiscount = (templateId) => {
  const template = availableRoleTemplates.value.find(t => t.id === templateId)
  if (!template) return ''
  return formatDiscount(template.discount_type, template.discount_value, template.discount_display)
}

// 🆕 获取总选中的角色人数
const getTotalRolePlayers = () => {
  return selectedRoleTemplates.value.reduce((sum, selected) => sum + selected.player_count, 0)
}

// 🆕 获取详细价格信息（计算属性）
const priceDetail = computed(() => {
  return calculateDetailedPrice()
})

// 🆕 处理剧本选择变化，自动更新单价
const handleScriptChange = (scriptId) => {
  if (!scriptId) return
  
  const script = scriptList.value.find(s => s.id === scriptId)
  if (script && script.store_price !== undefined) {
    // 新增订单或者单价为空时自动更新单价
    if (!props.isEdit || !form.unit_price) {
      form.unit_price = script.store_price || script.price || 0
      calculateTotalAmount()
    }
  }
}

// 🆕 处理密室选择变化，自动更新单价
const handleEscapeRoomChange = (escapeRoomId) => {
  if (!escapeRoomId) return
  
  const escapeRoom = escapeRoomList.value.find(r => r.id === escapeRoomId)
  if (escapeRoom && escapeRoom.store_price !== undefined) {
    // 新增订单或者单价为空时自动更新单价
    if (!props.isEdit || !form.unit_price) {
      form.unit_price = escapeRoom.store_price || escapeRoom.price || 0
      calculateTotalAmount()
    }
  }
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
    
    // 🆕 额外验证：角色定价总人数不能超过游戏人数
    if (selectedRoleTemplates.value.length > 0) {
      const totalRolePlayers = selectedRoleTemplates.value.reduce((sum, s) => sum + s.player_count, 0)
      if (totalRolePlayers > (form.player_count || 0)) {
        message.error(`角色定价总人数(${totalRolePlayers})不能超过游戏总人数(${form.player_count})，请调整角色人数`)
        return
      }
    }
    
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
    // submitData.is_free = submitData.free_pay === 'Free'  // 注释掉，保留free_pay字段给后端
    
    // 🆕 添加默认语言
    submitData.language = 'IND'

    // 🆕 处理NPC角色数据
    if (submitData.order_type === '密室' && submitData.selected_npc_roles) {
      submitData.escape_room_npc_roles = submitData.selected_npc_roles
    }

    // 🆕 处理角色定价数据
    if (selectedRoleTemplates.value.length > 0) {
      submitData.selected_role_templates = selectedRoleTemplates.value.map(selected => ({
        template_id: selected.template_id,
        player_count: selected.player_count,
        role_name: getRoleTemplateName(selected.template_id),
        discount_info: getRoleTemplateDiscount(selected.template_id)
      }))
    } else {
      submitData.selected_role_templates = []
    }

    // 清理不需要的字段
    if (submitData.order_type === '剧本杀') {
      delete submitData.escape_room_id
      delete submitData.is_group_booking
      delete submitData.include_photos
      delete submitData.include_cctv
      delete submitData.selected_npc_roles
    } else if (submitData.order_type === '密室') {
      delete submitData.script_id
    }
    
    // 清理临时字段
    // delete submitData.free_pay  // 注释掉，后端需要这个字段
    delete submitData.selected_npc_roles

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
  selectedRoleTemplates.value = []
  availableRoleTemplates.value = []
  previewVisible.value = false
  previewImage.value = ''
  emit('update:visible', false)
}
</script>

<style scoped>
/* 🆕 现代化布局样式 */
.ant-form {
  max-height: 80vh;
  overflow-y: auto;
  padding-right: 8px;
}

.ant-form-item {
  margin-bottom: 20px;
}

.ant-divider {
  margin: 24px 0 20px 0;
  border-color: #e8f4f8;
}

.section-title {
  color: #1890ff;
  font-weight: 600;
  font-size: 16px;
}

/* 🆕 项目选择区域样式 */
.project-section {
  background: #fafbfc;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e8f0fe;
  margin-bottom: 16px;
}

.help-text {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
  line-height: 1.4;
}

.help-text.error {
  color: #ff4d4f;
}

/* 🆕 角色定价包装器样式 */
.role-pricing-wrapper {
  background: #f8fffe;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #d6f7ff;
  margin-bottom: 20px;
}

/* 🆕 支付配置样式优化 */
.price-input :deep(.ant-input-number) {
  border: 2px solid #e8f4f8;
  border-radius: 6px;
}

.price-input :deep(.ant-input-number:focus) {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.readonly-field :deep(.ant-input-number) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid #d6d9dc;
  color: #495057;
}

.readonly-field :deep(.ant-input-number-input) {
  background: transparent;
  cursor: not-allowed;
  color: #495057;
  font-weight: 500;
}

.calculation-note {
  color: #666;
  font-size: 12px;
  margin-top: 6px;
  font-style: italic;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 3px solid #1890ff;
}

/* 🆕 角色定价选择区域样式 */
.role-pricing-section {
  padding: 0;
  background: transparent;
  border: none;
}

.loading-container {
  text-align: center;
  padding: 40px 20px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e6f7ff;
}

.role-cards-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.role-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.role-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  border: 2px solid #e6f7ff;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.08);
}

.role-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(24, 144, 255, 0.15);
  border-color: #40a9ff;
}

.role-card.selected {
  border-color: #1890ff;
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  box-shadow: 0 4px 16px rgba(24, 144, 255, 0.2);
  transform: translateY(-1px);
}

.role-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.role-discount {
  background: #ffece6;
  color: #faad14;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.role-description {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  line-height: 1.4;
}

.player-count-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.player-count-input label {
  font-size: 12px;
  color: #333;
  font-weight: 500;
}

.player-count-input .ant-input-number {
  width: 80px;
}

.role-validity {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.selected-roles-summary {
  margin-top: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  border-radius: 12px;
  border: 2px solid #91d5ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #91d5ff;
}

.summary-header h5 {
  margin: 0;
  font-size: 16px;
  color: #1890ff;
  font-weight: 600;
}

.summary-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.summary-item {
  background: #ffffff;
  border: 1px solid #40a9ff;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #1890ff;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 4px rgba(24, 144, 255, 0.1);
  font-weight: 500;
}

.total-players {
  font-size: 14px;
  color: #1890ff;
  text-align: right;
  font-weight: 600;
  background: #ffffff;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #91d5ff;
}

.no-role-templates {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  background: #fff;
  border-radius: 12px;
  border: 1px dashed #d9d9d9;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.4;
  color: #1890ff;
}

.empty-hint {
  font-size: 12px;
  color: #bbb;
  margin-top: 8px;
}

/* 🆕 折扣明细样式（在单价下面） */
.discount-detail-container {
  margin-top: 12px;
  padding: 16px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
}

/* 🆕 总计汇总样式（在总金额下面） */
.total-summary-container {
  margin-top: 12px;
  padding: 16px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
}

.price-section {
  margin-bottom: 16px;
}

.price-section:last-of-type {
  margin-bottom: 12px;
}

.price-section-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 4px;
}

.price-item {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
}

.price-item:last-child {
  margin-bottom: 0;
}

.price-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.role-name {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.role-discount {
  background: #fff2e8;
  color: #fa8c16;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.price-item-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  color: #666;
}

.price-item-result {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.player-info {
  color: #666;
}

.original-amount {
  color: #666;
}

.discount-amount {
  color: #f50;
  font-weight: 500;
}

.final-amount {
  color: #52c41a;
  font-weight: 600;
}

.price-summary {
  border-top: 2px solid #dee2e6;
  padding-top: 12px;
  margin-top: 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 14px;
}

.summary-row:last-child {
  margin-bottom: 0;
}

.summary-row.discount {
  color: #f50;
  font-weight: 500;
}

.summary-row.total {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  border-top: 1px solid #dee2e6;
  padding-top: 8px;
  margin-top: 8px;
}

.summary-row.total span:last-child {
  color: #52c41a;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .discount-detail-container,
  .total-summary-container {
    padding: 12px;
  }
  
  .price-item-header,
  .price-item-detail,
  .price-item-result {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .summary-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}
</style> 