class I18nUtils {
  static messages = {
    'zh-CN': {
      // 认证相关
      'auth.token.missing': '缺少访问令牌',
      'auth.token.expired': '登录已过期，请重新登录',
      'auth.token.invalid': '无效的访问令牌',
      'auth.user.not_found': '用户不存在或已被禁用',
      'auth.password.incorrect': '密码错误',
      'auth.permission.insufficient': '权限不足',
      'auth.login.success': '登录成功',
      'auth.logout.success': '退出登录成功',
      
      // 通用错误
      'error.validation.failed': '参数验证失败',
      'error.server.internal': '服务器内部错误',
      'error.not_found': '请求的资源不存在',
      'error.network': '网络错误'
    },
    
    'en-US': {
      // Authentication related
      'auth.token.missing': 'Access token is missing',
      'auth.token.expired': 'Login session expired, please login again',
      'auth.token.invalid': 'Invalid access token',
      'auth.user.not_found': 'User not found or disabled',
      'auth.password.incorrect': 'Incorrect password',
      'auth.permission.insufficient': 'Insufficient permissions',
      'auth.login.success': 'Login successful',
      'auth.logout.success': 'Logout successful',
      
      // General errors
      'error.validation.failed': 'Validation failed',
      'error.server.internal': 'Internal server error',
      'error.not_found': 'Resource not found',
      'error.network': 'Network error'
    },
    
    'id-ID': {
      // Autentikasi
      'auth.token.missing': 'Token akses tidak ada',
      'auth.token.expired': 'Sesi login telah berakhir, silakan login kembali',
      'auth.token.invalid': 'Token akses tidak valid',
      'auth.user.not_found': 'Pengguna tidak ditemukan atau dinonaktifkan',
      'auth.password.incorrect': 'Kata sandi salah',
      'auth.permission.insufficient': 'Izin tidak mencukupi',
      'auth.login.success': 'Login berhasil',
      'auth.logout.success': 'Logout berhasil',
      
      // Error umum
      'error.validation.failed': 'Validasi gagal',
      'error.server.internal': 'Kesalahan server internal',
      'error.not_found': 'Sumber daya tidak ditemukan',
      'error.network': 'Kesalahan jaringan'
    }
  };

  /**
   * 获取本地化消息
   * @param {string} key - 消息键
   * @param {string} locale - 语言代码
   * @param {object} params - 参数替换
   * @returns {string} 本地化后的消息
   */
  static getMessage(key, locale = 'zh-CN', params = {}) {
    const messages = this.messages[locale] || this.messages['zh-CN'];
    let message = messages[key] || key;
    
    // 替换参数
    Object.keys(params).forEach(param => {
      message = message.replace(`{${param}}`, params[param]);
    });
    
    return message;
  }

  /**
   * 从请求头检测客户端语言
   */
  static detectLocale(req) {
    const acceptLanguage = req.headers['accept-language'] || 'zh-CN';
    const clientLocale = req.headers['x-locale'] || 
                        req.headers['locale'];
    
    if (clientLocale && this.messages[clientLocale]) {
      return clientLocale;
    }
    
    // 解析 Accept-Language 头
    if (acceptLanguage.includes('en')) return 'en-US';
    if (acceptLanguage.includes('id')) return 'id-ID';
    
    return 'zh-CN'; // 默认中文
  }

  /**
   * 获取支持的语言列表
   */
  static getSupportedLocales() {
    return {
      'zh-CN': '简体中文',
      'en-US': 'English',
      'id-ID': 'Bahasa Indonesia'
    };
  }
}

module.exports = I18nUtils; 