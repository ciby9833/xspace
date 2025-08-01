/**
 * Gemini AI 配置验证脚本
 * 用于生产环境验证Gemini服务配置
 */

require('dotenv').config();

async function validateGeminiConfig() {
  console.log('🔍 验证Gemini AI配置...\n');

  const checks = [];

  // 检查API密钥
  const apiKey = process.env.GEMINI_API_KEY;
  checks.push({
    name: 'GEMINI_API_KEY',
    status: apiKey ? 'PASS' : 'FAIL',
    message: apiKey ? '已配置' : '未配置 - 请在.env文件中设置'
  });

  // 检查模型配置
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
  checks.push({
    name: 'GEMINI_MODEL',
    status: 'PASS',
    message: model
  });

  // 检查依赖包
  try {
    require('@google/generative-ai');
    checks.push({
      name: '@google/generative-ai',
      status: 'PASS',
      message: '依赖包已安装'
    });
  } catch (error) {
    checks.push({
      name: '@google/generative-ai',
      status: 'FAIL',
      message: '依赖包未安装 - 运行: npm install @google/generative-ai'
    });
  }

  // 检查配置文件
  try {
    require('../config/gemini');
    checks.push({
      name: '配置文件',
      status: 'PASS',
      message: 'gemini.js 加载成功'
    });
  } catch (error) {
    checks.push({
      name: '配置文件',
      status: 'FAIL',
      message: `配置文件错误: ${error.message}`
    });
  }

  // 输出结果
  console.log('📋 配置检查结果:');
  console.log('─'.repeat(60));
  
  let allPassed = true;
  checks.forEach(check => {
    const status = check.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${check.name.padEnd(20)} ${check.message}`);
    if (check.status === 'FAIL') allPassed = false;
  });

  console.log('─'.repeat(60));
  
  if (allPassed) {
    console.log('🎉 所有检查通过！Gemini服务可以启动。');
  } else {
    console.log('⚠️  有配置项需要修复，请查看上述错误信息。');
    process.exit(1);
  }
}

if (require.main === module) {
  validateGeminiConfig().catch(console.error);
}

module.exports = validateGeminiConfig;