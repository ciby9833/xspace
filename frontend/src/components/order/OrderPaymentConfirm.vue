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

      <!-- 🆕 角色折扣选择卡片 -->
      <div v-if="formData.free_pay === 'Pay'" class="form-card">
        <div class="compact-header">
          <TagOutlined class="header-icon" />
          <span class="header-title">角色折扣选择</span>
          <span class="header-subtitle">选择角色可享受对应折扣优惠</span>
        </div>
        
        <div class="role-discount-section">
          <!-- 加载状态 -->
          <div v-if="loadingRolePricing" class="loading-state">
            <a-spin size="small" />
            <span>加载角色折扣信息...</span>
          </div>
          
          <!-- 无折扣可用 -->
          <div v-else-if="!availableRoleTemplates.length" class="no-discounts">
            <a-alert 
              message="暂无可用角色折扣" 
              description="当前门店暂未设置角色折扣优惠，将按标准价格计费" 
              type="info" 
              show-icon 
            />
          </div>
          
          <!-- 角色折扣选择列表 -->
          <div v-else class="role-discount-list">
            <div class="discount-summary" :class="{ 'exceeded': getTotalSelectedPlayers() > (formData.player_count || 0) }">
              <span class="summary-text">
                可用角色: {{ availableRoleTemplates.length }} 个 | 
                已选人数: {{ getTotalSelectedPlayers() }} / {{ formData.player_count || 0 }} 人
                <span v-if="getTotalSelectedPlayers() > (formData.player_count || 0)" class="exceeded-warning">
                  ⚠️ 超出限制
                </span>
              </span>
            </div>
            
            <div class="role-items">
              <div 
                v-for="template in availableRoleTemplates" 
                :key="template.id"
                class="role-discount-item"
              >
                <div class="role-header">
                  <div class="role-info">
                    <h4 class="role-name">{{ template.role_name }}</h4>
                    <span class="role-type" :class="template.template_type === '公司通用' ? 'company' : 'store'">
                      {{ template.template_type }}
                    </span>
                  </div>
                  <div class="role-selection">
                    <label>选择人数:</label>
                    <a-input-number 
                      v-model:value="selectedRoles[template.id]"
                      :min="0"
                      :max="getMaxSelectableForRole(template.id)"
                      size="small"
                      @change="(value) => handleRoleCountChange(template.id, value)"
                      :placeholder="`最多${getMaxSelectableForRole(template.id)}人`"
                    />
                    <small v-if="getMaxSelectableForRole(template.id) === 0" class="no-slots-hint">
                      暂无可选名额
                    </small>
                  </div>
                </div>
                
                <div class="role-description" v-if="template.role_description">
                  {{ template.role_description }}
                </div>
                
                <div class="price-info">
                  <div class="original-price">
                    原价: Rp {{ formatPrice(formData.unit_price || 0) }}
                  </div>
                  <div class="discounted-price">
                    折后价: Rp {{ formatPrice(calculateDiscountedPrice(template, formData.unit_price || 0)) }}
                    <span class="discount-badge">{{ template.discount_display }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 折扣计算预览 -->
            <div class="discount-preview">
              <div class="preview-header">
                <h4>价格计算预览</h4>
                <div class="preview-actions">
                  <a-button 
                    type="primary" 
                    size="small"
                    @click="generateSplitPayment"
                    :loading="paymentSplitLoading"
                    class="split-payment-btn"
                  >
                    <CreditCardOutlined />
                    按人数拆分付款
                  </a-button>
                  <a-button 
                    v-if="showSplitPayment"
                    size="small"
                    @click="clearSplitPayment"
                    class="clear-split-btn"
                  >
                    清除拆分
                  </a-button>
                </div>
              </div>
              <div class="price-breakdown">
                <div 
                  v-for="item in getPriceBreakdown()" 
                  :key="item.key"
                  class="breakdown-item"
                >
                  <span class="item-description">{{ item.description }}</span>
                  <span class="item-amount">Rp {{ formatPrice(item.amount) }}</span>
                </div>
                <div class="breakdown-total">
                  <span class="total-label">折扣后总计:</span>
                  <span class="total-amount">Rp {{ formatPrice(getDiscountedTotal()) }}</span>
                </div>
              </div>
            </div>

            <!-- 🆕 拆分付款显示区域 -->
            <div v-if="showSplitPayment" class="split-payment-display">
              <!-- 统计摘要 -->
              <div v-if="splitSummary" class="split-summary-compact">
                <div class="summary-title">
                  <h4>拆分付款摘要</h4>
                  <span class="summary-count">{{ splitSummary.total_items }}笔</span>
                </div>
                <div class="summary-stats-compact">
                  <div class="stat-compact">
                    <span class="stat-label">享受折扣</span>
                    <span class="stat-value">{{ splitSummary.players_with_discount }}人</span>
                  </div>
                  <div class="stat-compact">
                    <span class="stat-label">标准价格</span>
                    <span class="stat-value">{{ splitSummary.players_without_discount }}人</span>
                  </div>
                  <div class="stat-compact">
                    <span class="stat-label">节省金额</span>
                    <span class="stat-value discount">Rp {{ formatPrice(splitSummary.total_discount_amount) }}</span>
                  </div>
                  <div class="stat-compact total">
                    <span class="stat-label">实付总额</span>
                    <span class="stat-value">Rp {{ formatPrice(splitSummary.total_amount) }}</span>
                  </div>
                </div>
              </div>

              <!-- 付款项列表 -->
              <div class="split-items-compact">
                <div class="items-grid">
                  <div 
                    v-for="item in splitPaymentItems" 
                    :key="item.id"
                    class="split-item-compact"
                    :class="{ 'has-discount': item.discount_amount > 0 }"
                  >
                    <div class="item-header-compact">
                      <div class="item-player-badge">{{ item.player_index }}</div>
                      <div class="item-name-compact">{{ item.name }}</div>
                      <div class="item-type-compact" :class="item.type">
                        {{ item.type === 'role_discount' ? '折扣' : '标准' }}
                      </div>
                    </div>
                    
                    <div class="item-pricing-compact">
                      <div class="price-line">
                        <span class="original-price-compact">Rp {{ formatPrice(item.original_amount) }}</span>
                        <span v-if="item.discount_amount > 0" class="discount-compact">
                          -{{ item.discount_percentage }}%
                        </span>
                      </div>
                      <div class="final-price-compact">
                        Rp {{ formatPrice(item.amount) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
import { orderAPI, generatePaymentItemsSuggestion } from '@/api/order'
import { getUsersByStore } from '@/api/user'
import { rolePricingTemplateAPI } from '@/api/multiPayment'

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

// 🆕 角色定价相关数据
const availableRoleTemplates = ref([])
const loadingRolePricing = ref(false)
const selectedRoles = ref({})

// 🆕 拆分付款相关数据
const paymentSplitLoading = ref(false)
const splitPaymentItems = ref([])
const splitSummary = ref(null)
const showSplitPayment = ref(false)

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
  loadRolePricingTemplates()
})

// 🆕 监听人数变化，自动重新计算总金额并验证角色选择
watch(() => formData.player_count, (newPlayerCount, oldPlayerCount) => {
  if (formData.free_pay === 'Pay') {
    // 如果游戏人数减少，需要检查并调整角色选择
    if (newPlayerCount < oldPlayerCount) {
      const totalSelected = getTotalSelectedPlayers();
      if (totalSelected > newPlayerCount) {
        // 按比例减少各角色人数
        const ratio = newPlayerCount / totalSelected;
        let adjustedTotal = 0;
        
        // 先按比例计算，然后向下取整
        for (const templateId in selectedRoles.value) {
          if (selectedRoles.value[templateId] > 0) {
            const newCount = Math.floor(selectedRoles.value[templateId] * ratio);
            selectedRoles.value[templateId] = newCount;
            adjustedTotal += newCount;
          }
        }
        
        // 如果调整后的总数还是超过限制，继续减少
        if (adjustedTotal > newPlayerCount) {
          const overCount = adjustedTotal - newPlayerCount;
          const roleIds = Object.keys(selectedRoles.value).filter(id => selectedRoles.value[id] > 0);
          
          for (let i = 0; i < overCount && i < roleIds.length; i++) {
            const roleId = roleIds[i];
            if (selectedRoles.value[roleId] > 0) {
              selectedRoles.value[roleId]--;
            }
          }
        }
        
        message.info(`游戏人数减少，已自动调整角色选择人数`);
      }
    }
    
    calculateTotalAmount();
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
  if (formData.free_pay === 'Pay') {
    // 如果有角色选择，使用折扣后价格
    if (getTotalSelectedPlayers() > 0) {
      formData.total_amount = getDiscountedTotal()
    } else {
      // 否则使用标准价格
      const playerCount = formData.player_count || 0
      const unitPrice = formData.unit_price || 0
      formData.total_amount = playerCount * unitPrice
    }
  } else {
    formData.total_amount = 0
  }
  
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

// 🆕 计算折扣后价格
const calculateDiscountedPrice = (template, originalPrice) => {
  if (!template || !originalPrice) return originalPrice;
  
  let discountAmount = 0;
  if (template.discount_type === 'percentage') {
    discountAmount = originalPrice * (template.discount_value / 100);
  } else if (template.discount_type === 'fixed') {
    discountAmount = Math.min(template.discount_value, originalPrice);
  }
  
  return originalPrice - discountAmount;
};

// 🆕 获取总已选择人数
const getTotalSelectedPlayers = () => {
  return Object.values(selectedRoles.value).reduce((sum, count) => sum + (count || 0), 0);
};

// 🆕 获取折扣后总金额
const getDiscountedTotal = () => {
  const unitPrice = formData.unit_price || 0;
  const playerCount = formData.player_count || 0;
  let total = 0;
  
  // 计算有折扣的金额
  for (const templateId in selectedRoles.value) {
    const count = selectedRoles.value[templateId] || 0;
    if (count > 0) {
      const template = availableRoleTemplates.value.find(r => r.id == templateId);
      if (template) {
        const discountedPrice = calculateDiscountedPrice(template, unitPrice);
        total += discountedPrice * count;
      }
    }
  }
  
  // 计算没有折扣的人数金额
  const totalSelectedPlayers = getTotalSelectedPlayers();
  const remainingPlayers = Math.max(0, playerCount - totalSelectedPlayers);
  total += remainingPlayers * unitPrice;
  
  return total;
};

// 🆕 获取价格明细
const getPriceBreakdown = () => {
  const breakdown = [];
  const unitPrice = formData.unit_price || 0;
  const playerCount = formData.player_count || 0;
  
  // 添加折扣项目
  for (const templateId in selectedRoles.value) {
    const count = selectedRoles.value[templateId] || 0;
    if (count > 0) {
      const template = availableRoleTemplates.value.find(r => r.id == templateId);
      if (template) {
        const discountedPrice = calculateDiscountedPrice(template, unitPrice);
        breakdown.push({
          key: `role_${templateId}`,
          description: `${template.role_name} (${count}人)`,
          amount: discountedPrice * count
        });
      }
    }
  }
  
  // 添加标准价格项目
  const totalSelectedPlayers = getTotalSelectedPlayers();
  const remainingPlayers = Math.max(0, playerCount - totalSelectedPlayers);
  if (remainingPlayers > 0) {
    breakdown.push({
      key: 'standard',
      description: `标准价格 (${remainingPlayers}人)`,
      amount: unitPrice * remainingPlayers
    });
  }
  
  return breakdown;
};

// 🆕 计算每个角色的最大可选人数
const getMaxSelectableForRole = (templateId) => {
  const maxPlayers = formData.player_count || 0;
  const currentRoleCount = selectedRoles.value[templateId] || 0;
  
  // 计算其他角色已选择的总人数
  const otherRolesCount = Object.keys(selectedRoles.value)
    .filter(id => id !== templateId.toString())
    .reduce((sum, id) => sum + (selectedRoles.value[id] || 0), 0);
  
  // 最大可选人数 = 游戏总人数 - 其他角色已选人数
  const maxSelectable = Math.max(0, maxPlayers - otherRolesCount);
  
  return maxSelectable;
};

// 🆕 处理角色人数输入变化
const handleRoleCountChange = (templateId, newValue) => {
  const maxAllowed = getMaxSelectableForRole(templateId);
  
  // 如果输入值超过允许的最大值，自动调整到最大值
  if (newValue > maxAllowed) {
    selectedRoles.value[templateId] = maxAllowed;
    message.warning(`该角色最多只能选择 ${maxAllowed} 人`);
  } else if (newValue < 0) {
    selectedRoles.value[templateId] = 0;
  } else {
    selectedRoles.value[templateId] = newValue;
  }
  
  handleRoleSelectionChange();
};

// 🆕 处理角色选择变化
const handleRoleSelectionChange = () => {
  // 验证总人数不超过游戏人数
  const totalSelected = getTotalSelectedPlayers();
  const maxPlayers = formData.player_count || 0;
  
  if (totalSelected > maxPlayers) {
    message.warning(`选择的角色人数 (${totalSelected}) 超过了游戏总人数 (${maxPlayers})，请调整选择`);
  }
  
  // 重新计算总金额
  formData.total_amount = getDiscountedTotal();
  calculateRemainingAmount();
};

// 🆕 加载角色定价模板
const loadRolePricingTemplates = async () => {
  if (!props.bookingData.store_id) {
    console.warn('⚠️ 门店ID为空，无法加载角色定价模板');
    return;
  }
  
  loadingRolePricing.value = true;
  try {
    console.log('🔄 开始加载角色定价模板，门店ID:', props.bookingData.store_id);
    console.log('📋 预订数据:', props.bookingData);
    
    const response = await rolePricingTemplateAPI.getTemplatesForOrder(props.bookingData.store_id);
    console.log('📡 API响应:', response);
    
    if (response && response.data && response.data.length > 0) {
      availableRoleTemplates.value = response.data;
      console.log(`✅ 加载角色定价模板成功: ${response.data.length} 个可用模板`);
      console.table(response.data.map(t => ({
        id: t.id,
        role_name: t.role_name,
        discount_type: t.discount_type,
        discount_value: t.discount_value,
        discount_display: t.discount_display,
        template_type: t.template_type
      })));
      
      // 初始化已选择人数为0
      selectedRoles.value = {};
      for (const template of response.data) {
        selectedRoles.value[template.id] = 0;
      }
      
      if (response.meta) {
        console.log('📊 模板统计信息:', {
          total: response.meta.total,
          company_wide_count: response.meta.company_wide_count,
          store_specific_count: response.meta.store_specific_count
        });
      }
    } else {
      availableRoleTemplates.value = [];
      selectedRoles.value = {};
      console.log('ℹ️ 当前门店暂无可用的角色定价模板');
    }
  } catch (error) {
    console.error('❌ 加载角色定价模板失败:', error);
    console.error('错误详情:', error.response?.data || error.message);
    
    // 更具体的错误提示
    if (error.response?.status === 403) {
      message.error('没有权限访问该门店的角色定价模板');
    } else if (error.response?.status === 404) {
      message.error('角色定价模板服务不可用');
    } else {
      message.error(`加载角色定价模板失败: ${error.response?.data?.error || error.message}`);
    }
    
    availableRoleTemplates.value = [];
    selectedRoles.value = {};
  } finally {
    loadingRolePricing.value = false;
  }
};

// 🆕 生成拆分付款建议
const generateSplitPayment = async () => {
  if (!formData.player_count || formData.player_count <= 0) {
    message.warning('请先填写游戏人数');
    return;
  }

  if (!formData.unit_price || formData.unit_price <= 0) {
    message.warning('请先确认单价');
    return;
  }

  paymentSplitLoading.value = true;
  
  try {
    console.log('🚀 开始生成拆分付款建议...');
    
    // 构建请求数据，包含所有必要字段
    const requestData = {
      // 基础订单信息
      unit_price: formData.unit_price,
      player_count: formData.player_count,
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      
      // 项目信息
      item_type: props.bookingData.item_type,
      item_id: props.bookingData.item_id,
      item_name: props.bookingData.item_name,
      store_id: props.bookingData.store_id,
      room_id: props.bookingData.room_id,
      
      // 时间信息
      order_date: props.bookingData.date,
      start_time: props.bookingData.start_time,
      end_time: props.bookingData.end_time,
      
      // 游戏信息
      game_host_id: formData.game_host_id,
      pic_id: formData.pic_id,
      booking_type: formData.booking_type,
      language: 'IND', // 默认语言
      
      // 支付信息
      free_pay: formData.free_pay,
      payment_status: formData.payment_status,
      payment_method: formData.payment_method,
      prepaid_amount: formData.prepaid_amount,
      remaining_amount: formData.remaining_amount,
      
      // 🆕 角色折扣数据
      selected_role_templates: Object.keys(selectedRoles.value)
        .filter(templateId => selectedRoles.value[templateId] > 0)
        .map(templateId => ({
          template_id: templateId,
          player_count: selectedRoles.value[templateId],
          role_name: availableRoleTemplates.value.find(t => t.id == templateId)?.role_name || '未知角色'
        })),
      
      // 其他字段
      is_group_booking: formData.is_group_booking,
      include_cctv: formData.include_cctv,
      include_photos: formData.include_photos,
      escape_room_npc_roles: props.bookingData.item_type === 'escape_room' ? formData.escape_room_npc_roles : null,
      promo_quantity: formData.promo_quantity,
      notes: formData.notes,
      status: formData.status
    };
    
    console.log('📤 拆分付款请求数据:', requestData);
    
    const response = await generatePaymentItemsSuggestion(requestData);
    console.log('📡 拆分付款响应:', response);
    
    if (response && response.data) {
      splitPaymentItems.value = response.data.items || [];
      splitSummary.value = response.data.summary || null;
      showSplitPayment.value = true;
      
      message.success(`成功生成 ${splitPaymentItems.value.length} 个付款项`);
      
      console.log('✅ 拆分付款生成成功:', {
        总付款项: splitPaymentItems.value.length,
        享受折扣人数: splitSummary.value?.players_with_discount || 0,
        标准价格人数: splitSummary.value?.players_without_discount || 0,
        总节省金额: splitSummary.value?.total_savings || 0
      });
    } else {
      message.error('拆分付款数据格式错误');
    }
    
  } catch (error) {
    console.error('❌ 生成拆分付款失败:', error);
    console.error('错误详情:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      message.error('没有权限生成拆分付款');
    } else if (error.response?.status === 400) {
      message.error(`请求参数错误: ${error.response?.data?.message || '请检查订单信息'}`);
    } else {
      message.error(`生成拆分付款失败: ${error.response?.data?.message || error.message}`);
    }
  } finally {
    paymentSplitLoading.value = false;
  }
};

// 🆕 清除拆分付款显示
const clearSplitPayment = () => {
  showSplitPayment.value = false;
  splitPaymentItems.value = [];
  splitSummary.value = null;
};

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
  
  // 🆕 验证角色人数总和不能超过游戏人数
  const totalSelectedRoles = getTotalSelectedPlayers();
  const maxPlayers = formData.player_count || 0;
  if (totalSelectedRoles > maxPlayers) {
    message.error(`所选角色人数总和 (${totalSelectedRoles}) 不能超过游戏人数 (${maxPlayers})，请调整角色选择`);
    return false;
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
      
      // 🆕 角色折扣数据
      selected_role_templates: Object.keys(selectedRoles.value)
        .filter(templateId => selectedRoles.value[templateId] > 0)
        .map(templateId => ({
          template_id: templateId,
          player_count: selectedRoles.value[templateId]
        })),
      
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

/* 🆕 角色折扣选择样式 */
.role-discount-section {
  padding: 16px;
}

.loading-state {
  text-align: center;
  padding: 30px 0;
  color: #999;
}

.no-discounts {
  margin-top: 16px;
}

.role-discount-list {
  margin-top: 16px;
}

.discount-summary {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f0f2f5;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.discount-summary.exceeded {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #a8071a;
}

.exceeded-warning {
  font-weight: 600;
  color: #ff4d4f;
  margin-left: 8px;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.5; }
}

.role-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-discount-item {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: border-color 0.3s ease;
}

.role-discount-item:hover {
  border-color: #1890ff;
}

.role-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.role-info {
  flex: 1;
}

.role-name {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.role-type {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.role-type.company {
  background: #e6f7ff;
  color: #0050b3;
  border: 1px solid #91caff;
}

.role-type.store {
  background: #f6ffed;
  color: #135200;
  border: 1px solid #95de64;
}

.role-selection {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-selection label {
  font-size: 13px;
  color: #666;
  margin: 0;
}

.role-selection :deep(.ant-input-number) {
  width: 80px;
}

.no-slots-hint {
  font-size: 11px;
  color: #ff4d4f;
  font-style: italic;
  margin-left: 8px;
  font-weight: 500;
}

.role-description {
  font-size: 13px;
  color: #8c8c8c;
  line-height: 1.4;
  margin-bottom: 12px;
  font-style: italic;
}

.price-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafa;
  padding: 8px 12px;
  border-radius: 6px;
}

.original-price {
  font-size: 13px;
  color: #999;
  text-decoration: line-through;
}

.discounted-price {
  font-size: 14px;
  font-weight: 600;
  color: #52c41a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.discount-badge {
  background: #52c41a;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 700;
}

.discount-preview {
  margin-top: 20px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.preview-header h4 {
  margin: 0;
  font-size: 15px;
  color: #333;
}

.preview-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.split-payment-btn {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  border: none;
  font-weight: 600;
  font-size: 12px;
  height: 28px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.clear-split-btn {
  background: #ff4d4f;
  color: white;
  border: none;
  font-weight: 600;
  font-size: 12px;
  height: 28px;
}

.price-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #666;
}

.breakdown-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #e8e8e8;
  margin-top: 8px;
  font-weight: 600;
  color: #333;
}

.total-amount {
  font-size: 16px;
  color: #52c41a;
}

/* 🆕 拆分付款紧凑显示样式 */
.split-payment-display {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.split-summary-compact {
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  border: 1px solid #91caff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.summary-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.summary-title h4 {
  margin: 0;
  font-size: 14px;
  color: #0050b3;
  font-weight: 600;
}

.summary-count {
  font-size: 12px;
  background: #1890ff;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.summary-stats-compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
}

.stat-compact {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  text-align: center;
}

.stat-compact.total {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border: 1px solid #b7eb8f;
}

.stat-compact .stat-label {
  font-size: 10px;
  color: #666;
  font-weight: 500;
}

.stat-compact .stat-value {
  font-size: 12px;
  font-weight: 700;
  color: #333;
}

.stat-compact .stat-value.discount {
  color: #f5222d;
}

.stat-compact.total .stat-value {
  color: #52c41a;
  font-size: 13px;
}

.split-items-compact {
  margin-top: 12px;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.split-item-compact {
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 8px;
  transition: all 0.2s ease;
}

.split-item-compact:hover {
  border-color: #40a9ff;
  box-shadow: 0 2px 6px rgba(64, 169, 255, 0.1);
}

.split-item-compact.has-discount {
  border-left: 3px solid #52c41a;
}

.item-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.item-player-badge {
  width: 20px;
  height: 20px;
  background: #1890ff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.item-name-compact {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: #333;
  margin: 0 6px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-type-compact {
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 8px;
  font-weight: 600;
}

.item-type-compact.role_discount {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.item-type-compact.standard {
  background: #f5f5f5;
  color: #8c8c8c;
  border: 1px solid #d9d9d9;
}

.item-pricing-compact {
  text-align: center;
}

.price-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.original-price-compact {
  font-size: 10px;
  color: #999;
  text-decoration: line-through;
}

.discount-compact {
  font-size: 9px;
  background: #ff4d4f;
  color: white;
  padding: 1px 4px;
  border-radius: 6px;
  font-weight: 600;
}

.final-price-compact {
  font-size: 12px;
  font-weight: 700;
  color: #52c41a;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .summary-stats-compact {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .items-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .items-grid {
    grid-template-columns: 1fr;
  }
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