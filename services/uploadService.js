// const AWS = require('aws-sdk');
// const multer = require('multer');
// const multerS3 = require('multer-s3');
// const sharp = require('sharp');
// const { v4: uuidv4 } = require('uuid');
// const path = require('path');

// class UploadService {
//   constructor() {
//     // Configure AWS
//     AWS.config.update({
//       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//       region: process.env.AWS_REGION || 'us-east-1'
//     });

//     this.s3 = new AWS.S3();
//     this.bucketName = process.env.AWS_S3_BUCKET;

//     // File size limits
//     this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
//     this.MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
//     this.MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB for documents

//     // Allowed file types
//     this.ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
//     this.ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
//     this.ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime'];

//     this.setupMulter();
//   }

//   setupMulter() {
//     // Memory storage for processing before S3 upload
//     this.upload = multer({
//       storage: multer.memoryStorage(),
//       limits: {
//         fileSize: this.MAX_FILE_SIZE,
//         files: 5 // Max 5 files per request
//       },
//       fileFilter: (req, file, cb) => {
//         this.validateFile(file, cb);
//       }
//     });

//     // Direct S3 upload (alternative approach)
//     this.s3Upload = multer({
//       storage: multerS3({
//         s3: this.s3,
//         bucket: this.bucketName,
//         metadata: (req, file, cb) => {
//           cb(null, {
//             fieldName: file.fieldname,
//             originalName: file.originalname,
//             uploadedBy: req.user?.id || 'anonymous'
//           });
//         },
//         key: (req, file, cb) => {
//           const folder = this.getUploadFolder(file.mimetype);
//           const fileName = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
//           cb(null, fileName);
//         }
//       }),
//       limits: {
//         fileSize: this.MAX_FILE_SIZE
//       },
//       fileFilter: (req, file, cb) => {
//         this.validateFile(file, cb);
//       }
//     });
//   }

//   // Validate uploaded file
//   validateFile(file, cb) {
//     const allowedTypes = [
//       ...this.ALLOWED_IMAGE_TYPES,
//       ...this.ALLOWED_DOCUMENT_TYPES,
//       ...this.ALLOWED_VIDEO_TYPES
//     ];

//     if (!allowedTypes.includes(file.mimetype)) {
//       return cb(new Error(`File type ${file.mimetype} not allowed`), false);
//     }

//     // Check file size based on type
//     let maxSize = this.MAX_FILE_SIZE;
//     if (this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
//       maxSize = this.MAX_IMAGE_SIZE;
//     } else if (this.ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
//       maxSize = this.MAX_DOCUMENT_SIZE;
//     }

//     cb(null, true);
//   }

//   // Get upload folder based on file type
//   getUploadFolder(mimetype) {
//     if (this.ALLOWED_IMAGE_TYPES.includes(mimetype)) {
//       return 'images';
//     } else if (this.ALLOWED_DOCUMENT_TYPES.includes(mimetype)) {
//       return 'documents';
//     } else if (this.ALLOWED_VIDEO_TYPES.includes(mimetype)) {
//       return 'videos';
//     }
//     return 'misc';
//   }

//   // Upload single file with processing
//   async uploadFile(file, options = {}) {
//     try {
//       const {
//         folder = 'uploads',
//         resize = false,
//         width = 1200,
//         height = 1200,
//         quality = 85
//       } = options;

//       let buffer = file.buffer;
//       let processedFileName = file.originalname;

//       // Process images
//       if (this.ALLOWED_IMAGE_TYPES.includes(file.mimetype) && resize) {
//         buffer = await sharp(file.buffer)
//           .resize(width, height, {
//             fit: 'inside',
//             withoutEnlargement: true
//           })
//           .jpeg({ quality })
//           .toBuffer();
        
//         processedFileName = file.originalname.replace(/\.[^/.]+$/, '.jpg');
//       }

//       // Generate unique filename
//       const fileName = `${folder}/${uuidv4()}${path.extname(processedFileName)}`;

