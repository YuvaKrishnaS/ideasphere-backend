const uploadService = require('../services/uploadService');
const { FileUpload } = require('../models');
const path = require('path');

class UploadController {
  constructor() {
    this.uploadImage = this.uploadImage.bind(this);
    this.uploadDocument = this.uploadDocument.bind(this);
    this.uploadProfileImage = this.uploadProfileImage.bind(this);
    this.uploadMultipleFiles = this.uploadMultipleFiles.bind(this);
    this.deleteFile = this.deleteFile.bind(this);
    this.getUserFiles = this.getUserFiles.bind(this);
  }

  // Upload single image with thumbnail
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      const { category = 'misc' } = req.body;

      // Upload image with thumbnail
      const uploadResult = await uploadService.uploadImageWithThumbnail(req.file, {
        folder: category === 'profile_image' ? 'profiles' : 'images',
        mainWidth: 1200,
        mainHeight: 1200,
        thumbWidth: 300,
        thumbHeight: 300
      });

      // Save file metadata to database
      const fileRecord = await FileUpload.create({
        userId: req.user.id,
        originalName: uploadResult.originalName,
        fileName: uploadResult.main.fileName,
        url: uploadResult.main.url,
        thumbnailUrl: uploadResult.thumbnail.url,
        mimetype: uploadResult.mimetype,
        size: uploadResult.main.size,
        category,
        metadata: {
          thumbnail: uploadResult.thumbnail,
          dimensions: uploadResult.main.dimensions
        }
      });

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          file: fileRecord,
          urls: {
            main: uploadResult.main.url,
            thumbnail: uploadResult.thumbnail.url
          }
        }
      });

    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image',
        error: error.message
      });
    }
  }

  // Upload document
  async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No document file provided'
        });
      }

      const uploadResult = await uploadService.uploadFile(req.file, {
        folder: 'documents'
      });

      // Save to database
      const fileRecord = await FileUpload.create({
        userId: req.user.id,
        originalName: uploadResult.originalName,
        fileName: uploadResult.fileName,
        url: uploadResult.url,
        mimetype: uploadResult.mimetype,
        size: uploadResult.size,
        category: 'document'
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: { file: fileRecord }
      });

    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload document',
        error: error.message
      });
    }
  }

  // Upload profile image
  async uploadProfileImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No profile image provided'
        });
      }

      const uploadResult = await uploadService.uploadImageWithThumbnail(req.file, {
        folder: 'profiles',
        mainWidth: 400,
        mainHeight: 400,
        thumbWidth: 150,
        thumbHeight: 150
      });

      // Delete old profile image if exists
      const oldProfileImage = await FileUpload.findOne({
        where: {
          userId: req.user.id,
          category: 'profile_image'
        }
      });

      if (oldProfileImage) {
        await uploadService.deleteFile(oldProfileImage.fileName);
        if (oldProfileImage.thumbnailUrl) {
          // Extract filename from URL to delete thumbnail
          const thumbnailKey = oldProfileImage.thumbnailUrl.split('/').slice(-2).join('/');
          await uploadService.deleteFile(thumbnailKey);
        }
        await oldProfileImage.destroy();
      }

      // Save new profile image
      const fileRecord = await FileUpload.create({
        userId: req.user.id,
        originalName: uploadResult.originalName,
        fileName: uploadResult.main.fileName,
        url: uploadResult.main.url,
        thumbnailUrl: uploadResult.thumbnail.url,
        mimetype: uploadResult.mimetype,
        size: uploadResult.main.size,
        category: 'profile_image',
        metadata: {
          thumbnail: uploadResult.thumbnail,
          dimensions: uploadResult.main.dimensions
        }
      });

      // Update user's profile image URL
      const { User } = require('../models');
      await User.update(
        { profileImage: uploadResult.main.url },
        { where: { id: req.user.id } }
      );

      res.status(201).json({
        success: true,
        message: 'Profile image updated successfully',
        data: {
          file: fileRecord,
          urls: {
            main: uploadResult.main.url,
            thumbnail: uploadResult.thumbnail.url
          }
        }
      });

    } catch (error) {
      console.error('Upload profile image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload profile image',
        error: error.message
      });
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files provided'
        });
      }

      const { category = 'misc' } = req.body;
      const uploadPromises = req.files.map(async (file) => {
        if (uploadService.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
          // Handle images with thumbnails
          const result = await uploadService.uploadImageWithThumbnail(file, {
            folder: 'images'
          });
          
          return FileUpload.create({
            userId: req.user.id,
            originalName: result.originalName,
            fileName: result.main.fileName,
            url: result.main.url,
            thumbnailUrl: result.thumbnail.url,
            mimetype: result.mimetype,
            size: result.main.size,
            category,
            metadata: { thumbnail: result.thumbnail, dimensions: result.main.dimensions }
          });
        } else {
          // Handle documents
          const result = await uploadService.uploadFile(file, {
            folder: uploadService.getUploadFolder(file.mimetype)
          });
          
          return FileUpload.create({
            userId: req.user.id,
            originalName: result.originalName,
            fileName: result.fileName,
            url: result.url,
            mimetype: result.mimetype,
            size: result.size,
            category
          });
        }
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} files uploaded successfully`,
        data: { files: uploadedFiles }
      });

    } catch (error) {
      console.error('Upload multiple files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload files',
        error: error.message
      });
    }
  }

  // Delete file
  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;

      const file = await FileUpload.findOne({
        where: {
          id: fileId,
          userId: req.user.id // Users can only delete their own files
        }
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found or access denied'
        });
      }

      // Delete from S3
      await uploadService.deleteFile(file.fileName);
      
      // Delete thumbnail if exists
      if (file.thumbnailUrl) {
        const thumbnailKey = file.thumbnailUrl.split('/').slice(-2).join('/');
        await uploadService.deleteFile(thumbnailKey);
      }

      // Delete from database
      await file.destroy();

      res.json({
        success: true,
        message: 'File deleted successfully'
      });

    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file',
        error: error.message
      });
    }
  }

  // Get user's files
  async getUserFiles(req, res) {
    try {
      const { category, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const whereClause = { userId: req.user.id };
      if (category) {
        whereClause.category = category;
      }

      const { rows: files, count } = await FileUpload.findAndCountAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
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
}

module.exports = new UploadController();
