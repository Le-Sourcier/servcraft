/**
 * Upload Repository
 * Prisma-based persistence for file upload metadata
 */
import { Prisma } from '@prisma/client';
import type {
  UploadedFile as PrismaUploadedFile,
  StorageProvider as PrismaProvider,
  PrismaClient,
} from '@prisma/client';
import { logger } from '../../core/logger.js';
import type { UploadedFile, StorageProvider } from './types.js';

// Enum mappings (Prisma UPPERCASE ↔ Application lowercase)
const providerToPrisma: Record<StorageProvider, PrismaProvider> = {
  local: 'LOCAL',
  s3: 'S3',
  cloudinary: 'CLOUDINARY',
  gcs: 'GCS',
};

const providerFromPrisma: Record<PrismaProvider, StorageProvider> = {
  LOCAL: 'local',
  S3: 's3',
  CLOUDINARY: 'cloudinary',
  GCS: 'gcs',
};

export class UploadRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create file metadata record
   */
  async create(data: Omit<UploadedFile, 'createdAt'>): Promise<UploadedFile> {
    const file = await this.prisma.uploadedFile.create({
      data: {
        id: data.id,
        userId: data.userId,
        originalName: data.originalName,
        filename: data.filename,
        mimetype: data.mimetype,
        size: data.size,
        path: data.path,
        url: data.url,
        provider: providerToPrisma[data.provider],
        bucket: data.bucket,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });

    return this.mapFromPrisma(file);
  }

  /**
   * Get file by ID
   */
  async getById(id: string): Promise<UploadedFile | null> {
    const file = await this.prisma.uploadedFile.findUnique({
      where: { id },
    });

    return file ? this.mapFromPrisma(file) : null;
  }

  /**
   * Get files by user ID
   */
  async getByUserId(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<UploadedFile[]> {
    const files = await this.prisma.uploadedFile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    return files.map((f) => this.mapFromPrisma(f));
  }

  /**
   * Get files by provider
   */
  async getByProvider(provider: StorageProvider): Promise<UploadedFile[]> {
    const files = await this.prisma.uploadedFile.findMany({
      where: { provider: providerToPrisma[provider] },
      orderBy: { createdAt: 'desc' },
    });

    return files.map((f) => this.mapFromPrisma(f));
  }

  /**
   * Update file metadata
   */
  async update(
    id: string,
    data: Partial<Pick<UploadedFile, 'url' | 'metadata'>>
  ): Promise<UploadedFile | null> {
    try {
      const updateData: Prisma.UploadedFileUpdateInput = {};

      if (data.url !== undefined) updateData.url = data.url;
      if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.InputJsonValue;

      const file = await this.prisma.uploadedFile.update({
        where: { id },
        data: updateData,
      });

      return this.mapFromPrisma(file);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete file record
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.uploadedFile.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete files by user ID
   */
  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.prisma.uploadedFile.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  /**
   * Delete old files
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.uploadedFile.deleteMany({
      where: { createdAt: { lt: date } },
    });

    logger.info({ count: result.count, olderThan: date }, 'Deleted old file records');
    return result.count;
  }

  /**
   * Get total storage used by user
   */
  async getTotalSizeByUser(userId: string): Promise<number> {
    const result = await this.prisma.uploadedFile.aggregate({
      where: { userId },
      _sum: { size: true },
    });

    return result._sum.size || 0;
  }

  /**
   * Count files by user
   */
  async countByUser(userId: string): Promise<number> {
    return this.prisma.uploadedFile.count({
      where: { userId },
    });
  }

  /**
   * Map Prisma model to application type
   */
  private mapFromPrisma(prismaFile: PrismaUploadedFile): UploadedFile {
    return {
      id: prismaFile.id,
      userId: prismaFile.userId || undefined,
      originalName: prismaFile.originalName,
      filename: prismaFile.filename,
      mimetype: prismaFile.mimetype,
      size: prismaFile.size,
      path: prismaFile.path,
      url: prismaFile.url,
      provider: providerFromPrisma[prismaFile.provider],
      bucket: prismaFile.bucket || undefined,
      metadata: prismaFile.metadata as Record<string, unknown> | undefined,
      createdAt: prismaFile.createdAt,
    };
  }
}
