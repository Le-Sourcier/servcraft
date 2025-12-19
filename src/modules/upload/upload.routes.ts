import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Readable } from 'stream';
import type { AuthService } from '../auth/auth.service.js';
import { createAuthMiddleware } from '../auth/auth.middleware.js';
import { commonResponses, idParam } from '../swagger/index.js';
import { getUploadService } from './upload.service.js';
import type { MultipartFile, ImageTransformOptions } from './types.js';

// Extend FastifyRequest for multipart support
interface MultipartData {
  filename: string;
  mimetype: string;
  encoding: string;
  file: Readable;
  fields: Record<string, { value?: string }>;
  toBuffer: () => Promise<Buffer>;
}

interface MultipartRequest extends FastifyRequest {
  file: () => Promise<MultipartData | undefined>;
  files: () => AsyncIterableIterator<MultipartData>;
}

const uploadTag = 'Uploads';

const fileResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        originalName: { type: 'string' },
        filename: { type: 'string' },
        mimetype: { type: 'string' },
        size: { type: 'number' },
        url: { type: 'string' },
        provider: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  },
};

export function registerUploadRoutes(app: FastifyInstance, authService: AuthService): void {
  const authenticate = createAuthMiddleware(authService);
  const uploadService = getUploadService();

  // Upload single file
  app.post(
    '/upload',
    {
      preHandler: [authenticate],
      schema: {
        tags: [uploadTag],
        summary: 'Upload a file',
        description: 'Upload a single file. Supports images, PDFs, and other allowed file types.',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        body: {
          type: 'object',
          properties: {
            file: { type: 'string', format: 'binary' },
            folder: { type: 'string', description: 'Optional folder path' },
            isPublic: { type: 'boolean', default: false },
          },
        },
        response: {
          201: fileResponse,
          400: commonResponses.error,
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const multipartRequest = request as MultipartRequest;
      const data = await multipartRequest.file();
      if (!data) {
        return reply.status(400).send({ success: false, message: 'No file provided' });
      }

      const file: MultipartFile = {
        filename: data.filename,
        mimetype: data.mimetype,
        encoding: data.encoding,
        file: data.file,
        toBuffer: () => data.toBuffer(),
      };

      const fields = data.fields as Record<string, { value?: string }>;
      const uploaded = await uploadService.upload(file, {
        folder: fields.folder?.value,
        isPublic: fields.isPublic?.value === 'true',
      });

      return reply.status(201).send({ success: true, data: uploaded });
    }
  );

  // Upload multiple files
  app.post(
    '/upload/multiple',
    {
      preHandler: [authenticate],
      schema: {
        tags: [uploadTag],
        summary: 'Upload multiple files',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        body: {
          type: 'object',
          properties: {
            files: { type: 'array', items: { type: 'string', format: 'binary' } },
            folder: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object' } },
            },
          },
          400: commonResponses.error,
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const multipartRequest = request as MultipartRequest;
      const parts = multipartRequest.files();
      const uploadedFiles: MultipartFile[] = [];

      for await (const part of parts) {
        uploadedFiles.push({
          filename: part.filename,
          mimetype: part.mimetype,
          encoding: part.encoding,
          file: part.file,
          toBuffer: () => part.toBuffer(),
        });
      }

      if (uploadedFiles.length === 0) {
        return reply.status(400).send({ success: false, message: 'No files provided' });
      }

      const results = await uploadService.uploadMultiple(uploadedFiles);
      return reply.status(201).send({ success: true, data: results });
    }
  );

  // Upload image with transformation
  app.post(
    '/upload/image',
    {
      preHandler: [authenticate],
      schema: {
        tags: [uploadTag],
        summary: 'Upload and transform an image',
        description: 'Upload an image with optional resize, format conversion, and effects',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        body: {
          type: 'object',
          properties: {
            file: { type: 'string', format: 'binary' },
            width: { type: 'integer', minimum: 1, maximum: 4096 },
            height: { type: 'integer', minimum: 1, maximum: 4096 },
            fit: { type: 'string', enum: ['cover', 'contain', 'fill', 'inside', 'outside'] },
            format: { type: 'string', enum: ['jpeg', 'png', 'webp', 'avif'] },
            quality: { type: 'integer', minimum: 1, maximum: 100 },
            grayscale: { type: 'boolean' },
          },
        },
        response: {
          201: fileResponse,
          400: commonResponses.error,
          401: commonResponses.unauthorized,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const multipartRequest = request as MultipartRequest;
      const data = await multipartRequest.file();
      if (!data) {
        return reply.status(400).send({ success: false, message: 'No file provided' });
      }

      if (!data.mimetype.startsWith('image/')) {
        return reply.status(400).send({ success: false, message: 'File must be an image' });
      }

      const fields = data.fields as Record<string, { value?: string }>;
      const transform: ImageTransformOptions = {};

      if (fields.width?.value) transform.width = parseInt(fields.width.value);
      if (fields.height?.value) transform.height = parseInt(fields.height.value);
      if (fields.fit?.value) transform.fit = fields.fit.value as ImageTransformOptions['fit'];
      if (fields.format?.value)
        transform.format = fields.format.value as ImageTransformOptions['format'];
      if (fields.quality?.value) transform.quality = parseInt(fields.quality.value);
      if (fields.grayscale?.value) transform.grayscale = fields.grayscale.value === 'true';

      const file: MultipartFile = {
        filename: data.filename,
        mimetype: data.mimetype,
        encoding: data.encoding,
        file: data.file,
        toBuffer: () => data.toBuffer(),
      };

      const uploaded = await uploadService.upload(file, { transform });
      return reply.status(201).send({ success: true, data: uploaded });
    }
  );

  // Get file info
  app.get<{ Params: { id: string } }>(
    '/files/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: [uploadTag],
        summary: 'Get file information',
        security: [{ bearerAuth: [] }],
        params: idParam,
        response: {
          200: fileResponse,
          401: commonResponses.unauthorized,
          404: commonResponses.notFound,
        },
      },
    },
    async (request, reply) => {
      const file = await uploadService.getFile(request.params.id);
      if (!file) {
        return reply.status(404).send({ success: false, message: 'File not found' });
      }
      return reply.send({ success: true, data: file });
    }
  );

  // Get signed URL for private files
  app.get<{ Params: { id: string }; Querystring: { expiresIn?: number } }>(
    '/files/:id/signed-url',
    {
      preHandler: [authenticate],
      schema: {
        tags: [uploadTag],
        summary: 'Get a signed URL for a private file',
        security: [{ bearerAuth: [] }],
        params: idParam,
        querystring: {
          type: 'object',
          properties: {
            expiresIn: { type: 'integer', minimum: 60, maximum: 604800, default: 3600 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          401: commonResponses.unauthorized,
          404: commonResponses.notFound,
        },
      },
    },
    async (request, reply) => {
      const expiresIn = request.query.expiresIn || 3600;
      const url = await uploadService.getSignedUrl(request.params.id, expiresIn);
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      return reply.send({ success: true, data: { url, expiresAt } });
    }
  );

  // Delete file
  app.delete<{ Params: { id: string } }>(
    '/files/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: [uploadTag],
        summary: 'Delete a file',
        security: [{ bearerAuth: [] }],
        params: idParam,
        response: {
          204: { description: 'File deleted' },
          401: commonResponses.unauthorized,
          404: commonResponses.notFound,
        },
      },
    },
    async (request, reply) => {
      await uploadService.deleteFile(request.params.id);
      return reply.status(204).send();
    }
  );
}
