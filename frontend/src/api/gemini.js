import request from '@/utils/request'

/**
 * Gemini AI 图片理解 API
 * 专门用于识别印尼银行付款凭证
 */

/**
 * 健康检查
 */
export const healthCheck = () => {
  return request({
    url: '/api/gemini/health',
    method: 'get'
  })
}

/**
 * 获取支持的银行列表
 */
export const getSupportedBanks = () => {
  return request({
    url: '/api/gemini/supported-banks',
    method: 'get'
  })
}

/**
 * 分析单张银行付款凭证
 * @param {File} file - 图片文件
 * @returns {Promise} 识别结果
 */
export const analyzePaymentReceipt = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  
  return request({
    url: '/api/gemini/analyze-payment',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 30000 // 30秒超时，因为AI识别需要时间
  })
}

/**
 * 批量分析银行付款凭证
 * @param {File[]} files - 图片文件数组
 * @returns {Promise} 批量识别结果
 */
export const analyzePaymentReceiptBatch = (files) => {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('images', file)
  })
  
  return request({
    url: '/api/gemini/analyze-payment-batch',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 60000 // 60秒超时，批量处理需要更长时间
  })
}

/**
 * 获取服务统计信息
 */
export const getServiceStats = () => {
  return request({
    url: '/api/gemini/service-stats',
    method: 'get'
  })
}

/**
 * 通过blob或URL分析付款凭证
 * @param {Blob|File} imageBlob - 图片blob对象或文件
 * @param {string} fileName - 文件名
 * @returns {Promise} 识别结果
 */
export const analyzePaymentReceiptFromBlob = (imageBlob, fileName = 'payment_receipt.jpg') => {
  // 如果是blob，转换为File对象
  let file = imageBlob
  if (imageBlob instanceof Blob && !(imageBlob instanceof File)) {
    file = new File([imageBlob], fileName, { type: imageBlob.type || 'image/jpeg' })
  }
  
  return analyzePaymentReceipt(file)
}

/**
 * 格式化识别结果为易读格式
 * @param {Object} analysisResult - Gemini返回的识别结果
 * @returns {Object} 格式化后的结果
 */
export const formatAnalysisResult = (analysisResult) => {
  if (!analysisResult || !analysisResult.success) {
    return {
      success: false,
      displayText: '识别失败或无有效信息',
      details: []
    }
  }

  const details = []
  
  // 银行/支付方式信息
  if (analysisResult.bank_name) {
    details.push({ label: '支付方式', value: analysisResult.bank_name, icon: '🏦' })
  }
  
  // 支付状态
  if (analysisResult.payment_status) {
    const statusMap = {
      'success': '成功',
      'failed': '失败', 
      'pending': '处理中',
      'unknown': '未知'
    }
    const statusText = statusMap[analysisResult.payment_status] || analysisResult.payment_status
    const statusIcon = analysisResult.payment_status === 'success' ? '✅' : 
                      analysisResult.payment_status === 'failed' ? '❌' : '⏳'
    details.push({ 
      label: '支付状态', 
      value: statusText, 
      icon: statusIcon,
      highlight: analysisResult.payment_status === 'success'
    })
  }
  
  // 交易金额
  if (analysisResult.amount) {
    const formattedAmount = new Intl.NumberFormat('id-ID').format(analysisResult.amount)
    details.push({ 
      label: '金额', 
      value: `${analysisResult.currency || 'IDR'} ${formattedAmount}`, 
      icon: '💰',
      highlight: true
    })
  }
  
  // 交易时间
  if (analysisResult.transaction_date) {
    let dateTime = analysisResult.transaction_date
    if (analysisResult.transaction_time) {
      dateTime += ` ${analysisResult.transaction_time}`
    }
    details.push({ label: '交易时间', value: dateTime, icon: '📅' })
  }
  
  // 收款人姓名
  if (analysisResult.payee_name) {
    details.push({ label: '收款人', value: analysisResult.payee_name, icon: '👤' })
  }
  
  // 收款人账户
  if (analysisResult.payee_info) {
    details.push({ label: '收款账户', value: analysisResult.payee_info, icon: '🏧' })
  }
  
  // 付款人信息
  if (analysisResult.payer_info) {
    details.push({ label: '付款人', value: analysisResult.payer_info, icon: '👨‍💼' })
  }
  
  // 交易类型
  if (analysisResult.transaction_type) {
    details.push({ label: '交易类型', value: analysisResult.transaction_type, icon: '📋' })
  }
  
  // 交易ID/参考号
  if (analysisResult.transaction_id || analysisResult.reference_number) {
    const refId = analysisResult.transaction_id || analysisResult.reference_number
    details.push({ label: '参考号', value: refId, icon: '🔢' })
  }
  
  // 备注
  if (analysisResult.notes) {
    details.push({ label: '备注', value: analysisResult.notes, icon: '📝' })
  }

  // 生成简要的显示文本
  let displayText = '识别成功'
  if (analysisResult.bank_name && analysisResult.amount) {
    const formattedAmount = new Intl.NumberFormat('id-ID').format(analysisResult.amount)
    const statusText = analysisResult.payment_status === 'success' ? '支付成功' : '支付记录'
    displayText = `${analysisResult.bank_name} - ${statusText} - ${analysisResult.currency || 'IDR'} ${formattedAmount}`
  } else if (analysisResult.bank_name) {
    const statusText = analysisResult.payment_status === 'success' ? '支付成功' : '支付记录'
    displayText = `${analysisResult.bank_name} - ${statusText}`
  }

  return {
    success: true,
    displayText,
    details,
    confidence: analysisResult.confidence_score || 0,
    rawResult: analysisResult
  }
}