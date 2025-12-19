import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../core/logger.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import type {
  UploadConfig,
  UploadedFile,
  UploadOptions,
  MultipartFile,
  ImageTransformOptions,
} from './types.js';

// In-memory storage for file metadata
const files = new Map<string, UploadedFile>();

const defaultConfig: UploadConfig = {
  provider: 'local',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/json',
  ],
  local: {
    uploadDir: './uploads',
    publicPath: '/uploads',
  },
};

export class UploadService {
  private config: UploadConfig;

  constructor(config: Partial<UploadConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async upload(file: MultipartFile, options: UploadOptions = {}): Promise<UploadedFile> {
    // Validate mime type
    if (!this.config.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestError(
        `File type not allowed. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`
      );
    }

    const buffer = await file.toBuffer();

    // Validate file size
    if (buffer.length > this.config.maxFileSize) {
      throw new BadRequestError(
        `File too large. Maximum size: ${this.formatBytes(this.config.maxFileSize)}`
      );
    }

    let processedBuffer = buffer;

    // Apply image transformations if requested
    if (options.transform && this.isImage(file.mimetype)) {
      processedBuffer = await this.transformImage(buffer, options.transform);
    }

    const uploadedFile = await this.saveFile(file, processedBuffer, options);
    files.set(uploadedFile.id, uploadedFile);

    logger.info({ fileId: uploadedFile.id, size: uploadedFile.size }, 'File uploaded');
    return uploadedFile;
  }

  async uploadMultiple(
    uploadFiles: MultipartFile[],
    options: UploadOptions = {}
  ): Promise<UploadedFile[]> {
    const results: UploadedFile[] = [];
    for (const file of uploadFiles) {
      const uploaded = await this.upload(file, options);
      results.push(uploaded);
    }
    return results;
  }

  async getFile(fileId: string): Promise<UploadedFile | null> {
    return files.get(fileId) || null;
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = files.get(fileId);
    if (!file) {
      throw new NotFoundError('File');
    }

    switch (this.config.provider) {
      case 'local':
        await this.deleteLocal(file.path);
        break;
      case 's3':
        await this.deleteS3(file.path);
        break;
      case 'cloudinary':
        await this.deleteCloudinary(file.path);
        break;
      case 'gcs':
        await this.deleteGCS(file.path);
        break;
    }

    files.delete(fileId);
    logger.info({ fileId }, 'File deleted');
  }

  async getSignedUrl(fileId: string, expiresIn = 3600): Promise<string> {
    const file = files.get(fileId);
    if (!file) {
      throw new NotFoundError('File');
    }

    switch (this.config.provider) {
      case 's3':
        return this.getS3SignedUrl(file.path, expiresIn);
      case 'gcs':
        return this.getGCSSignedUrl(file.path, expiresIn);
      default:
        return file.url;
    }
  }

  // Private methods
  private async saveFile(
    file: MultipartFile,
    buffer: Buffer,
    options: UploadOptions
  ): Promise<UploadedFile> {
    const id = randomUUID();
    const ext = path.extname(file.filename);
    const filename = options.filename || `${id}${ext}`;
    const folder = options.folder || '';

    switch (this.config.provider) {
      case 'local':
        return this.saveLocal(id, file, buffer, filename, folder);
      case 's3':
        return this.saveS3(id, file, buffer, filename, folder, options.isPublic);
      case 'cloudinary':
        return this.saveCloudinary(id, file, buffer, filename, folder);
      case 'gcs':
        return this.saveGCS(id, file, buffer, filename, folder, options.isPublic);
      default:
        return this.saveLocal(id, file, buffer, filename, folder);
    }
  }

  // Local storage
  private async saveLocal(
    id: string,
    file: MultipartFile,
    buffer: Buffer,
    filename: string,
    folder: string
  ): Promise<UploadedFile> {
    const uploadDir = path.join(this.config.local!.uploadDir, folder);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const publicPath = path.join(this.config.local!.publicPath, folder, filename);

    return {
      id,
      originalName: file.filename,
      filename,
      mimetype: file.mimetype,
      size: buffer.length,
      path: filePath,
      url: publicPath,
      provider: 'local',
      createdAt: new Date(),
    };
  }

  private async deleteLocal(filePath: string): Promise<void> {
    await fs.unlink(filePath).catch(() => {});
  }

  // S3 storage
  private async saveS3(
    id: string,
    file: MultipartFile,
    buffer: Buffer,
    filename: string,
    folder: string,
    isPublic = false
  ): Promise<UploadedFile> {
    const config = this.config.s3!;
    const key = folder ? `${folder}/${filename}` : filename;

    // Using fetch for S3 upload (simplified - in production use @aws-sdk/client-s3)
    const url = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.mimetype,
        'Content-Length': buffer.length.toString(),
        'x-amz-acl': isPublic ? 'public-read' : 'private',
      },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.statusText}`);
    }

    return {
      id,
      originalName: file.filename,
      filename,
      mimetype: file.mimetype,
      size: buffer.length,
      path: key,
      url: isPublic ? url : '',
      provider: 's3',
      bucket: config.bucket,
      createdAt: new Date(),
    };
  }

  private async deleteS3(key: string): Promise<void> {
    const config = this.config.s3!;
    const url = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
    await fetch(url, { method: 'DELETE' });
  }

  private async getS3SignedUrl(key: string, _expiresIn: number): Promise<string> {
    const config = this.config.s3!;
    // Simplified - in production use @aws-sdk/s3-request-presigner
    return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
  }

  // Cloudinary storage
  private async saveCloudinary(
    id: string,
    file: MultipartFile,
    buffer: Buffer,
    filename: string,
    folder: string
  ): Promise<UploadedFile> {
    const config = this.config.cloudinary!;
    const uploadFolder = config.folder ? `${config.folder}/${folder}` : folder;

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(buffer)], { type: file.mimetype }));
    formData.append('api_key', config.apiKey);
    formData.append('folder', uploadFolder);
    formData.append('public_id', path.parse(filename).name);

    const timestamp = Math.floor(Date.now() / 1000);
    formData.append('timestamp', timestamp.toString());

    // Generate signature (simplified - use cloudinary SDK in production)
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`,
      { method: 'POST', body: formData }
    );

    const result = (await response.json()) as { secure_url: string; public_id: string };

    return {
      id,
      originalName: file.filename,
      filename,
      mimetype: file.mimetype,
      size: buffer.length,
      path: result.public_id,
      url: result.secure_url,
      provider: 'cloudinary',
      createdAt: new Date(),
    };
  }

  private async deleteCloudinary(publicId: string): Promise<void> {
    const config = this.config.cloudinary!;
    const formData = new FormData();
    formData.append('api_key', config.apiKey);
    formData.append('public_id', publicId);

    await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
      method: 'POST',
      body: formData,
    });
  }

  // GCS storage
  private async saveGCS(
    id: string,
    file: MultipartFile,
    buffer: Buffer,
    filename: string,
    folder: string,
    isPublic = false
  ): Promise<UploadedFile> {
    const config = this.config.gcs!;
    const objectName = folder ? `${folder}/${filename}` : filename;

    const url = `https://storage.googleapis.com/upload/storage/v1/b/${config.bucket}/o?uploadType=media&name=${objectName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': file.mimetype },
      body: new Uint8Array(buffer),
    });

    if (!response.ok) {
      throw new Error(`GCS upload failed: ${response.statusText}`);
    }

    const publicUrl = isPublic
      ? `https://storage.googleapis.com/${config.bucket}/${objectName}`
      : '';

    return {
      id,
      originalName: file.filename,
      filename,
      mimetype: file.mimetype,
      size: buffer.length,
      path: objectName,
      url: publicUrl,
      provider: 'gcs',
      bucket: config.bucket,
      createdAt: new Date(),
    };
  }

  private async deleteGCS(objectName: string): Promise<void> {
    const config = this.config.gcs!;
    const url = `https://storage.googleapis.com/storage/v1/b/${config.bucket}/o/${encodeURIComponent(objectName)}`;
    await fetch(url, { method: 'DELETE' });
  }

  private async getGCSSignedUrl(objectName: string, _expiresIn: number): Promise<string> {
    const config = this.config.gcs!;
    return `https://storage.googleapis.com/${config.bucket}/${objectName}`;
  }

  // Image transformation (simplified - use sharp in production)
  private async transformImage(buffer: Buffer, options: ImageTransformOptions): Promise<Buffer> {
    // This is a placeholder - in production, use the 'sharp' package
    // Example with sharp:
    // import sharp from 'sharp';
    // let image = sharp(buffer);
    // if (options.width || options.height) {
    //   image = image.resize(options.width, options.height, { fit: options.fit });
    // }
    // if (options.grayscale) image = image.grayscale();
    // if (options.blur) image = image.blur(options.blur);
    // if (options.format) image = image.toFormat(options.format, { quality: options.quality });
    // return image.toBuffer();

    logger.debug({ options }, 'Image transformation requested (using placeholder)');
    return buffer;
  }

  private isImage(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

let uploadService: UploadService | null = null;

export function getUploadService(): UploadService {
  if (!uploadService) {
    uploadService = new UploadService();
  }
  return uploadService;
}

export function createUploadService(config: Partial<UploadConfig>): UploadService {
  uploadService = new UploadService(config);
  return uploadService;
}
