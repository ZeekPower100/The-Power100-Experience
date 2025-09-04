const multer = require('multer');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { AppError } = require('../middleware/errorHandler');

// Check if AWS credentials are configured
const isAWSConfigured = process.env.AWS_ACCESS_KEY_ID && 
                        process.env.AWS_SECRET_ACCESS_KEY && 
                        process.env.AWS_ACCESS_KEY_ID !== 'your-access-key-here';

// Configure AWS S3 (if credentials are available)
const s3 = isAWSConfigured ? new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
}) : null;

// Configure multer for temporary local storage
const storage = multer.memoryStorage();

// File filter for different upload types
const fileFilter = (type) => (req, file, cb) => {
  const allowedTypes = {
    logo: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
    video: [
      'video/mp4', 
      'video/mpeg', 
      'video/quicktime', 
      'video/webm',
      'video/x-msvideo',     // AVI
      'video/x-ms-wmv',      // WMV
      'video/x-flv',         // FLV
      'video/3gpp',          // 3GP
      'video/ogg',           // OGG
      'video/x-matroska',    // MKV
      'application/octet-stream' // Generic binary (for unrecognized video types)
    ],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  const maxSizes = {
    logo: 5 * 1024 * 1024, // 5MB
    video: 500 * 1024 * 1024, // 500MB
    document: 10 * 1024 * 1024 // 10MB
  };

  // Check if file type is allowed
  if (allowedTypes[type] && allowedTypes[type].includes(file.mimetype)) {
    cb(null, true);
  } else {
    // For videos, also check by extension since MIME types can be inconsistent
    if (type === 'video') {
      const validExtensions = ['.mp4', '.mpeg', '.mpg', '.mov', '.webm', '.avi', '.wmv', '.flv', '.3gp', '.ogg', '.mkv'];
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      if (validExtensions.includes(fileExtension)) {
        console.log(`Video file accepted by extension: ${fileExtension}, MIME: ${file.mimetype}`);
        cb(null, true);
        return;
      }
    }
    
    console.error(`File rejected - Type: ${file.mimetype}, Name: ${file.originalname}, Expected: ${type}`);
    cb(new Error(`Invalid file type (${file.mimetype}). Allowed types for ${type}: MP4, MOV, WebM, AVI, etc.`), false);
  }
};

// Create multer upload instances for different file types
const uploadLogo = multer({
  storage: storage,
  fileFilter: fileFilter('logo'),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}).single('logo');

const uploadVideo = multer({
  storage: storage,
  fileFilter: fileFilter('video'),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
}).single('video');

const uploadDocument = multer({
  storage: storage,
  fileFilter: fileFilter('document'),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
}).single('document');

// Generate unique filename
const generateFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, extension);
  // Sanitize filename
  const safeName = nameWithoutExt.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${safeName}_${timestamp}_${randomString}${extension}`;
};

// Create uploads directory if it doesn't exist
const ensureUploadDir = async (folder) => {
  const uploadDir = path.join(__dirname, '..', '..', 'uploads', folder);
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Upload to local storage (fallback for development)
const uploadToLocal = async (file, folder) => {
  const fileName = generateFileName(file.originalname);
  const uploadDir = await ensureUploadDir(folder);
  const filePath = path.join(uploadDir, fileName);
  
  await fs.writeFile(filePath, file.buffer);
  
  // Return URL that can be served by Express static middleware
  return {
    url: `/uploads/${folder}/${fileName}`,
    key: `${folder}/${fileName}`,
    bucket: 'local',
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    isLocal: true
  };
};

// Upload to S3 or local storage
const uploadFile = async (file, folder) => {
  if (isAWSConfigured) {
    // Upload to S3
    const fileName = generateFileName(file.originalname);
    const key = `${folder}/${fileName}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET || 'tpe-uploads',
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // Make files publicly accessible
      Metadata: {
        originalName: file.originalname
      }
    };

    try {
      const result = await s3.upload(params).promise();
      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new AppError('Failed to upload file to S3', 500);
    }
  } else {
    // Use local storage for development
    console.log('📁 Using local storage (AWS not configured)');
    return await uploadToLocal(file, folder);
  }
};

// Upload logo endpoint
const uploadLogoHandler = async (req, res, next) => {
  uploadLogo(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size too large. Maximum size is 5MB', 400));
      }
      return next(new AppError(`Upload error: ${err.message}`, 400));
    } else if (err) {
      return next(new AppError(err.message, 400));
    }

    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    try {
      const result = await uploadFile(req.file, 'logos');
      
      res.status(200).json({
        success: true,
        message: 'Logo uploaded successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  });
};

// Upload video endpoint
const uploadVideoHandler = async (req, res, next) => {
  uploadVideo(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size too large. Maximum size is 500MB', 400));
      }
      return next(new AppError(`Upload error: ${err.message}`, 400));
    } else if (err) {
      return next(new AppError(err.message, 400));
    }

    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    try {
      const result = await uploadFile(req.file, 'videos');
      
      res.status(200).json({
        success: true,
        message: 'Video uploaded successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  });
};

// Upload document endpoint
const uploadDocumentHandler = async (req, res, next) => {
  uploadDocument(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size too large. Maximum size is 10MB', 400));
      }
      return next(new AppError(`Upload error: ${err.message}`, 400));
    } else if (err) {
      return next(new AppError(err.message, 400));
    }

    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    try {
      const result = await uploadFile(req.file, 'documents');
      
      res.status(200).json({
        success: true,
        message: 'Document uploaded successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  });
};

// Delete file from S3 or local storage
const deleteFileHandler = async (req, res, next) => {
  const { key } = req.body;

  if (!key) {
    return next(new AppError('File key is required', 400));
  }

  try {
    if (isAWSConfigured) {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET || 'tpe-uploads',
        Key: key
      };
      await s3.deleteObject(params).promise();
    } else {
      // Delete from local storage
      const filePath = path.join(__dirname, '..', '..', 'uploads', key);
      await fs.unlink(filePath);
    }
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    next(new AppError('Failed to delete file', 500));
  }
};

// Get signed URL for private file access (if needed in future)
const getSignedUrlHandler = async (req, res, next) => {
  const { key } = req.params;

  if (!key) {
    return next(new AppError('File key is required', 400));
  }

  const params = {
    Bucket: process.env.AWS_S3_BUCKET || 'tpe-uploads',
    Key: key,
    Expires: 3600 // URL expires in 1 hour
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    
    res.status(200).json({
      success: true,
      url
    });
  } catch (error) {
    console.error('S3 signed URL error:', error);
    next(new AppError('Failed to generate signed URL', 500));
  }
};

module.exports = {
  uploadLogoHandler,
  uploadVideoHandler,
  uploadDocumentHandler,
  deleteFileHandler,
  getSignedUrlHandler
};