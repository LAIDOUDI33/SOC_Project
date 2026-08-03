/**
 * Djezzy SOC Platform - Batch Processing for High-Volume Operations
 * 
 * Efficient batch processing utilities:
 * - Event ingestion batching
 * - Database write batching
 * - API request batching
 * - Memory-efficient stream processing
 */

// ============================================================
// TYPES
// ============================================================

interface BatchOptions<T> {
  /** Maximum items per batch */
  batchSize: number;
  /** Maximum time to wait before flushing (ms) */
  flushIntervalMs: number;
  /** Maximum concurrent batches */
  maxConcurrentBatches: number;
  /** Process function for each batch */
  processor: (batch: T[], batchId: string) => Promise<BatchResult>;
  /** Called after successful processing */
  onSuccess?: (result: BatchResult, batch: T[]) => void;
  /** Called on processing failure */
  onError?: (error: Error, batch: T[]) => void | Promise<void>;
  /** Retry configuration */
  retry?: {
    maxRetries: number;
    retryDelayMs: number;
    backoffMultiplier: number;
  };
}

interface BatchResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  durationMs: number;
  errors?: Error[];
}

interface BatchProcessorStats {
  totalItemsProcessed: number;
  totalBatchesCompleted: number;
  totalBatchesFailed: number;
  averageBatchProcessingTimeMs: number;
  currentQueueSize: number;
  activeBatches: number;
}

// ============================================================
// BATCH PROCESSOR CLASS
// ============================================================

export class BatchProcessor<T> {
  private options: Required<BatchOptions<T>>;
  private queue: T[] = [];
  private activeBatches = new Set<string>();
  private flushTimer: NodeJS.Timeout | null = null;
  private batchCounter = 0;
  private stats: BatchProcessorStats = this.initializeStats();
  private isDraining = false;

  constructor(options: BatchOptions<T>) {
    this.options = {
      ...options,
      retry: {
        maxRetries: 3,
        retryDelayMs: 100,
        backoffMultiplier: 2,
        ...options.retry,
      },
    };

    // Start automatic flush interval
    this.startFlushTimer();
  }

  /**
   * Add item(s) to the batch queue
   */
  async add(item: T): Promise<void>;
  async add(items: T[]): Promise<void>;
  async add(itemOrItems: T | T[]): Promise<void> {
    const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    
    if (this.isDraining) {
      throw new Error('Cannot add items while processor is draining');
    }

    this.queue.push(...items);
    this.stats.currentQueueSize = this.queue.length;

    // Auto-flush if batch size reached
    if (this.queue.length >= this.options.batchSize) {
      await this.flush();
    }
  }

  /**
   * Force flush all queued items
   */
  async flush(): Promise<BatchResult[]> {
    if (this.queue.length === 0) {
      return [];
    }

    // Take all items from queue
    const batchItems = this.queue.splice(0);
    this.stats.currentQueueSize = this.queue.length;

    return this.processBatch(batchItems);
  }

  /**
   * Process a single batch with retries
   */
  private async processBatch(items: T[]): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    
    // Split into sub-batches if needed
    const subBatches = this.splitIntoSubBatches(items);

    // Process batches respecting concurrency limit
    const processingQueue = [...subBatches];
    const activePromises: Promise<BatchResult>[] = [];

    while (processingQueue.length > 0 || activePromises.length > 0) {
      // Fill up to max concurrent
      while (
        activePromises.length < this.options.maxConcurrentBatches &&
        processingQueue.length > 0
      ) {
        const subBatch = processingQueue.shift()!;
        const batchId = `batch_${++this.batchCounter}_${Date.now()}`;
        
        this.activeBatches.add(batchId);
        this.stats.activeBatches = this.activeBatches.size;

        const promise = this.executeWithRetry(subBatch, batchId)
          .finally(() => {
            this.activeBatches.delete(batchId);
            this.stats.activeBatches = this.activeBatches.size;
          });

        activePromises.push(promise);
      }

      // Wait for at least one to complete
      if (activePromises.length > 0) {
        const result = await Promise.race(activePromises);
        results.push(result);
        
        // Remove completed promise
        const idx = activePromises.findIndex(
          p => p === result || (p as any).then && false
        );
        if (idx > -1) {
          activePromises.splice(idx, 1);
        }
      }
    }

