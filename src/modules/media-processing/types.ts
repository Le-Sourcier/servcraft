export type MediaType = 'image' | 'video' | 'audio';
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'avif';
export type VideoFormat = 'mp4' | 'webm' | 'avi' | 'mov';
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'aac';

export interface MediaProcessingConfig {
  /** FFmpeg path */
  ffmpegPath?: string;
  /** FFprobe path */
  ffprobePath?: string;
  /** Temporary directory */
  tempDir?: string;
  /** Max concurrent jobs */
  maxConcurrent?: number;
  /** Enable GPU acceleration */
  gpuAcceleration?: boolean;
}

export interface ImageOperation {
  type: 'resize' | 'crop' | 'rotate' | 'flip' | 'watermark' | 'compress' | 'filter';
  options: ImageOperationOptions;
}

export interface ImageOperationOptions {
  // Resize
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

  // Crop
  x?: number;
  y?: number;

  // Rotate
  angle?: number;

  // Flip
  direction?: 'horizontal' | 'vertical';

  // Watermark
  text?: string;
  image?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;

  // Compress
  quality?: number;

  // Filter
  filter?: 'grayscale' | 'blur' | 'sharpen' | 'sepia' | 'brightness' | 'contrast';
  intensity?: number;
}

export interface VideoOperation {
  type: 'trim' | 'resize' | 'compress' | 'extract-audio' | 'add-subtitle' | 'thumbnail';
  options: VideoOperationOptions;
}

export interface VideoOperationOptions {
  // Trim
  startTime?: string;
  endTime?: string;
  duration?: string;

  // Resize
  width?: number;
  height?: number;
  scale?: string;

  // Compress
  bitrate?: string;
  crf?: number;

  // Thumbnail
  timestamp?: string;
  count?: number;

  // Subtitle
  subtitleFile?: string;
}

export interface ProcessingJob {
  /** Job ID */
  id: string;
  /** Media type */
  mediaType: MediaType;
  /** Source file path */
  source: string;
  /** Output file path */
  output: string;
  /** Operations to perform */
  operations: (ImageOperation | VideoOperation)[];
  /** Job status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Progress (0-100) */
  progress: number;
  /** Error message */
  error?: string;
  /** Created at */
  createdAt: Date;
  /** Completed at */
  completedAt?: Date;
  /** Processing time (ms) */
  processingTime?: number;
}

export interface MediaInfo {
  /** File path */
  path: string;
  /** Media type */
  type: MediaType;
  /** Format */
  format: string;
  /** Duration (for video/audio) */
  duration?: number;
  /** Width (for image/video) */
  width?: number;
  /** Height (for image/video) */
  height?: number;
  /** Bitrate */
  bitrate?: number;
  /** File size in bytes */
  size: number;
  /** Codec */
  codec?: string;
  /** Frame rate (for video) */
  fps?: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

export interface ThumbnailOptions {
  /** Timestamp for video (e.g., '00:00:05') */
  timestamp?: string;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  /** Format */
  format?: ImageFormat;
  /** Quality (1-100) */
  quality?: number;
}

export interface ProcessingResult {
  /** Success status */
  success: boolean;
  /** Output file path */
  outputPath?: string;
  /** Processing time (ms) */
  processingTime: number;
  /** File size */
  size?: number;
  /** Error message */
  error?: string;
}
