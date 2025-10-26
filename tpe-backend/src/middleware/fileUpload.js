const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const logosDir = path.join(uploadsDir, 'partner-logos');
const docsDir = path.join(uploadsDir, 'partner-documents');

[uploadsDir, logosDir, docsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage for logos
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, logosDir);
  },
  filename: (req, file, cb) => {
    const partnerId = req.partnerUser ? req.partnerUser.partnerId : 'unknown';
    const ext = path.extname(file.originalname);
    const filename = `partner-${partnerId}-logo-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

// File filter for logos - only allow images
const logoFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, JPEG, and SVG images are allowed.'), false);
  }
};

// Create multer upload middleware for logos
const uploadLogoMiddleware = multer({
  storage: logoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024  // 2MB max file size
  },
  fileFilter: logoFileFilter
});

// Configure multer storage for documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, docsDir);
  },
  filename: (req, file, cb) => {
    const partnerId = req.partnerUser ? req.partnerUser.partnerId : 'unknown';
    const ext = path.extname(file.originalname);
    const filename = `partner-${partnerId}-doc-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

// File filter for documents - allow PDFs and images
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, PNG, JPG, and JPEG files are allowed.'), false);
  }
};

// Create multer upload middleware for documents
const uploadDocumentMiddleware = multer({
  storage: documentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024  // 5MB max file size for documents
  },
  fileFilter: documentFileFilter
});

module.exports = {
  uploadLogoMiddleware,
  uploadDocumentMiddleware
};
