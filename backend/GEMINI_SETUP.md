# Gemini AI 图片理解服务配置指南

## 概述

本系统集成了Google Gemini AI的图片理解功能，专门用于识别印尼各大银行的付款凭证信息。

## 功能特性

- 🏦 **印尼银行支持**: 支持BCA、Mandiri、BNI、BRI等25+银行
- 📱 **电子钱包**: 支持GoPay、OVO、DANA、ShopeePay等
- 🎯 **高精度识别**: 使用Gemini 2.5 Pro模型，识别准确率高
- 📊 **结构化输出**: 返回JSON格式的结构化数据
- 🔒 **安全保障**: 包含完整的安全设置和验证机制

## 环境变量配置

在您的 `.env` 文件中添加以下配置：

```bash
# 🤖 Gemini AI 配置
# Google Gemini API密钥 - 从 https://aistudio.google.com/app/apikey 获取
GEMINI_API_KEY=your_gemini_api_key_here

# Gemini模型版本 - 推荐使用2.5-pro进行图片理解
GEMINI_MODEL=gemini-2.5-pro
```

## 获取API密钥

1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 登录您的Google账户
3. 点击"Create API Key"创建新的API密钥
4. 将生成的API密钥添加到环境变量中

## API端点

### 健康检查
```
GET /api/gemini/health
```

### 获取支持的银行列表
```
GET /api/gemini/supported-banks
```

### 分析单张付款凭证
```
POST /api/gemini/analyze-payment
Content-Type: multipart/form-data

参数:
- image: 图片文件 (最大20MB)
```

### 批量分析付款凭证
```
POST /api/gemini/analyze-payment-batch
Content-Type: multipart/form-data

参数:
- images: 图片文件数组 (最多10张)
```

### 获取服务统计信息
```
GET /api/gemini/service-stats
```

## 响应格式

### 成功响应示例
```json
{
  "success": true,
  "message": "银行付款凭证分析完成",
  "data": {
    "analysis": {
      "success": true,
      "bank_name": "Bank Central Asia (BCA)",
      "transaction_type": "转账",
      "amount": "1500000",
      "currency": "IDR",
      "transaction_id": "TRX123456789",
      "transaction_date": "2025-01-27",
      "transaction_time": "14:30:25",
      "sender_account": "1234567890",
      "receiver_account": "0987654321",
      "receiver_name": "PT XSPACE INDONESIA",
      "status": "成功",
      "reference_number": "REF2025012712345",
      "notes": "Payment for game booking",
      "confidence_score": 95,
      "processed_at": "2025-01-27T07:30:00.000Z",
      "model_used": "gemini-2.5-pro"
    },
    "validation": {
      "isValid": true,
      "missing_fields": [],
      "warnings": []
    }
  },
  "timestamp": "2025-01-27T07:30:00.000Z"
}
```

## 支持的银行列表

### 传统银行
- BCA (Bank Central Asia)
- Bank Mandiri
- BNI (Bank Negara Indonesia)
- BRI (Bank Rakyat Indonesia)
- CIMB Niaga
- Bank Danamon
- Bank Permata
- Bank BTN
- Bank OCBC NISP
- Bank Maybank Indonesia
- 等25+银行...

### 电子钱包
- GoPay
- OVO
- DANA
- ShopeePay
- LinkAja

## 图片要求

- **格式**: PNG, JPEG, WEBP, HEIC, HEIF
- **大小**: 最大20MB
- **质量**: 建议使用清晰、不模糊的图片
- **方向**: 确保图片正确旋转
- **内容**: 完整的付款凭证截图，包含所有必要信息

## 错误处理

### 常见错误码
- `NO_FILE_UPLOADED`: 未上传文件
- `FILE_TOO_LARGE`: 文件过大
- `INVALID_FILE_TYPE`: 无效的文件类型
- `GEMINI_API_ERROR`: Gemini API调用错误

### 错误响应示例
```json
{
  "success": false,
  "message": "文件过大，最大支持20MB",
  "error": "FILE_TOO_LARGE",
  "timestamp": "2025-01-27T07:30:00.000Z"
}
```

## 安全注意事项

1. **API密钥保护**: 请确保GEMINI_API_KEY不泄露到代码仓库中
2. **访问控制**: 所有API端点都需要身份验证
3. **文件验证**: 系统会验证上传文件的类型和大小
4. **数据隐私**: 上传的图片仅用于分析，不会被存储

## 技术限制

- **并发限制**: 建议控制并发请求数量
- **速率限制**: 遵循Google API的速率限制
- **Token消耗**: 图片分析会消耗一定的Token
- **网络要求**: 需要稳定的互联网连接访问Google服务

## 故障排除

### 1. API密钥错误
```bash
Error: GEMINI_API_KEY is required in environment variables
```
解决方案: 检查.env文件中的GEMINI_API_KEY配置

### 2. 网络连接问题
确保服务器可以访问Google AI服务

### 3. 图片识别准确度低
- 使用更清晰的图片
- 确保付款凭证完整
- 检查图片方向和光线

## 开发调试

启用调试日志查看详细信息：
```bash
NODE_ENV=development npm run dev
```

## 成本优化

- 使用适当的图片分辨率
- 批量处理多张图片
- 实施缓存机制避免重复分析

## 技术支持

如有问题，请查看：
1. [Google Gemini API文档](https://ai.google.dev/gemini-api/docs)
2. 系统日志文件
3. API响应中的错误信息

---

**注意**: 此功能为独立模块，不会影响现有的订单和支付系统功能。