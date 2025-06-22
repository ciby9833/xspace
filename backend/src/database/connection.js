const { Pool } = require('pg');

// 读取环境变量
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 未设置 DATABASE_URL，请检查 .env 文件或环境变量');
  process.exit(1);
}

// 创建连接池 - 强制UTC时区
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // 修复：正确设置UTC时区
  connectionTimeoutMillis: 5000,
});

// 连接池初始化日志
console.log('🚀 数据库连接池已创建');

// 测试连接池连接
pool.connect()
  .then(async client => {
    console.log('🗄️  成功连接数据库');
    
    // 强制设置会话时区为UTC
    await client.query("SET timezone = 'UTC'");
    
    // 验证时区设置
    const timezoneResult = await client.query('SHOW TIMEZONE');
    console.log(`🕒 数据库时区: ${timezoneResult.rows[0].TimeZone}`);
    
    // 验证当前UTC时间
    const timeResult = await client.query('SELECT NOW() AT TIME ZONE \'UTC\' as utc_time, NOW() as local_time');
    console.log(`⏰ 数据库UTC时间: ${timeResult.rows[0].utc_time}`);
    console.log(`⏰ 数据库本地时间: ${timeResult.rows[0].local_time}`);

    client.release();
  })
  .catch(err => {
    console.error('❌ 无法连接到数据库:', err);
    process.exit(1);
  });

// 为每个新连接设置UTC时区
pool.on('connect', async (client) => {
  await client.query("SET timezone = 'UTC'");
});

// 监听连接错误
pool.on('error', (err) => {
  console.error('💥 数据库连接池错误:', err);
});

module.exports = pool;