//       // Upload to S3
//       const uploadParams = {
//         Bucket: this.bucketName,
//         Key: fileName,
//         Body: buffer,
//         ContentType: file.mimetype,
//         Metadata: {
//           originalName: file.originalname,
//           uploadedAt: new Date().toISOString(),
//           processedBySharp: resize.toString()
//         }
//       };

//       const result = await this.s3.upload(uploadParams).promise();

//       return {
//         fileName: fileName,
//         originalName: file.originalname,
//         url: result.Location,
//         size: buffer.length,
//         mimetype: file.mimetype,
//         bucket: this.bucketName,
//         key: fileName
//       };

//     } catch (error) {
//       console.error('Upload file error:', error);
//       throw error;
//     }
//   }

//   // Upload multiple files
//   async uploadMultipleFiles(files, options = {}) {
//     try {
//       const uploadPromises = files.map(file => this.uploadFile(file, options));
//       return await Promise.all(uploadPromises);
//     } catch (error) {
//       console.error('Upload multiple files error:', error);
//       throw error;
//     }
//   }

//   // Upload image with thumbnail generation
//   async uploadImageWithThumbnail(file, options = {}) {
//     try {
//       const {
//         folder = 'images',
//         mainWidth = 1200,
//         mainHeight = 1200,
//         mainQuality = 85,
//         thumbWidth = 300,
//         thumbHeight = 300,
//         thumbQuality = 80
//       } = options;

//       // Process main image
//       const mainBuffer = await sharp(file.buffer)
//         .resize(mainWidth, mainHeight, {
//           fit: 'inside',
//           withoutEnlargement: true
//         })
//         .jpeg({ quality: mainQuality })
//         .toBuffer();

//       // Process thumbnail
//       const thumbBuffer = await sharp(file.buffer)
//         .resize(thumbWidth, thumbHeight, {
//           fit: 'cover',
//           position: 'center'
//         })
//         .jpeg({ quality: thumbQuality })
//         .toBuffer();

//       // Generate filenames
//       const baseFileName = uuidv4();
//       const mainFileName = `${folder}/${baseFileName}.jpg`;
//       const thumbFileName = `${folder}/thumbnails/${baseFileName}_thumb.jpg`;

//       // Upload both files
//       const [mainUpload, thumbUpload] = await Promise.all([
//         this.s3.upload({
//           Bucket: this.bucketName,
//           Key: mainFileName,
//           Body: mainBuffer,
//           ContentType: 'image/jpeg',
//           Metadata: {
//             originalName: file.originalname,
//             type: 'main',
//             uploadedAt: new Date().toISOString()
//           }
//         }).promise(),

//         this.s3.upload({
//           Bucket: this.bucketName,
//           Key: thumbFileName,
//           Body: thumbBuffer,
//           ContentType: 'image/jpeg',
//           Metadata: {
//             originalName: file.originalname,
//             type: 'thumbnail',
//             uploadedAt: new Date().toISOString()
//           }
//         }).promise()
//       ]);

//       return {
//         main: {
//           fileName: mainFileName,
//           url: mainUpload.Location,
//           size: mainBuffer.length,
//           dimensions: { width: mainWidth, height: mainHeight }
//         },
//         thumbnail: {
//           fileName: thumbFileName,
//           url: thumbUpload.Location,
//           size: thumbBuffer.length,
//           dimensions: { width: thumbWidth, height: thumbHeight }
//         },
//         originalName: file.originalname,
//         mimetype: file.mimetype
//       };

//     } catch (error) {
//       console.error('Upload image with thumbnail error:', error);
//       throw error;
//     }
//   }

//   // Delete file from S3
//   async deleteFile(fileName) {
//     try {
//       const deleteParams = {
//         Bucket: this.bucketName,
//         Key: fileName
//       };

//       await this.s3.deleteObject(deleteParams).promise();
//       return { success: true, message: 'File deleted successfully' };