    return results;
  }

  /**
   * Execute batch with retry logic
   */
  private async executeWithRetry(
    items: T[],
    batchId: string,
    attempt: number = 0
  ): Promise<BatchResult> {
    const startTime = Date.now();

    try {
      const result = await this.options.processor(items, batchId);
      
      // Update stats
      result.durationMs = Date.now() - startTime;
      this.updateStats(result);

      if (result.success) {
        this.options.onSuccess?.(result, items);
      } else if (result.errors?.length) {
        throw result.errors[0];
      }

      return result;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < this.options.retry.maxRetries) {
        const delay = this.options.retry.retryDelayMs * 
          Math.pow(this.options.retry.backoffMultiplier, attempt);
        
        console.warn(`[BatchProcessor] Retrying ${batchId} (attempt ${attempt + 1})`);
        await this.delay(delay);
        
        return this.executeWithRetry(items, batchId, attempt + 1);
      }

      // All retries exhausted
      console.error(`[BatchProcessor] Failed ${batchId} after ${attempt + 1} attempts:`, err);
      
      const failedResult: BatchResult = {
        success: false,
        processedCount: 0,
        failedCount: items.length,
        durationMs: Date.now() - startTime,
        errors: [err],
      };

      this.stats.totalBatchesFailed++;
      
      try {
        await this.options.onError?.(err, items);
      } catch (handlerError) {
        console.error('[BatchProcessor] Error handler failed:', handlerError);
      }

      return failedResult;
    }
  }

  /**
   * Drain processor and wait for completion
   */
  async drain(): Promise<BatchResult[]> {
    this.isDraining = true;
    this.stopFlushTimer();
    
    // Flush remaining items
    const results = await this.flush();

    // Wait for active batches to complete
    while (this.activeBatches.size > 0) {
      await this.delay(50);
    }

    this.isDraining = false;
    return results;
  }

  /**
   * Get current statistics
   */
  getStats(): BatchProcessorStats {
    return { ...this.stats };
  }

  /**
   * Destroy the processor (cleanup)
   */
  destroy(): void {
    this.stopFlushTimer();
    this.queue = [];
    this.isDraining = true;
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private initializeStats(): BatchProcessorStats {
    return {
      totalItemsProcessed: 0,
      totalBatchesCompleted: 0,
      totalBatchesFailed: 0,
      averageBatchProcessingTimeMs: 0,
      currentQueueSize: 0,
      activeBatches: 0,
    };
  }

  private splitIntoSubBatches(items: T[]): T[][] {
    const subBatches: T[][] = [];
    
    for (let i = 0; i < items.length; i += this.options.batchSize) {
      subBatches.push(items.slice(i, i + this.options.batchSize));
    }

    return subBatches;
  }

  private startFlushTimer(): void {
    if (typeof window !== 'undefined') return; // Not needed in browser

    this.flushTimer = setInterval(async () => {
      if (this.queue.length > 0) {
        await this.flush();
      }
    }, this.options.flushIntervalMs);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private updateStats(result: BatchResult): void {
    this.stats.totalItemsProcessed += result.processedCount;
    this.stats.totalBatchesCompleted++;

    // Running average of processing time
    const alpha = 0.1;
    this.stats.averageBatchProcessingTimeMs =
      this.stats.averageBatchProcessingTimeMs * (1 - alpha) +
      result.durationMs * alpha;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// SPECIALIZED BATCH PROCESSORS
// ============================================================

/**
 * Create an event ingestion batch processor
 * Optimized for high-volume security event ingestion
 */
export function createEventIngestionProcessor(
  ingestFn: (events: any[]) => Promise<{ accepted: number; rejected: number }>
): BatchProcessor<any> {
  return new BatchProcessor({
    batchSize: 100,           // 100 events per batch
    flushIntervalMs: 100,     // Flush every 100ms (10 batches/sec)
    maxConcurrentBatches: 20,  // High concurrency for throughput
    
    async processor(events, batchId) {
      const startTime = Date.now();
      
      try {
        const result = await ingestFn(events);
        
        return {
          success: true,
          processedCount: result.accepted,
          failedCount: result.rejected,
          durationMs: Date.now() - startTime,
        };
      } catch (error) {
        return {
          success: false,
          processedCount: 0,
          failedCount: events.length,
          durationMs: Date.now() - startTime,
          errors: [error as Error],
        };
      }
    },

    retry: {
      maxRetries: 3,
      retryDelayMs: 50,
      backoffMultiplier: 2,
    },

    onSuccess(result, events) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Ingestion] Batch ${events.length} events (${result.processedCount} accepted)`);
      }
    },

    onError(error, events) {
      console.error(`[Ingestion] Failed to process ${events.length} events:`, error.message);
    },
  });
}

/**
 * Create a database write batch processor
 * Optimized for bulk database operations
 */
export function createDatabaseWriteProcessor<T>(
  model: string,
  prisma: any,
  options?: {
    batchSize?: number;
    conflictHandling?: 'skip' | 'update' | 'error';
  }
): BatchProcessor<T> {
  return new BatchProcessor<T>({
    batchSize: options?.batchSize ?? 500,
    flushIntervalMs: 1000,
    maxConcurrentBatches: 5,

    async processor(items, batchId) {
      const startTime = Date.now();

      try {
        // Use createMany for bulk inserts
        const methodName = `${model}.createMany`;
        const result = await prisma[methodName]({
          data: items,
          skipDuplicates: options?.conflictHandling === 'skip',
        });

        return {
          success: true,
          processedCount: result.count,
          failedCount: 0,
          durationMs: Date.now() - startTime,
        };
      } catch (error) {
        // Fallback to individual creates if bulk fails
        let processed = 0;
        const errors: Error[] = [];

        for (const item of items) {
          try {
            await prisma[model].create({ data: item });
            processed++;
          } catch (e) {
            errors.push(e as Error);
          }
        }

        return {
          success: errors.length === 0,
          processedCount: processed,
          failedCount: errors.length,
          durationMs: Date.now() - startTime,
          errors: errors.length > 0 ? errors : undefined,
        };
      }
    },

    retry: {
      maxRetries: 2,
      retryDelayMs: 200,
      backoffMultiplier: 2,
    },
  });
}

/**
 * Stream processor for large datasets
 * Processes items in chunks without loading everything into memory
 */
export async function* streamProcessor<T>(
  source: AsyncIterable<T>,
  processor: (chunk: T[]) => Promise<void>,
  chunkSize: number = 100
): AsyncGenerator<{ processed: number; total: number }, void, unknown> {
  let chunk: T[] = [];
  let totalProcessed = 0;
  let totalCount = 0;

  for await (const item of source) {
    totalCount++;
    chunk.push(item);

    if (chunk.length >= chunkSize) {
      await processor(chunk);
      totalProcessed += chunk.length;
      yield { processed: totalProcessed, total: totalCount };
      chunk = [];
    }
  }

  // Process remaining items
  if (chunk.length > 0) {
    await processor(chunk);
    totalProcessed += chunk.length;
    yield { processed: totalProcessed, total: totalCount };
  }
}

// Export types
export type { BatchOptions, BatchResult, BatchProcessorStats };
