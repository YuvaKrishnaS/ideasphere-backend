const uploadService = require('../services/uploadService');
const { FileUpload } = require('../models');

class UploadController {
  // Upload profile image
  async uploadProfileImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const userId = req.user.id;
      
      // Save file record to database
      const fileRecord = await FileUpload.create({
        userId: userId,
        originalName: req.file.originalname,
        fileName: req.file.key,
        url: req.file.location,
        mimetype: req.file.mimetype,
        size: req.file.size,
        category: 'profile_image',
        isPublic: true,
        metadata: {
          uploadedAt: new Date().toISOString(),
          bucket: req.file.bucket
        }
      });

      res.json({
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          file: {
            id: fileRecord.id,
            url: req.file.location,
            filename: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype
          }
        }
      });

    } catch (error) {
      console.error('Profile image upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile image',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Upload bit image
  async uploadBitImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const userId = req.user.id;
      
      const fileRecord = await FileUpload.create({
        userId: userId,
        originalName: req.file.originalname,
        fileName: req.file.key,
        url: req.file.location,
        mimetype: req.file.mimetype,
        size: req.file.size,
        category: 'bit_image',
        isPublic: true,
        metadata: {
          uploadedAt: new Date().toISOString(),
          bucket: req.file.bucket
        }
      });

      res.json({
        success: true,
        message: 'Bit image uploaded successfully',
        data: {
          file: {
            id: fileRecord.id,
            url: req.file.location,
            filename: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype
          }
        }
      });

    } catch (error) {
      console.error('Bit image upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload bit image',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Upload stack image
  async uploadStackImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const userId = req.user.id;
      
      const fileRecord = await FileUpload.create({
        userId: userId,
        originalName: req.file.originalname,
        fileName: req.file.key,
        url: req.file.location,
        mimetype: req.file.mimetype,
        size: req.file.size,
        category: 'stack_image',
        isPublic: true,
        metadata: {
          uploadedAt: new Date().toISOString(),
          bucket: req.file.bucket
        }
      });

      res.json({
        success: true,
        message: 'Stack image uploaded successfully',
        data: {
          file: {
            id: fileRecord.id,
            url: req.file.location,
            filename: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype
          }
        }
      });

    } catch (error) {
      console.error('Stack image upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload stack image',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Upload document
  async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided'
        });
      }

      const userId = req.user.id;
      
      const fileRecord = await FileUpload.create({
        userId: userId,
        originalName: req.file.originalname,
        fileName: req.file.key,
        url: req.file.location,
        mimetype: req.file.mimetype,
        size: req.file.size,
        category: 'document',
        isPublic: false, // Documents are private by default
        metadata: {
          uploadedAt: new Date().toISOString(),
          bucket: req.file.bucket
        }
      });

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          file: {
            id: fileRecord.id,
            url: req.file.location,
            filename: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype
          }
        }
      });

    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload document',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get user's uploaded files
  async getUserFiles(req, res) {
    try {
      const userId = req.user.id;
      const { category, page = 1, limit = 20 } = req.query;

      const whereClause = { userId };
      if (category) {
        whereClause.category = category;
      }

      const { rows: files, count } = await FileUpload.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'originalName', 'fileName', 'url', 'size', 'category', 'createdAt']
      });

      res.json({
        success: true,
        data: {
          files,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get user files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch files'
      });
    }
  }

  // Delete file
  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;

      // Find file record
      const fileRecord = await FileUpload.findOne({
        where: { id: fileId, userId }
      });

      if (!fileRecord) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Delete from Filebase
      try {
        await uploadService.deleteFile(fileRecord.fileName);
      } catch (deleteError) {
        console.warn('Failed to delete file from storage:', deleteError.message);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      await fileRecord.destroy();

      res.json({
        success: true,
        message: 'File deleted successfully'
      });

    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file'
      });
    }
  }

  // Admin: List all files
  async listAllFiles(req, res) {
    try {
      const { prefix = '', limit = 100 } = req.query;

      const result = await uploadService.listFiles(prefix, parseInt(limit));

      res.json({
        success: true,
        message: 'Files retrieved successfully',
        data: result
      });

    } catch (error) {
      console.error('List all files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list files',
        error: error.message
      });
    }
  }
}

module.exports = new UploadController();
