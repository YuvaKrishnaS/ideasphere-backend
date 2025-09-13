const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class UploadService {
  constructor() {
    // Configure AWS
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.s3 = new AWS.S3();
    this.bucketName = process.env.AWS_S3_BUCKET;

    // File size limits
    this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    this.MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
    this.MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB for documents

    // Allowed file types
    this.ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    this.ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    this.ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime'];

    this.setupMulter();
  }

  setupMulter() {
    // Memory storage for processing before S3 upload
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: this.MAX_FILE_SIZE,
        files: 5 // Max 5 files per request
      },
      fileFilter: (req, file, cb) => {
        this.validateFile(file, cb);
      }
    });

    // Direct S3 upload (alternative approach)
    this.s3Upload = multer({
      storage: multerS3({
        s3: this.s3,
        bucket: this.bucketName,
        metadata: (req, file, cb) => {
          cb(null, {
            fieldName: file.fieldname,
            originalName: file.originalname,
            uploadedBy: req.user?.id || 'anonymous'
          });
        },
        key: (req, file, cb) => {
          const folder = this.getUploadFolder(file.mimetype);
          const fileName = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, fileName);
        }
      }),
      limits: {
        fileSize: this.MAX_FILE_SIZE
      },
      fileFilter: (req, file, cb) => {
        this.validateFile(file, cb);
      }
    });
  }

  // Validate uploaded file
  validateFile(file, cb) {
    const allowedTypes = [
      ...this.ALLOWED_IMAGE_TYPES,
      ...this.ALLOWED_DOCUMENT_TYPES,
      ...this.ALLOWED_VIDEO_TYPES
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }

    // Check file size based on type
    let maxSize = this.MAX_FILE_SIZE;
    if (this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      maxSize = this.MAX_IMAGE_SIZE;
    } else if (this.ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      maxSize = this.MAX_DOCUMENT_SIZE;
    }

    cb(null, true);
  }

  // Get upload folder based on file type
  getUploadFolder(mimetype) {
    if (this.ALLOWED_IMAGE_TYPES.includes(mimetype)) {
      return 'images';
    } else if (this.ALLOWED_DOCUMENT_TYPES.includes(mimetype)) {
      return 'documents';
    } else if (this.ALLOWED_VIDEO_TYPES.includes(mimetype)) {
      return 'videos';
    }
    return 'misc';
  }

  // Upload single file with processing
  async uploadFile(file, options = {}) {
    try {
      const {
        folder = 'uploads',
        resize = false,
        width = 1200,
        height = 1200,
        quality = 85
      } = options;

      let buffer = file.buffer;
      let processedFileName = file.originalname;

      // Process images
      if (this.ALLOWED_IMAGE_TYPES.includes(file.mimetype) && resize) {
        buffer = await sharp(file.buffer)
          .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality })
          .toBuffer();
        
        processedFileName = file.originalname.replace(/\.[^/.]+$/, '.jpg');
      }

      // Generate unique filename
      const fileName = `${folder}/${uuidv4()}${path.extname(processedFileName)}`;

      // Upload to S3
      const uploadParams = {
        Bucket: this.bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          processedBySharp: resize.toString()
        }
      };

      const result = await this.s3.upload(uploadParams).promise();

      return {
        fileName: fileName,
        originalName: file.originalname,
        url: result.Location,
        size: buffer.length,
        mimetype: file.mimetype,
        bucket: this.bucketName,
        key: fileName
      };

    } catch (error) {
      console.error('Upload file error:', error);
      throw error;
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(files, options = {}) {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, options));
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Upload multiple files error:', error);
      throw error;
    }
  }

  // Upload image with thumbnail generation
  async uploadImageWithThumbnail(file, options = {}) {
    try {
      const {
        folder = 'images',
        mainWidth = 1200,
        mainHeight = 1200,
        mainQuality = 85,
        thumbWidth = 300,
        thumbHeight = 300,
        thumbQuality = 80
      } = options;

      // Process main image
      const mainBuffer = await sharp(file.buffer)
        .resize(mainWidth, mainHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: mainQuality })
        .toBuffer();

      // Process thumbnail
      const thumbBuffer = await sharp(file.buffer)
        .resize(thumbWidth, thumbHeight, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: thumbQuality })
        .toBuffer();

      // Generate filenames
      const baseFileName = uuidv4();
      const mainFileName = `${folder}/${baseFileName}.jpg`;
      const thumbFileName = `${folder}/thumbnails/${baseFileName}_thumb.jpg`;

      // Upload both files
      const [mainUpload, thumbUpload] = await Promise.all([
        this.s3.upload({
          Bucket: this.bucketName,
          Key: mainFileName,
          Body: mainBuffer,
          ContentType: 'image/jpeg',
          Metadata: {
            originalName: file.originalname,
            type: 'main',
            uploadedAt: new Date().toISOString()
          }
        }).promise(),

        this.s3.upload({
          Bucket: this.bucketName,
          Key: thumbFileName,
          Body: thumbBuffer,
          ContentType: 'image/jpeg',
          Metadata: {
            originalName: file.originalname,
            type: 'thumbnail',
            uploadedAt: new Date().toISOString()
          }
        }).promise()
      ]);

      return {
        main: {
          fileName: mainFileName,
          url: mainUpload.Location,
          size: mainBuffer.length,
          dimensions: { width: mainWidth, height: mainHeight }
        },
        thumbnail: {
          fileName: thumbFileName,
          url: thumbUpload.Location,
          size: thumbBuffer.length,
          dimensions: { width: thumbWidth, height: thumbHeight }
        },
        originalName: file.originalname,
        mimetype: file.mimetype
      };

    } catch (error) {
      console.error('Upload image with thumbnail error:', error);
      throw error;
    }
  }

  // Delete file from S3
  async deleteFile(fileName) {
    try {
      const deleteParams = {
        Bucket: this.bucketName,
        Key: fileName
      };

      await this.s3.deleteObject(deleteParams).promise();
      return { success: true, message: 'File deleted successfully' };

    } catch (error) {
      console.error('Delete file error:', error);
      throw error;
    }
  }

  // Generate presigned URL for temporary access
  async generatePresignedUrl(fileName, expiration = 3600) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: fileName,
        Expires: expiration // URL expires in seconds
      };

      const url = this.s3.getSignedUrl('getObject', params);
      return { url, expiresIn: expiration };

    } catch (error) {
      console.error('Generate presigned URL error:', error);
      throw error;
    }
  }

  // Get multer middleware
  getMulterMiddleware() {
    return {
      single: (fieldName) => this.upload.single(fieldName),
      multiple: (fieldName, maxCount = 5) => this.upload.array(fieldName, maxCount),
      fields: (fields) => this.upload.fields(fields),
      s3Single: (fieldName) => this.s3Upload.single(fieldName),
      s3Multiple: (fieldName, maxCount = 5) => this.s3Upload.array(fieldName, maxCount)
    };
  }
}

module.exports = new UploadService();
