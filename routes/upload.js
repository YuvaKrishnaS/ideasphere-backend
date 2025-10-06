const express = require('express');
const uploadController = require('../controllers/uploadController');
const uploadService = require('../services/uploadService');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Health check endpoint - Enhanced version
router.get('/health', async (req, res) => {
  try {
    const status = uploadService.getStatus();
    const connectionTest = await uploadService.testConnection();

    res.json({
      success: true,
      message: 'Upload service is operational',
      storage: 'Filebase IPFS',
      status: status,
      connection: connectionTest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Upload service health check failed',
      error: error.message
    });
  }
});

// Configure multer for different file types
const getImageUpload = () => {
  try {
    return uploadService.getMulterUpload('image');
  } catch (error) {
    return null;
  }
};

const getDocumentUpload = () => {
  try {
    return uploadService.getMulterUpload('document');
  } catch (error) {
    return null;
  }
};

// Upload profile image
router.post('/profile-image', authenticate, (req, res, next) => {
  const imageUpload = getImageUpload();
  if (!imageUpload) {
    return res.status(503).json({
      success: false,
      message: 'Upload service is not available. Please check configuration.'
    });
  }
  imageUpload.single('image')(req, res, next);
}, uploadController.uploadProfileImage);

// Upload bit image
router.post('/bit-image', authenticate, (req, res, next) => {
  const imageUpload = getImageUpload();
  if (!imageUpload) {
    return res.status(503).json({
      success: false,
      message: 'Upload service is not available. Please check configuration.'
    });
  }
  imageUpload.single('image')(req, res, next);
}, uploadController.uploadBitImage);

// Upload stack image
router.post('/stack-image', authenticate, (req, res, next) => {
  const imageUpload = getImageUpload();
  if (!imageUpload) {
    return res.status(503).json({
      success: false,
      message: 'Upload service is not available. Please check configuration.'
    });
  }
  imageUpload.single('image')(req, res, next);
}, uploadController.uploadStackImage);

// Upload document
router.post('/document', authenticate, (req, res, next) => {
  const documentUpload = getDocumentUpload();
  if (!documentUpload) {
    return res.status(503).json({
      success: false,
      message: 'Upload service is not available. Please check configuration.'
    });
  }
  documentUpload.single('file')(req, res, next);
}, uploadController.uploadDocument);

// Get user files
router.get('/files', authenticate, uploadController.getUserFiles);

// Delete file
router.delete('/files/:fileId', authenticate, uploadController.deleteFile);

// Admin: List all files (requires admin role)
router.get('/admin/files', authenticate, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
}, uploadController.listAllFiles);

module.exports = router;