//     } catch (error) {
//       console.error('Delete file error:', error);
//       throw error;
//     }
//   }

//   // Generate presigned URL for temporary access
//   async generatePresignedUrl(fileName, expiration = 3600) {
//     try {
//       const params = {
//         Bucket: this.bucketName,
//         Key: fileName,
//         Expires: expiration // URL expires in seconds
//       };

//       const url = this.s3.getSignedUrl('getObject', params);
//       return { url, expiresIn: expiration };

//     } catch (error) {
//       console.error('Generate presigned URL error:', error);
//       throw error;
//     }
//   }

//   // Get multer middleware
//   getMulterMiddleware() {
//     return {
//       single: (fieldName) => this.upload.single(fieldName),
//       multiple: (fieldName, maxCount = 5) => this.upload.array(fieldName, maxCount),
//       fields: (fields) => this.upload.fields(fields),
//       s3Single: (fieldName) => this.s3Upload.single(fieldName),
//       s3Multiple: (fieldName, maxCount = 5) => this.s3Upload.array(fieldName, maxCount)
//     };
//   }
// }

// module.exports = new UploadService();



const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

class UploadService {
  constructor() {
    // Configure AWS SDK for Filebase
    this.s3 = new AWS.S3({
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      endpoint: process.env.R2_ENDPOINT, // https://s3.filebase.com
      region: 'us-east-1',
      s3ForcePathStyle: true, // Important for Filebase compatibility
      signatureVersion: 'v4'
    });

    this.bucketName = process.env.R2_BUCKET_NAME;
    console.log('🔧 Upload service initialized with Filebase');
    console.log(`📦 Bucket: ${this.bucketName}`);
  }

  // Configure multer for direct S3 uploads
  getMulterUpload(fileType = 'image') {
    return multer({
      storage: multerS3({
        s3: this.s3,
        bucket: this.bucketName,
        key: (req, file, cb) => {
          // Generate unique filename
          const uniqueName = `${fileType}/${Date.now()}-${uuidv4()}-${file.originalname}`;
          cb(null, uniqueName);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
          cb(null, {
            uploadedBy: req.user?.id || 'unknown',
            originalName: file.originalname
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

  // Upload image with thumbnail generation
  async uploadImageWithThumbnail(file, userId) {
    try {
      const originalKey = `images/${Date.now()}-${uuidv4()}-${file.originalname}`;
      const thumbnailKey = `thumbnails/${Date.now()}-${uuidv4()}-thumb-${file.originalname}`;

      // Generate thumbnail
      const thumbnailBuffer = await sharp(file.buffer)
        .resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Upload original image
      const originalUpload = await this.s3.upload({
        Bucket: this.bucketName,
        Key: originalKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          uploadedBy: userId,
          originalName: file.originalname
        }
      }).promise();

      // Upload thumbnail
      const thumbnailUpload = await this.s3.upload({
        Bucket: this.bucketName,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
        Metadata: {
          uploadedBy: userId,
          type: 'thumbnail',
          originalKey: originalKey
        }
      }).promise();

      return {
        original: {
          url: originalUpload.Location,
          key: originalKey,
          size: file.size
        },
        thumbnail: {
          url: thumbnailUpload.Location,
          key: thumbnailKey
        }
      };

    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  // Delete file from Filebase
  async deleteFile(key) {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();

      console.log(`🗑️ File deleted: ${key}`);
      return { success: true };

    } catch (error) {
      console.error('Delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  // Get signed URL for private files
  async getSignedUrl(key, expiresIn = 3600) {
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
    try {
      const response = await this.s3.listObjectsV2({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: limit
      }).promise();

      return {
        files: response.Contents.map(file => ({
          key: file.Key,
          size: file.Size,
          lastModified: file.LastModified,
          url: `https://${this.bucketName}.s3.filebase.com/${file.Key}`
        })),
        total: response.KeyCount
      };

    } catch (error) {
      console.error('List files error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }
}

module.exports = new UploadService();
