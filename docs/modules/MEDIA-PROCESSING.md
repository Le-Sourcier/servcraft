# Media Processing Module

Image and video processing with job queue support.

## Features

- **Image Processing** - Resize, crop, format conversion
- **Video Processing** - Transcoding, thumbnail extraction
- **Job Queue** - Async processing with status tracking
- **Concurrency Control** - Limit concurrent processing jobs
- **Media Info** - Extract metadata from media files

## Usage

### Configuration

```typescript
import { MediaProcessingService } from 'servcraft/modules/media-processing';

const mediaService = new MediaProcessingService({
  ffmpegPath: '/usr/bin/ffmpeg',
  ffprobePath: '/usr/bin/ffprobe',
  tempDir: './temp',
  maxConcurrent: 3,
  gpuAcceleration: false,
});
```

### Image Processing

```typescript
// Process image with operations
const result = await mediaService.processImage(
  '/uploads/original.jpg',
  '/uploads/processed.jpg',
  [
    { type: 'resize', width: 800, height: 600 },
    { type: 'format', format: 'webp', quality: 85 },
  ]
);

// Result
// {
//   success: true,
//   outputPath: '/uploads/processed.jpg',
//   processingTime: 245
// }
```

### Video Processing

```typescript
const result = await mediaService.processVideo(
  '/uploads/video.mp4',
  '/uploads/video-720p.mp4',
  [
    { type: 'resize', width: 1280, height: 720 },
    { type: 'codec', video: 'h264', audio: 'aac' },
    { type: 'bitrate', video: '2000k', audio: '128k' },
  ]
);
```

### Thumbnail Generation

```typescript
// Generate thumbnail from video
const result = await mediaService.generateThumbnail(
  '/uploads/video.mp4',
  '/uploads/thumbnail.jpg',
  {
    width: 320,
    height: 180,
    time: '00:00:05', // Extract at 5 seconds
  }
);

// Generate thumbnail from image
const imageThumb = await mediaService.generateThumbnail(
  '/uploads/image.jpg',
  '/uploads/thumb.jpg',
  { width: 150, height: 150, fit: 'cover' }
);
```

### Media Info

```typescript
const info = await mediaService.getMediaInfo('/uploads/video.mp4');
// {
//   path: '/uploads/video.mp4',
//   type: 'video',
//   format: 'mp4',
//   size: 15728640,
//   width: 1920,
//   height: 1080,
//   duration: 120.5,
//   bitrate: 1048576,
//   codec: { video: 'h264', audio: 'aac' },
//   fps: 30
// }
```

### Job Queue

```typescript
// Create async job
const job = await mediaService.createJob(
  'video',
  '/uploads/original.mp4',
  '/uploads/processed.mp4',
  [
    { type: 'resize', width: 1280, height: 720 },
    { type: 'format', format: 'mp4' },
  ]
);
// {
//   id: 'job-uuid',
//   status: 'pending',
//   progress: 0,
//   createdAt: Date
// }

// Check job status
const status = await mediaService.getJob(job.id);
// {
//   id: 'job-uuid',
//   status: 'processing', // pending | processing | completed | failed
//   progress: 45,
//   ...
// }

// Poll until complete
while (true) {
  const job = await mediaService.getJob(jobId);
  if (job.status === 'completed' || job.status === 'failed') {
    break;
  }
  await sleep(1000);
}
```

## Image Operations

| Operation | Description | Options |
|-----------|-------------|---------|
| `resize` | Resize image | `width`, `height`, `fit` |
| `crop` | Crop region | `x`, `y`, `width`, `height` |
| `rotate` | Rotate image | `angle` |
| `flip` | Flip image | `direction` (horizontal/vertical) |
| `format` | Convert format | `format`, `quality` |
| `grayscale` | Convert to grayscale | - |
| `blur` | Apply blur | `sigma` |
| `sharpen` | Sharpen image | `sigma` |
| `watermark` | Add watermark | `image`, `position`, `opacity` |

## Video Operations

| Operation | Description | Options |
|-----------|-------------|---------|
| `resize` | Resize video | `width`, `height` |
| `trim` | Trim video | `start`, `end` |
| `codec` | Change codec | `video`, `audio` |
| `bitrate` | Set bitrate | `video`, `audio` |
| `fps` | Change framerate | `fps` |
| `format` | Convert format | `format` |
| `audio` | Audio options | `remove`, `volume` |
| `watermark` | Add watermark | `image`, `position` |

## Configuration Types

```typescript
interface MediaProcessingConfig {
  ffmpegPath?: string;     // Path to ffmpeg
  ffprobePath?: string;    // Path to ffprobe
  tempDir?: string;        // Temporary files directory
  maxConcurrent?: number;  // Max concurrent jobs
  gpuAcceleration?: boolean; // Use GPU acceleration
}

interface ProcessingJob {
  id: string;
  mediaType: 'image' | 'video';
  source: string;
  output: string;
  operations: Operation[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  processingTime?: number;
}

interface ThumbnailOptions {
  width?: number;
  height?: number;
  time?: string;    // For video: timestamp
  fit?: 'cover' | 'contain' | 'fill';
}
```

## Fastify Integration

```typescript
import fastifyMultipart from '@fastify/multipart';

fastify.post('/api/process/image', async (request, reply) => {
  const file = await request.file();
  const { width, height, format } = request.query;

  const inputPath = `/tmp/${file.filename}`;
  const outputPath = `/uploads/processed-${Date.now()}.${format || 'jpg'}`;

  // Save uploaded file
  await saveFile(file, inputPath);

  // Process image
  const operations = [];
  if (width || height) {
    operations.push({ type: 'resize', width: +width, height: +height });
  }
  if (format) {
    operations.push({ type: 'format', format });
  }

  const result = await mediaService.processImage(inputPath, outputPath, operations);

  return result;
});

// Async job endpoint
fastify.post('/api/process/video', async (request, reply) => {
  const { source, operations } = request.body;

  const job = await mediaService.createJob(
    'video',
    source,
    `/uploads/processed-${Date.now()}.mp4`,
    operations
  );

  return { jobId: job.id, status: job.status };
});

// Job status endpoint
fastify.get('/api/jobs/:id', async (request, reply) => {
  const job = await mediaService.getJob(request.params.id);

  if (!job) {
    return reply.status(404).send({ error: 'Job not found' });
  }

  return job;
});
```

## Production Setup

For production, install required libraries:

```bash
# Image processing
npm install sharp

# Video processing
npm install fluent-ffmpeg

# System dependencies
apt-get install ffmpeg  # Ubuntu/Debian
brew install ffmpeg     # macOS
```

## Best Practices

1. **Async Processing** - Use job queue for large files
2. **Temp Cleanup** - Clean up temporary files
3. **Size Limits** - Set appropriate file size limits
4. **Format Validation** - Validate input formats
5. **Error Handling** - Handle processing failures gracefully
6. **Resource Limits** - Control concurrent jobs
