const moment = require('moment-timezone');

class DateTimeUtils {
  /**
   * 转换UTC时间到指定时区
   * @param {Date|string} utcTime - UTC时间
   * @param {string} timezone - 目标时区，默认印尼雅加达时区
   * @returns {string} 格式化的本地时间
   */
  static toLocalTime(utcTime, timezone = 'Asia/Jakarta') {
    if (!utcTime) return null;
    return moment.utc(utcTime).tz(timezone).format('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * 转换本地时间到UTC
   * @param {string} localTime - 本地时间
   * @param {string} timezone - 源时区
   * @returns {Date} UTC时间
   */
  static toUTC(localTime, timezone = 'Asia/Jakarta') {
    if (!localTime) return null;
    return moment.tz(localTime, 'YYYY-MM-DD HH:mm:ss', timezone).utc().format();
  }

  /**
   * 测试时区转换功能
   */
  static testConversion() {
    console.log('\n🧪 Moment.js 时区转换测试:');
    
    // 测试：雅加达 2025-06-09 22:00:01 应该等于 UTC 2025-06-09 15:00:01
    const jakartaLocal = '2025-06-09 22:00:01';
    const expectedUTC = '2025-06-09T15:00:01.000Z';
    
    const convertedUTC = this.toUTC(jakartaLocal, 'Asia/Jakarta');
    const backToJakarta = this.toLocalTime(expectedUTC, 'Asia/Jakarta');
    const toBali = this.toLocalTime(expectedUTC, 'Asia/Makassar');
    const toNewYork = this.toLocalTime(expectedUTC, 'America/New_York');
    
    console.log(`📍 雅加达本地: ${jakartaLocal}`);
    console.log(`🔄 转为UTC: ${convertedUTC}`);
    console.log(`🔄 期望UTC: ${expectedUTC}`);
    console.log(`✅ UTC转换正确: ${convertedUTC === expectedUTC ? '是' : '否'}`);
    
    console.log(`\n🌍 UTC ${expectedUTC} 转换为各时区:`);
    console.log(`🇮🇩 雅加达: ${backToJakarta} (期望: 22:00:01)`);
    console.log(`🇮🇩 巴厘岛: ${toBali} (期望: 23:00:01)`);
    console.log(`🇺🇸 纽约: ${toNewYork} (期望: 11:00:01)`);
    
    return {
      jakarta: backToJakarta,
      bali: toBali,
      newyork: toNewYork
    };
  }

  /**
   * 获取支持的时区列表
   */
  static getSupportedTimezones() {
    return {
      'Asia/Jakarta': '印度尼西亚西部 (WIB, GMT+7)',
      'Asia/Makassar': '印度尼西亚中部 (WITA, GMT+8)', 
      'Asia/Jayapura': '印度尼西亚东部 (WIT, GMT+9)',
      'UTC': '协调世界时 (UTC)',
      'America/New_York': '美国东部 (EST/EDT, GMT-5/-4)'
    };
  }

  /**
   * 根据请求头检测客户端时区
   */
  static detectTimezone(req) {
    if (!req || !req.headers) return 'Asia/Jakarta';
    
    const clientTimezone = req.headers['x-timezone'] || 
                          req.headers['timezone'] ||
                          'Asia/Jakarta';
    return clientTimezone;
  }
}

module.exports = DateTimeUtils; 