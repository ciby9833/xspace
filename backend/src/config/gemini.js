const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini AI 配置
 * 用于图片理解和文本生成
 */
class GeminiConfig {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required in environment variables');
    }
    
    // 初始化Google Generative AI客户端
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    
    // 模型配置
    this.generationConfig = {
      temperature: 0.1, // 较低的温度，确保输出更加确定性和准确
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    };
    
    // 安全设置 - 用于处理金融相关内容
    this.safetySettings = [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ];
  }
  
  /**
   * 获取模型实例
   */
  getModel() {
    return this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: this.generationConfig,
      safetySettings: this.safetySettings
    });
  }
  
  /**
   * 获取支持的图片格式
   */
  getSupportedImageFormats() {
    return ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
  }
  
  /**
   * 验证图片MIME类型
   */
  validateImageFormat(mimeType) {
    return this.getSupportedImageFormats().includes(mimeType);
  }
  
  /**
   * 印尼银行识别专用提示词
   */
  getBankPaymentPrompt() {
    return `You are a payment receipt analyzer for Indonesian payment systems. Analyze the uploaded image and determine if a payment has been successfully completed.

This image may contain payment confirmation from:
- Indonesian bank apps: BCA, Mandiri, BNI, BRI, CIMB Niaga, Danamon, Permata, BTN, OCBC NISP, Maybank, etc.
- E-wallets: GoPay, OVO, DANA, ShopeePay, LinkAja
- QRIS payment receipts
- Printed receipts from EDC/handheld terminals

Common Indonesian payment success indicators:
- "BERHASIL" / "Berhasil" (Success)
- "Transfer Berhasil" (Transfer Success)
- "Pembayaran Berhasil" (Payment Success)
- "m-Transfer: BERHASIL"
- "Transfer berhasil!"

Extract the following information and return ONLY a valid JSON object (no additional text):

{
  "success": true/false,
  "payment_status": "success/failed/pending",
  "bank_name": "Bank name (BCA, Mandiri, etc.) or payment method (GoPay, OVO, etc.)",
  "transaction_type": "Transfer/Payment/QRIS/etc.",
  "amount": 123456,
  "currency": "IDR",
  "transaction_id": "Transaction reference ID",
  "transaction_date": "YYYY-MM-DD",
  "transaction_time": "HH:MM:SS",
  "payer_info": "Sender account/name/phone",
  "payee_info": "Receiver account number",
  "payee_name": "Receiver name (like FUNIVERSE E S PT)",
  "reference_number": "Bank reference number",
  "notes": "Additional notes",
  "confidence_score": 95,
  "extracted_text": "All visible text from the image"
}

Rules:
1. Return ONLY the JSON object, no explanatory text
2. Set null for missing information
3. Extract amount as pure number (remove Rp, commas, dots)
4. Convert dates to YYYY-MM-DD format
5. Convert times to HH:MM:SS format
6. Set success=false if not a payment receipt
7. Set payment_status based on success indicators (BERHASIL=success)
8. Confidence score 0-100 based on image quality and completeness`;
  }
}

module.exports = new GeminiConfig();