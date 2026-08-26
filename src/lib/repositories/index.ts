/**
 * National SOC Platform - Repository Index
 * Algeria 2026-2030 | Centralized Repository Exports
 * 
 * All database repositories are exported from this single entry point
 * to ensure consistent access patterns across the application.
 */

// Base repository
export { BaseRepository } from './base.repository'
export type { BaseFilters, PaginatedResult, PaginationParams } from './base.repository'

// Entity repositories
export { alertRepository, AlertRepository } from './alert.repository'
export type { AlertFilters, AlertAggregation, IocMatchResult } from './alert.repository'

export { incidentRepository, IncidentRepository } from './incident.repository'
export type { IncidentFilters, IncidentCreateInput, IncidentTimelineEntry } from './incident.repository'

export { userRepository, UserRepository } from './user.repository'
export type { UserFilters, CreateUserData, ApiKeyCreateData } from './user.repository'

export { threatIntelRepository, ThreatIntelRepository } from './threat-intel.repository'
export type { ThreatIntelFilters, IocMatchResult as ThreatIocMatchResult } from './threat-intel.repository'

export { assetRepository, AssetRepository } from './asset.repository'
export type { AssetFilters, AssetCreateInput } from './asset.repository'

export { auditLogRepository, AuditLogRepository } from './audit-log.repository'
export type { AuditLogFilters, AuditEntry } from './audit-log.repository'

// Re-export database utilities
export {
  db,
  checkDatabaseHealth,
  executeInTransaction,
  buildPagination,
  paginate
} from '../db'

export type { DatabaseHealthStatus } from '../db'
