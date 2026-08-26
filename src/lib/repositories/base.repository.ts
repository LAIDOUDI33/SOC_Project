/**
 * National SOC Platform - Base Repository
 * Algeria 2026-2030 | Generic Repository Pattern
 * 
 * Provides common CRUD operations and query building
 * for all SOC entities with production-ready error handling
 */

import { Prisma, db, paginate, PaginatedResult, PaginationParams } from '../db'
import { SOCError, ErrorCode } from '../errors'

export interface BaseFilters {
  search?: string
  startDate?: Date
  endDate?: Date
  status?: string | string[]
  createdBy?: string
}

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

/**
 * Base repository class with common operations
 * All entity-specific repositories extend this class
 */
export abstract class BaseRepository<T extends BaseEntity> {
  protected modelName: string
  
  constructor(modelName: string) {
    this.modelName = modelName
  }

  /**
   * Find a single record by ID
   */
  async findById(
    id: string,
    include?: Prisma.IncludeEnumerable
  ): Promise<T | null> {
    try {
      const record = await (this.modelName as any).findUnique({
        where: { id },
        include
      })
      return record as T
    } catch (error) {
      throw this.handleError(error, 'findById')
    }
  }

  /**
   * Find multiple records with filters and pagination
   */
  async findMany(
    filters: BaseFilters & PaginationParams & Record<string, any>,
    include?: Prisma.IncludeEnumerable
  ): Promise<PaginatedResult<T>> {
    try {
      const where = this.buildWhereClause(filters)
      
      return paginate({
        count: () => (this.modelName as any).count({ where }),
        findMany: (args) => (this.modelName as any).findMany({
          ...args,
          where,
          include
        })
      }, filters)
    } catch (error) {
      throw this.handleError(error, 'findMany')
    }
  }

  /**
   * Create a new record
   */
  async create(data: any, createdBy?: string): Promise<T> {
    try {
      const record = await (this.modelName as any).create({
        data: {
          ...data,
          ...(createdBy && { createdBy })
        }
      })
      return record as T
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new SOCError(
            ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
            `Record already exists with unique field`,
            { model: this.modelName, data }
          )
        }
      }
      throw this.handleError(error, 'create')
    }
  }

  /**
   * Update an existing record by ID
   */
  async update(id: string, data: any, updatedBy?: string): Promise<T> {
    try {
      const record = await (this.modelName as any).update({
        where: { id },
        data: {
          ...data,
          ...(updatedBy && { updatedBy })
        }
      })
      return record as T
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new SOCError(ErrorCode.NOT_FOUND, `${this.modelName} not found`, { id })
        }
      }
      throw this.handleError(error, 'update')
    }
  }

  /**
   * Soft delete a record (sets deletedAt timestamp)
   */
  async softDelete(id: string, deletedBy?: string): Promise<T> {
    return this.update(id, { 
      deletedAt: new Date(),
      ...(deletedBy && { deletedBy })
    } as any)
  }

  /**
   * Permanently delete a record (use with caution)
   */
  async hardDelete(id: string): Promise<void> {
    try {
      await (this.modelName as any).delete({
        where: { id }
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new SOCError(ErrorCode.NOT_FOUND, `${this.modelName} not found`, { id })
        }
      }
      throw this.handleError(error, 'hardDelete')
    }
  }

  /**
   * Restore a soft-deleted record
   */
  async restore(id: string): Promise<T> {
    return this.update(id, { deletedAt: null } as any)
  }

  /**
   * Count records matching filters
   */
  async count(filters?: BaseFilters): Promise<number> {
    try {
      const where = filters ? this.buildWhereClause(filters) : {}
      return (this.modelName as any).count({ where })
    } catch (error) {
      throw this.handleError(error, 'count')
    }
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await (this.modelName as any).count({
      where: { id, deletedAt: null }
    })
    return count > 0
  }

  /**
   * Build where clause from filters
   * Override in subclasses for custom filtering logic
   */
  protected buildWhereClause(filters: BaseFilters & Record<string, any>): any {
    const where: any = {}
    
    // Search across text fields
    if (filters.search) {
      where.OR = this.getSearchFields().map(field => ({
        [field]: { contains: filters.search, mode: 'insensitive' as const }
      }))
    }
    
    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = filters.startDate
      if (filters.endDate) where.createdAt.lte = filters.endDate
    }
    
    // Status filter (supports array)
    if (filters.status) {
      where.status = Array.isArray(filters.status) 
        ? { in: filters.status } 
        : filters.status
    }
    
    // Created by filter
    if (filters.createdBy) {
      where.createdBy = filters.createdBy
    }
    
    return where
  }

  /**
   * Get fields to search in when using search filter
   * Override in subclasses to specify searchable fields
   */
  protected getSearchFields(): string[] {
    return ['id']
  }

  /**
   * Handle errors consistently
   */
  protected handleError(error: unknown, operation: string): never {
    console.error(`[${this.modelName}] ${operation} error:`, error)
    
    if (error instanceof SOCError) {
      throw error
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2001':
          throw new SOCError(ErrorCode.NOT_FOUND, 'Record does not exist', { operation })
        case 'P2002':
          throw new SOCError(ErrorCode.UNIQUE_CONSTRAINT_VIOLATION, 'Unique constraint violation', { operation })
        case 'P2003':
          throw new SOCError(ErrorCode.FOREIGN_KEY_VIOLATION, 'Foreign key constraint violation', { operation })
        case 'P2025':
          throw new SOCError(ErrorCode.NOT_FOUND, 'Record to update not found', { operation })
        default:
          throw new SOCError(ErrorCode.DATABASE_ERROR, `Database error during ${operation}`, { 
            code: error.code,
            meta: error.meta 
          })
      }
    }
    
    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new SOCError(ErrorCode.VALIDATION_ERROR, 'Validation error', { operation, message: error.message })
    }
    
    throw new SOCError(ErrorCode.INTERNAL_ERROR, `Unexpected error during ${operation}`, { 
      originalError: error instanceof Error ? error.message : String(error)
    })
  }
}

export default BaseRepository
