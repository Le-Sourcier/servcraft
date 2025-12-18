export type StorageProvider = 'local' | 's3' | 'cloudinary' | 'gcs';

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  provider: StorageProvider;
  bucket?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  createdAt: Date;
}

export interface UploadConfig {
  provider: StorageProvider;
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  local?: LocalStorageConfig;
  s3?: S3Config;
  cloudinary?: CloudinaryConfig;
  gcs?: GCSConfig;
}

export interface LocalStorageConfig {
  uploadDir: string;
  publicPath: string;
}

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string; // For S3-compatible services
  acl?: 'private' | 'public-read' | 'public-read-write';
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder?: string;
}

export interface GCSConfig {
  projectId: string;
  keyFilename?: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
  bucket: string;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
  blur?: number;
  grayscale?: boolean;
}

export interface UploadOptions {
  filename?: string;
  folder?: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
  transform?: ImageTransformOptions;
}

export interface MultipartFile {
  filename: string;
  mimetype: string;
  encoding: string;
  file: NodeJS.ReadableStream;
  toBuffer(): Promise<Buffer>;
}
