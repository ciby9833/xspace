const fs = require('fs').promises;
const path = require('path');
const geminiConfig = require('../config/gemini');

/**
 * Gemini AI 图片理解服务
 * 专门用于识别印尼银行付款凭证
 */
class GeminiService {
  constructor() {
    this.model = geminiConfig.getModel();
  }

  /**
   * 识别银行付款凭证
   * @param {string|Buffer} imageData - 图片数据（文件路径或Buffer）
   * @param {string} mimeType - 图片MIME类型
   * @returns {Promise<Object>} 识别结果
   */
  async analyzeBankPayment(imageData, mimeType = 'image/jpeg') {
    try {
      // 验证图片格式
      if (!geminiConfig.validateImageFormat(mimeType)) {
        throw new Error(`不支持的图片格式: ${mimeType}`);
      }

      let imageBuffer;
      
      // 处理不同类型的输入数据
      if (typeof imageData === 'string') {
        // 如果是文件路径
        imageBuffer = await fs.readFile(imageData);
      } else if (Buffer.isBuffer(imageData)) {
        // 如果是Buffer
        imageBuffer = imageData;
      } else {
        throw new Error('无效的图片数据格式');
      }

      // 转换为base64
      const base64Image = imageBuffer.toString('base64');

      // 准备请求内容
      const contents = [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        { 
          text: geminiConfig.getBankPaymentPrompt()
        },
      ];

      console.log('🤖 正在调用Gemini API分析银行付款凭证...');
      
      // 调用Gemini API
      const result = await this.model.generateContent(contents);
      const response = await result.response;
      const text = response.text();

      console.log('🤖 Gemini原始响应:', text);

      // 尝试解析JSON响应
      let analysisResult;
      try {
        // 多层清理策略
        let cleanText = text.trim();
        
        // 1. 移除markdown代码块
        cleanText = cleanText.replace(/```json\n?|\n?```/g, '');
        
        // 2. 查找JSON对象（以{开始，以}结束）
        const jsonStart = cleanText.indexOf('{');
        const jsonEnd = cleanText.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
        }
        
        // 3. 移除可能的中文说明文字前缀
        cleanText = cleanText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        
        // 4. 尝试解析
        analysisResult = JSON.parse(cleanText);
        
        console.log('✅ JSON解析成功:', analysisResult);
        
      } catch (parseError) {
        console.error('📋 JSON解析失败，尝试备用解析方法:', parseError.message);
        
        // 备用解析：尝试提取关键信息
        try {
          const backupResult = this.extractPaymentInfoFromText(text);
          analysisResult = backupResult;
          console.log('🔄 备用解析成功:', analysisResult);
        } catch (backupError) {
          console.error('❌ 备用解析也失败:', backupError.message);
          // 如果所有解析都失败，返回结构化的错误响应
          analysisResult = {
            success: false,
            payment_status: 'unknown',
            error: 'JSON解析失败',
            raw_response: text,
            confidence_score: 0
          };
        }
      }

      // 添加元数据
      const finalResult = {
        ...analysisResult,
        processed_at: new Date().toISOString(),
        model_used: geminiConfig.model,
        image_size: imageBuffer.length,
        mime_type: mimeType
      };

      console.log('✅ 银行付款凭证分析完成:', {
        success: finalResult.success,
        bank_name: finalResult.bank_name,
        amount: finalResult.amount,
        confidence_score: finalResult.confidence_score
      });

      return finalResult;

    } catch (error) {
      console.error('❌ Gemini银行付款分析失败:', error);
      
      return {
        success: false,
        error: error.message,
        error_type: error.name,
        processed_at: new Date().toISOString(),
        model_used: geminiConfig.model,
        confidence_score: 0
      };
    }
  }

  /**
   * 批量分析多张银行付款凭证
   * @param {Array} imageList - 图片列表 [{data, mimeType}]
   * @returns {Promise<Array>} 分析结果数组
   */
  async analyzeBankPaymentBatch(imageList) {
    const results = [];
    
    for (let i = 0; i < imageList.length; i++) {
      const { data, mimeType } = imageList[i];
      console.log(`📊 处理第${i + 1}张图片...`);
      
      try {
        const result = await this.analyzeBankPayment(data, mimeType);
        results.push({
          index: i,
          ...result
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message,
          processed_at: new Date().toISOString()
        });
      }
      
      // 添加延迟以避免API限制
      if (i < imageList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * 验证识别结果的完整性
   * @param {Object} result - 识别结果
   * @returns {Object} 验证报告
   */
  validateResult(result) {
    const validation = {
      isValid: true,
      missing_fields: [],
      warnings: []
    };

    const requiredFields = ['bank_name', 'amount', 'transaction_date'];
    const importantFields = ['payee_name', 'payment_status', 'payee_info'];

    // 检查必需字段
    requiredFields.forEach(field => {
      if (!result[field] || result[field] === null) {
        validation.missing_fields.push(field);
        validation.isValid = false;
      }
    });

    // 检查重要字段
    importantFields.forEach(field => {
      if (!result[field] || result[field] === null) {
        validation.warnings.push(`缺少重要字段: ${field}`);
      }
    });

    // 检查支付状态
    if (result.payment_status && !['success', 'failed', 'pending'].includes(result.payment_status)) {
      validation.warnings.push('支付状态值不标准');
    }

    // 检查置信度
    if (result.confidence_score < 70) {
      validation.warnings.push('识别置信度较低');
    }

    // 检查金额格式
    if (result.amount && isNaN(parseFloat(result.amount))) {
      validation.warnings.push('金额格式可能有误');
    }

    // 检查成功状态一致性
    if (result.success === true && result.payment_status !== 'success') {
      validation.warnings.push('成功状态与支付状态不一致');
    }

    return validation;
  }

  /**
   * 获取支持的印尼银行列表
   * @returns {Array} 银行列表
   */
  getSupportedBanks() {
    return [
      'BCA (Bank Central Asia)',
      'Bank Mandiri',
      'BNI (Bank Negara Indonesia)',
      'BRI (Bank Rakyat Indonesia)',
      'CIMB Niaga',
      'Bank Danamon',
      'Bank Permata',
      'Bank BTN',
      'Bank OCBC NISP',
      'Bank Maybank Indonesia',
      'Bank HSBC Indonesia',
      'Bank UOB Indonesia',
      'Bank Commonwealth',
      'Bank Sinarmas',
      'Bank Mega',
      'Bank Bukopin',
      'Bank Panin',
      'Bank BTPN',
      'Bank Victoria Syariah',
      'Bank Syariah Indonesia (BSI)',
      'GoPay',
      'OVO',
      'DANA',
      'ShopeePay',
      'LinkAja'
    ];
  }

  /**
   * 备用文本解析方法
   * 当JSON解析失败时，通过正则表达式提取关键信息
   * @param {string} text - Gemini返回的原始文本
   * @returns {Object} 解析结果
   */
  extractPaymentInfoFromText(text) {
    console.log('🔍 启动备用文本解析...');
    
    const result = {
      success: false,
      payment_status: 'unknown',
      bank_name: null,
      transaction_type: null,
      amount: null,
      currency: 'IDR',
      transaction_date: null,
      transaction_time: null,
      payer_info: null,
      payee_info: null,
      payee_name: null,
      reference_number: null,
      notes: null,
      confidence_score: 30, // 备用解析置信度较低
      extracted_text: text
    };

    // 检查是否包含成功标识
    const successIndicators = [
      /BERHASIL/i,
      /Transfer\s+Berhasil/i,
      /Pembayaran\s+Berhasil/i,
      /m-Transfer:\s*BERHASIL/i,
      /Transfer\s+berhasil!/i,
      /Success/i,
      /Successful/i
    ];
    
    const hasSuccess = successIndicators.some(pattern => pattern.test(text));
    if (hasSuccess) {
      result.success = true;
      result.payment_status = 'success';
      result.confidence_score = 60;
    }

    // 提取银行信息
    const bankPatterns = [
      /BCA/i,
      /Mandiri/i,
      /BNI/i,
      /BRI/i,
      /CIMB/i,
      /Danamon/i,
      /Permata/i,
      /GoPay/i,
      /OVO/i,
      /DANA/i,
      /ShopeePay/i,
      /LinkAja/i
    ];
    
    for (const pattern of bankPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.bank_name = match[0].toUpperCase();
        break;
      }
    }

    // 提取金额 (支持印尼货币格式)
    const amountPatterns = [
      /(?:Rp|IDR)\s*([\d.,]+)/i,
      /(?:Nominal|Amount)\s*:?\s*(?:Rp|IDR)?\s*([\d.,]+)/i
    ];
    
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        let amountStr = match[1];
        
        // 处理印尼数字格式 (例: 1.248.000,00)
        // 移除千位分隔符的点，保留小数点的逗号
        if (amountStr.includes('.') && amountStr.includes(',')) {
          // 格式如 1.248.000,00 - 点是千位分隔符，逗号是小数点
          amountStr = amountStr.replace(/\./g, '').replace(',', '.');
        } else if (amountStr.includes('.') && !amountStr.includes(',')) {
          // 可能是千位分隔符或小数点，根据位置判断
          const dotIndex = amountStr.lastIndexOf('.');
          const afterDot = amountStr.substring(dotIndex + 1);
          if (afterDot.length === 3) {
            // 三位数字，是千位分隔符
            amountStr = amountStr.replace(/\./g, '');
          }
          // 两位数字或其他情况保持不变（作为小数点）
        } else if (amountStr.includes(',')) {
          // 只有逗号，作为小数点处理
          amountStr = amountStr.replace(',', '.');
        }
        
        const numAmount = parseFloat(amountStr);
        if (numAmount > 1000 && numAmount < 1000000000) { // 合理的金额范围 1K-1B
          result.amount = Math.round(numAmount);
          break;
        }
      }
    }

    // 提取日期时间
    const dateTimePatterns = [
      /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})/,
      /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/,
      /(\d{2}\/\d{2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/
    ];
    
    for (const pattern of dateTimePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2]) {
          // 有时间
          result.transaction_time = match[2];
        }
        // 转换日期格式
        let dateStr = match[1];
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            result.transaction_date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        } else {
          result.transaction_date = dateStr;
        }
        break;
      }
    }

    // 提取收款人信息
    const payeePatterns = [
      /(?:Ke|To|Penerima)\s+(\d+)/i,
      /([A-Z\s]+PT)/i,
      /Nama\s+Penerima\s*:?\s*([A-Z\s]+)/i
    ];
    
    for (const pattern of payeePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (/^\d+$/.test(match[1])) {
          result.payee_info = match[1];
        } else {
          result.payee_name = match[1].trim();
        }
      }
    }

    // 如果提取到了关键信息，提高置信度
    const extractedFields = [result.bank_name, result.amount, result.transaction_date].filter(Boolean);
    if (extractedFields.length >= 2) {
      result.confidence_score = Math.min(80, result.confidence_score + extractedFields.length * 10);
    }

    console.log('🔍 备用解析结果:', result);
    return result;
  }

  /**
   * 获取服务统计信息
   * @returns {Object} 统计信息
   */
  getServiceStats() {
    return {
      supported_formats: geminiConfig.getSupportedImageFormats(),
      supported_banks: this.getSupportedBanks().length,
      model_version: geminiConfig.model,
      max_image_size: '20MB',
      api_provider: 'Google Gemini AI'
    };
  }
}

module.exports = new GeminiService();