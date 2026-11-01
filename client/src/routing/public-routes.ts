import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { PUBLIC_ROUTE_TABLE, type PublicRouteName } from './public-route-table';

/**
 * How each public page is loaded. Every page is its own chunk, fetched when its address is
 * opened (ARCHITECTURE_DESIGN.md Sections 6.3 and 17.1). The table below must list every
 * name in the route table, which the type enforces.
 */
const pageLoaders: Record<PublicRouteName, () => Promise<ComponentType>> = {
  home: () => import('@/features/public/home').then((module) => module.HomePage),
  about: () => import('@/features/public/about').then((module) => module.AboutPage),
  skills: () => import('@/features/public/skills').then((module) => module.SkillsPage),
  experience: () => import('@/features/public/experience').then((module) => module.ExperiencePage),
  education: () => import('@/features/public/education').then((module) => module.EducationPage),
  certifications: () =>
    import('@/features/public/certifications').then((module) => module.CertificationsPage),
  projects: () => import('@/features/public/projects').then((module) => module.ProjectsListPage),
  projectDetail: () =>
    import('@/features/public/projects').then((module) => module.ProjectDetailPage),
  blog: () => import('@/features/public/blog').then((module) => module.BlogListPage),
  article: () => import('@/features/public/blog').then((module) => module.ArticlePage),
  contact: () => import('@/features/public/contact').then((module) => module.ContactPage),
};

/** The public routes, built from the public route table. */
export const publicRoutes: RouteObject[] = PUBLIC_ROUTE_TABLE.map(({ name, path }) => ({
  path,
  // The function form of `lazy` is used because React Router removes loaded properties
  // from the object form, which would change this shared definition.
  lazy: async () => ({ Component: await pageLoaders[name]() }),
}));
