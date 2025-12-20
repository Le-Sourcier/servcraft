# Upload Module

File upload service with multiple storage providers and image transformation support.

## Features

- **Multiple Providers** - Local, AWS S3, Google Cloud Storage, Cloudinary
- **File Validation** - MIME type and size validation
- **Image Transformation** - Resize, crop, format conversion
- **Signed URLs** - Secure temporary URLs for private files
- **User Storage Tracking** - Track storage usage per user

## Supported Providers

| Provider | Use Case |
|----------|----------|
| Local | Development, simple deployments |
| AWS S3 | Production, scalable storage |
| Google Cloud Storage | GCP infrastructure |
| Cloudinary | Image optimization, transformations |

## Usage

### Configuration

```typescript
import { createUploadService } from 'servcraft/modules/upload';

// Local storage
const uploadService = createUploadService({
  provider: 'local',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  local: {
    uploadDir: './uploads',
    publicPath: '/uploads',
  },
});

// AWS S3
const s3Service = createUploadService({
  provider: 's3',
  maxFileSize: 50 * 1024 * 1024,
  s3: {
    bucket: 'my-bucket',
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Cloudinary
const cloudinaryService = createUploadService({
  provider: 'cloudinary',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    apiSecret: process.env.CLOUDINARY_API_SECRET!,
    folder: 'uploads',
  },
});
```

### Single File Upload

```typescript
// Fastify route example
fastify.post('/upload', async (request, reply) => {
  const file = await request.file();

  const uploaded = await uploadService.upload(file, {
    folder: 'avatars',
    filename: `user-${userId}-avatar`,
    isPublic: true,
  });

  return { url: uploaded.url, id: uploaded.id };
});
```

### Multiple Files Upload

```typescript
fastify.post('/upload-multiple', async (request, reply) => {
  const files = await request.files();
  const fileArray = [];

  for await (const file of files) {
    fileArray.push(file);
  }

  const uploaded = await uploadService.uploadMultiple(fileArray, {
    folder: 'documents',
  });

  return uploaded.map(f => ({ id: f.id, url: f.url }));
});
```

### Image Transformation

```typescript
const uploaded = await uploadService.upload(file, {
  transform: {
    width: 300,
    height: 300,
    fit: 'cover',
    format: 'webp',
    quality: 80,
  },
});
```

### File Management

```typescript
// Get file by ID
const file = await uploadService.getFile(fileId);

// Delete file
await uploadService.deleteFile(fileId);

// Get signed URL (for private files)
const signedUrl = await uploadService.getSignedUrl(fileId, 3600); // 1 hour
```

### User Storage Management

```typescript
// Get user's files
const files = await uploadService.getFilesByUser(userId, {
  limit: 20,
  offset: 0,
});

// Get storage usage
const usage = await uploadService.getUserStorageUsage(userId);
// { totalSize: 15728640, fileCount: 12 }

// Delete all user files
await uploadService.deleteUserFiles(userId);
```

## Configuration Types

```typescript
interface UploadConfig {
  provider: 'local' | 's3' | 'cloudinary' | 'gcs';
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];

  local?: {
    uploadDir: string;
    publicPath: string;
  };

  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };

  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder?: string;
  };

  gcs?: {
    projectId: string;
    bucket: string;
    keyFilename?: string;
  };
}

interface UploadOptions {
  folder?: string;
  filename?: string;
  isPublic?: boolean;
  transform?: ImageTransformOptions;
}

interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
  grayscale?: boolean;
  blur?: number;
}
```

## Response Types

```typescript
interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  provider: string;
  bucket?: string;
  userId?: string;
  createdAt: Date;
}
```

## Fastify Integration

```typescript
import fastifyMultipart from '@fastify/multipart';

// Register multipart
fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Upload route with validation
fastify.post('/api/files', async (request, reply) => {
  const file = await request.file();

  if (!file) {
    return reply.status(400).send({ error: 'No file provided' });
  }

  try {
    const uploaded = await uploadService.upload(file, {
      folder: 'documents',
      isPublic: false,
    });

    return {
      id: uploaded.id,
      url: uploaded.url,
      size: uploaded.size,
      mimetype: uploaded.mimetype,
    };
  } catch (error) {
    if (error.message.includes('File type not allowed')) {
      return reply.status(400).send({ error: error.message });
    }
    throw error;
  }
});
```

## Database Schema

```sql
CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY,
  user_id TEXT,
  original_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  url TEXT NOT NULL,
  provider TEXT NOT NULL,
  bucket TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_uploaded_files_user ON uploaded_files(user_id);
```

## Default Allowed MIME Types

```typescript
[
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/json',
]
```

## Best Practices

1. **Validate on Server** - Always validate file types server-side
2. **Use Signed URLs** - Use signed URLs for sensitive files
3. **Set Size Limits** - Configure appropriate file size limits
4. **Clean Up** - Implement cleanup for orphaned files
5. **CDN** - Use CDN for public files in production
6. **Virus Scanning** - Consider virus scanning for user uploads
