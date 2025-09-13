const express = require('express');
const uploadController = require('../controllers/uploadController');
const uploadService = require('../services/uploadService');
const { authenticate: authenticateToken } = require('../middleware/auth');
const { param, body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files.'
      });
    }
    if (error.message.includes('not allowed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: 'Upload failed',
    error: error?.message
  });
};

// Upload single image
router.post('/image',
  authenticateToken,
  uploadService.getMulterMiddleware().single('image'),
  uploadController.uploadImage,
  handleUploadError
);

// Upload document
router.post('/document',
  authenticateToken,
  uploadService.getMulterMiddleware().single('document'),
  uploadController.uploadDocument,
  handleUploadError
);

// Upload profile image
router.post('/profile-image',
  authenticateToken,
  uploadService.getMulterMiddleware().single('profileImage'),
  uploadController.uploadProfileImage,
  handleUploadError
);

// Upload multiple files
router.post('/multiple',
  authenticateToken,
  uploadService.getMulterMiddleware().multiple('files', 5),
  uploadController.uploadMultipleFiles,
  handleUploadError
);

// Delete file
router.delete('/:fileId',
  authenticateToken,
  [
    param('fileId').isUUID().withMessage('Invalid file ID'),
    handleValidationErrors
  ],
  uploadController.deleteFile
);

// Get user files
router.get('/my-files',
  authenticateToken,
  uploadController.getUserFiles
);

// Get upload configuration (for frontend)
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      maxFileSize: uploadService.MAX_FILE_SIZE,
      maxImageSize: uploadService.MAX_IMAGE_SIZE,
      maxDocumentSize: uploadService.MAX_DOCUMENT_SIZE,
      allowedImageTypes: uploadService.ALLOWED_IMAGE_TYPES,
      allowedDocumentTypes: uploadService.ALLOWED_DOCUMENT_TYPES,
      allowedVideoTypes: uploadService.ALLOWED_VIDEO_TYPES,
      maxFiles: 5
    }
  });
});

module.exports = router;
