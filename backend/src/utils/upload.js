const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 确保上传目录存在
const scriptsUploadDir = path.join(__dirname, '../../uploads/scripts');
const escapeRoomsUploadDir = path.join(__dirname, '../../uploads/escape-rooms');
const roomsUploadDir = path.join(__dirname, '../../uploads/rooms');
const ordersUploadDir = path.join(__dirname, '../../uploads/orders');

if (!fs.existsSync(scriptsUploadDir)) {
  fs.mkdirSync(scriptsUploadDir, { recursive: true });
}

if (!fs.existsSync(escapeRoomsUploadDir)) {
  fs.mkdirSync(escapeRoomsUploadDir, { recursive: true });
}

if (!fs.existsSync(roomsUploadDir)) {
  fs.mkdirSync(roomsUploadDir, { recursive: true });
}

if (!fs.existsSync(ordersUploadDir)) {
  fs.mkdirSync(ordersUploadDir, { recursive: true });
}

// 剧本存储配置
const scriptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, scriptsUploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 密室存储配置
const escapeRoomStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, escapeRoomsUploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 房间存储配置
const roomStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, roomsUploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名，包含房间ID前缀便于管理
    const roomId = req.params.roomId || 'room';
    const uniqueName = `${roomId}-${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 订单存储配置
const orderStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ordersUploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名，包含订单前缀便于管理
    const timestamp = Date.now();
    const uuid = uuidv4();
    const uniqueName = `order-${timestamp}-${uuid}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允许上传 JPEG、PNG、GIF、WebP 格式的图片'));
  }
};

// 剧本上传配置
const scriptUpload = multer({
  storage: scriptStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // 最多10个文件
  },
  fileFilter: fileFilter
});

// 密室上传配置
const escapeRoomUpload = multer({
  storage: escapeRoomStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 15 // 最多15个文件
  },
  fileFilter: fileFilter
});

// 房间上传配置
const roomUpload = multer({
  storage: roomStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB，房间图片允许更大
    files: 15 // 最多15个文件
  },
  fileFilter: fileFilter
});

// 订单上传配置
const orderUpload = multer({
  storage: orderStorage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB，支付凭证图片
    files: 10 // 最多10个文件
  },
  fileFilter: fileFilter
});

// 单个文件上传
const uploadSingle = scriptUpload.single('image');

// 多个文件上传
const uploadMultiple = scriptUpload.array('images', 10);

// 密室图片上传
const uploadEscapeRoomImages = escapeRoomUpload.array('images', 15);

// 房间图片上传
const uploadRoomImages = roomUpload.array('images', 15);

// 订单图片上传
const uploadOrderImages = orderUpload.array('images', 10);

// 删除文件工具函数
const deleteFile = (filename, type = 'script') => {
  let uploadDir;
  switch (type) {
    case 'escape-room':
      uploadDir = escapeRoomsUploadDir;
      break;
    case 'room':
      uploadDir = roomsUploadDir;
      break;
    case 'order':
      uploadDir = ordersUploadDir;
      break;
    default:
      uploadDir = scriptsUploadDir;
  }
  
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

// 获取文件URL
const getFileUrl = (filename, type = 'script') => {
  let folder;
  switch (type) {
    case 'escape-room':
      folder = 'escape-rooms';
      break;
    case 'room':
      folder = 'rooms';
      break;
    case 'order':
      folder = 'orders';
      break;
    default:
      folder = 'scripts';
  }
  return `/uploads/${folder}/${filename}`;
};

// 批量删除房间图片
const deleteRoomImages = (filenames) => {
  const results = [];
  for (const filename of filenames) {
    const result = deleteFile(filename, 'room');
    results.push({ filename, deleted: result });
  }
  return results;
};

// 批量删除订单图片
const deleteOrderImages = (filenames) => {
  const results = [];
  for (const filename of filenames) {
    const result = deleteFile(filename, 'order');
    results.push({ filename, deleted: result });
  }
  return results;
};

// 获取房间图片完整路径
const getRoomImagePath = (filename) => {
  return path.join(roomsUploadDir, filename);
};

// 获取订单图片完整路径
const getOrderImagePath = (filename) => {
  return path.join(ordersUploadDir, filename);
};

// 检查房间图片是否存在
const roomImageExists = (filename) => {
  const filePath = path.join(roomsUploadDir, filename);
  return fs.existsSync(filePath);
};

// 检查订单图片是否存在
const orderImageExists = (filename) => {
  const filePath = path.join(ordersUploadDir, filename);
  return fs.existsSync(filePath);
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadEscapeRoomImages,
  uploadRoomImages,
  uploadOrderImages,
  deleteFile,
  getFileUrl,
  deleteRoomImages,
  deleteOrderImages,
  getRoomImagePath,
  getOrderImagePath,
  roomImageExists,
  orderImageExists
}; 