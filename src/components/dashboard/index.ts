/**
 * Dashboard Components Index
 * 
 * Re-exports all dashboard components for easy importing.
 * This provides a clean API for composing the main dashboard page.
 */

export { DashboardHeader } from './DashboardHeader'
export { DashboardSidebar, socModules, moduleRoutes, subModuleRoutes, type Module } from './DashboardSidebar'
export { SS7MonitoringPanel } from './SS7MonitoringPanel'
export { WelcomeBanner } from './WelcomeBanner'
export { DashboardAccessCards } from './DashboardAccessCards'
export { MetricCards } from './MetricCards'
export { FeaturedModules } from './FeaturedModules'
export { SystemHealthPanel } from './SystemHealthPanel'

// Default exports for convenience
export { default as DashboardHeaderDefault } from './DashboardHeader'
export { default as DashboardSidebarDefault } from './DashboardSidebar'
export { default as SS7MonitoringPanelDefault } from './SS7MonitoringPanel'
export { default as WelcomeBannerDefault } from './WelcomeBanner'
export { default as DashboardAccessCardsDefault } from './DashboardAccessCards'
export { default as MetricCardsDefault } from './MetricCards'
export { default as FeaturedModulesDefault } from './FeaturedModules'
export { default as SystemHealthPanelDefault } from './SystemHealthPanel'
