const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

class UploadService {
  constructor() {
    this.s3 = null;
    this.bucketName = process.env.R2_BUCKET_NAME;
    this.isInitialized = false;

    // Initialize S3-compatible client for Filebase
    this.initializeService();
  }

  initializeService() {
    console.log('🔧 Initializing Filebase upload service...');

    // Check for required environment variables
    const requiredVars = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_BUCKET_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error(`❌ Missing environment variables: ${missingVars.join(', ')}`);
      console.log('📝 Upload service will be disabled until variables are set');
      return;
    }

    try {
      // Configure AWS SDK for Filebase IPFS
      this.s3 = new AWS.S3({
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        endpoint: process.env.R2_ENDPOINT, // https://s3.filebase.com
        region: 'us-east-1',
        s3ForcePathStyle: true,
        signatureVersion: 'v4'
      });

      this.bucketName = process.env.R2_BUCKET_NAME;
      this.isInitialized = true;

      console.log('✅ Filebase service initialized successfully');
      console.log(`📦 Using bucket: ${this.bucketName}`);
      console.log(`🔗 Endpoint: ${process.env.R2_ENDPOINT}`);

    } catch (error) {
      console.error('❌ Failed to initialize Filebase S3 client:', error.message);
      this.isInitialized = false;
    }
  }

  // Check if service is ready
  isReady() {
    return this.isInitialized && this.s3 !== null;
  }

  // Configure multer for direct S3 uploads
  getMulterUpload(fileType = 'image') {
    if (!this.isReady()) {
      throw new Error('Upload service is not configured. Please check environment variables.');
    }

    return multer({
      storage: multerS3({
        s3: this.s3,
        bucket: this.bucketName,
        key: (req, file, cb) => {
          // Generate unique filename with folder structure
          const timestamp = Date.now();
          const uniqueId = uuidv4();
          const extension = file.originalname.split('.').pop();
          const uniqueName = `${fileType}s/${timestamp}-${uniqueId}.${extension}`;
          cb(null, uniqueName);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
          cb(null, {
            uploadedBy: req.user?.id || 'unknown',
            originalName: file.originalname,
            uploadedAt: new Date().toISOString()
          });
        }
      }),
      limits: {
        fileSize: fileType === 'image' ? 5 * 1024 * 1024 : 10 * 1024 * 1024 // 5MB for images, 10MB for docs
      },
      fileFilter: (req, file, cb) => {
        if (fileType === 'image') {
          if (file.mimetype.startsWith('image/')) {
            cb(null, true);
          } else {
            cb(new Error('Only image files are allowed'), false);
          }
        } else {
          cb(null, true); // Allow all file types for documents
        }
      }
    });
  }

  // Upload image with thumbnail generation (for memory uploads)
  async uploadImageWithThumbnail(fileBuffer, originalName, mimetype, userId) {
    if (!this.isReady()) {
      throw new Error('Upload service is not configured');
    }

    try {
      const timestamp = Date.now();
      const uniqueId = uuidv4();
      const extension = originalName.split('.').pop();
      
      const originalKey = `images/${timestamp}-${uniqueId}.${extension}`;
      const thumbnailKey = `thumbnails/${timestamp}-${uniqueId}-thumb.jpg`;

      // Generate thumbnail using Sharp
      const thumbnailBuffer = await sharp(fileBuffer)
        .resize(300, 300, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Upload original image
      const originalUpload = await this.s3.upload({
        Bucket: this.bucketName,
        Key: originalKey,
        Body: fileBuffer,
        ContentType: mimetype,
        Metadata: {
          uploadedBy: userId || 'unknown',
          originalName: originalName,
          type: 'original'
        }
      }).promise();

      // Upload thumbnail
      const thumbnailUpload = await this.s3.upload({
        Bucket: this.bucketName,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
        Metadata: {
          uploadedBy: userId || 'unknown',
          originalName: originalName,
          type: 'thumbnail',
          originalKey: originalKey
        }
      }).promise();

      return {
        original: {
          url: originalUpload.Location,
          key: originalKey,
          size: fileBuffer.length
        },
        thumbnail: {
          url: thumbnailUpload.Location,
          key: thumbnailKey,
          size: thumbnailBuffer.length
        }
      };

    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  // Upload single file (for documents or simple uploads)
  async uploadSingleFile(fileBuffer, originalName, mimetype, userId, category = 'document') {
    if (!this.isReady()) {
      throw new Error('Upload service is not configured');
    }

    try {
      const timestamp = Date.now();
      const uniqueId = uuidv4();
      const extension = originalName.split('.').pop();
      const key = `${category}s/${timestamp}-${uniqueId}.${extension}`;

      const uploadResult = await this.s3.upload({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimetype,
        Metadata: {
          uploadedBy: userId || 'unknown',
          originalName: originalName,
          category: category,
          uploadedAt: new Date().toISOString()
        }
      }).promise();

      return {
        url: uploadResult.Location,
        key: key,
        size: fileBuffer.length,
        etag: uploadResult.ETag
      };

    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  // Delete file from Filebase
  async deleteFile(key) {
    if (!this.isReady()) {
      throw new Error('Upload service is not configured');
    }

    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();

      console.log(`🗑️ File deleted successfully: ${key}`);
      return { success: true, deletedKey: key };

    } catch (error) {
      console.error('Delete file error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // Get signed URL for private file access
  async getSignedUrl(key, expiresIn = 3600) {
    if (!this.isReady()) {
      throw new Error('Upload service is not configured');
    }

    try {
      const url = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn
      });

      return url;

    } catch (error) {
      console.error('Signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  // List files in bucket (for admin purposes)
  async listFiles(prefix = '', limit = 100) {
    if (!this.isReady()) {
      throw new Error('Upload service is not configured');
    }

    try {
      const params = {
        Bucket: this.bucketName,
        MaxKeys: limit
      };

      if (prefix) {
        params.Prefix = prefix;
      }

      const response = await this.s3.listObjectsV2(params).promise();

      return {
        files: response.Contents.map(file => ({
          key: file.Key,
          size: file.Size,
          lastModified: file.LastModified,
          etag: file.ETag,
          url: `https://${this.bucketName}.s3.filebase.com/${file.Key}`
        })),
        count: response.KeyCount,
        isTruncated: response.IsTruncated
      };

    } catch (error) {
      console.error('List files error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Test connection to Filebase
  async testConnection() {
    if (!this.isReady()) {
      return {
        success: false,
        message: 'Upload service is not configured',
        details: 'Missing environment variables'
      };
    }

    try {
      // Try to list bucket contents (this is a lightweight operation)
      await this.s3.listObjectsV2({
        Bucket: this.bucketName,
        MaxKeys: 1
      }).promise();

      return {
        success: true,
        message: 'Connection to Filebase successful',
        bucket: this.bucketName,
        endpoint: process.env.R2_ENDPOINT
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to connect to Filebase',
        error: error.message
      };
    }
  }

  // Get service status
  getStatus() {
    return {
      initialized: this.isInitialized,
      ready: this.isReady(),
      bucket: this.bucketName,
      endpoint: process.env.R2_ENDPOINT || 'Not configured',
      hasCredentials: !!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)
    };
  }
}

module.exports = new UploadService();
