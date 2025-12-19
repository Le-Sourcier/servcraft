import { Router } from 'express';
import type { Request, Response } from 'express';
import type { MediaProcessingService } from './media-processing.service.js';
import type { ImageOperation, VideoOperation, MediaType, ThumbnailOptions } from './types.js';

/**
 * Create media processing routes
 */
export function createMediaProcessingRoutes(mediaService: MediaProcessingService): Router {
  const router = Router();

  /**
   * Process image
   * POST /image
   */
  router.post('/image', async (req: Request, res: Response) => {
    const { source, output, operations } = req.body as {
      source: string;
      output: string;
      operations: ImageOperation[];
    };

    const result = await mediaService.processImage(source, output, operations);
    res.json(result);
  });

  /**
   * Process video
   * POST /video
   */
  router.post('/video', async (req: Request, res: Response) => {
    const { source, output, operations } = req.body as {
      source: string;
      output: string;
      operations: VideoOperation[];
    };

    const result = await mediaService.processVideo(source, output, operations);
    res.json(result);
  });

  /**
   * Create processing job
   * POST /jobs
   */
  router.post('/jobs', async (req: Request, res: Response) => {
    const { mediaType, source, output, operations } = req.body as {
      mediaType: MediaType;
      source: string;
      output: string;
      operations: (ImageOperation | VideoOperation)[];
    };

    const job = await mediaService.createJob(mediaType, source, output, operations);
    res.status(201).json(job);
  });

  /**
   * Get job status
   * GET /jobs/:id
   */
  router.get('/jobs/:id', async (req: Request, res: Response) => {
    const job = await mediaService.getJob(req.params.id);

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json(job);
  });

  /**
   * Get media info
   * POST /info
   */
  router.post('/info', async (req: Request, res: Response) => {
    const { filePath } = req.body as { filePath: string };

    if (!filePath) {
      res.status(400).json({ error: 'filePath is required' });
      return;
    }

    const info = await mediaService.getMediaInfo(filePath);
    res.json(info);
  });

  /**
   * Generate thumbnail
   * POST /thumbnail
   */
  router.post('/thumbnail', async (req: Request, res: Response) => {
    const { source, output, options } = req.body as {
      source: string;
      output: string;
      options?: ThumbnailOptions;
    };

    const result = await mediaService.generateThumbnail(source, output, options);
    res.json(result);
  });

  return router;
}
