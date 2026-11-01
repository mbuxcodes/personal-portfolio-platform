/**
 * The admin area's code boundary.
 *
 * Admin routes load this module with a dynamic import, so Vite emits it, and everything
 * only it imports, as one separate chunk. Visitors to the public site never download it
 * (ADR-02). Nothing in the main bundle may import this file, or any admin feature,
 * statically.
 */
export { AccountPage, SignInPage } from '@/features/admin/authentication';
export { ArticlesManagementPage } from '@/features/admin/articles';
export { CertificationsManagementPage } from '@/features/admin/certifications';
export { DashboardPage } from '@/features/admin/dashboard';
export { EducationManagementPage } from '@/features/admin/education';
export { ExperienceManagementPage } from '@/features/admin/experience';
export { MessagesPage } from '@/features/admin/messages';
export { ProjectsManagementPage } from '@/features/admin/projects';
export { SettingsPage } from '@/features/admin/settings';
export { SkillsManagementPage } from '@/features/admin/skills';
