import type {
  AdminArticle,
  AdminMessage,
  AdminMessageListItem,
  AdminProject,
  AdminSkill,
  ArticleBodyImage,
  DashboardOverview,
  MessageStatusInput,
  ProjectCreateInput,
  StatusChangeInput,
} from '../types/admin';
import type { AuthUser, LoginInput, LoginResult } from '../types/auth';
import type { ItemResponse, PaginatedResponse } from '../types/common';

/*
 * Authentication and admin examples copied from API_DESIGN.md Sections 5, 7 and 9.3. Each is typed
 * against the contract types, so a field that drifts from the document fails type-check.
 */

/** AUTH-01 request, Section 5.3. */
export const loginInput = {
  email: 'owner@example.com',
  password: 'correct-horse-battery-staple',
} satisfies LoginInput;

/** AUTH-01 success, Section 5.3. */
export const loginResponse = {
  data: {
    user: {
      id: 'a1b2c3d4e5f6a7b8c9d0e1f2',
      email: 'owner@example.com',
    },
  },
} satisfies ItemResponse<LoginResult>;

/** AUTH-04 success, Section 5.4. */
export const currentUserResponse = {
  data: {
    id: 'a1b2c3d4e5f6a7b8c9d0e1f2',
    email: 'owner@example.com',
  },
} satisfies ItemResponse<AuthUser>;

/** ADM-DSH-01, Section 7.1. */
export const dashboardResponse = {
  data: {
    contentCounts: {
      projects: { total: 6, published: 5, draft: 1 },
      skills: { total: 24 },
      experience: { total: 3 },
      education: { total: 2 },
      certifications: { total: 4 },
      articles: { total: 8, published: 7, draft: 1 },
    },
    messages: {
      newCount: 2,
      recent: [
        {
          id: 'b2c3d4e5f6a7b8c9d0e1f2a3',
          senderName: 'Jamie Lee',
          subject: 'Project enquiry',
          status: 'new',
          createdAt: '2026-10-19T14:05:00Z',
        },
      ],
    },
    areaLastChanged: [
      { area: 'projects', lastChangedAt: '2026-10-12T10:00:00Z' },
      { area: 'skills', lastChangedAt: '2026-08-30T09:00:00Z' },
      { area: 'experience', lastChangedAt: '2026-05-02T16:20:00Z' },
      { area: 'education', lastChangedAt: '2025-11-01T12:00:00Z' },
      { area: 'certifications', lastChangedAt: '2026-06-18T08:45:00Z' },
      { area: 'blog', lastChangedAt: '2026-10-01T07:30:00Z' },
      { area: 'settings', lastChangedAt: '2026-09-21T11:10:00Z' },
    ],
    pendingDrafts: [
      {
        type: 'article',
        id: 'c3d4e5f6a7b8c9d0e1f2a3b4',
        title: 'Notes on Testing Strategy',
        updatedAt: '2026-10-10T18:00:00Z',
      },
    ],
  },
} satisfies ItemResponse<DashboardOverview>;

/** ADM-PRJ-02 request, Section 7.2.1. */
export const projectCreateInput = {
  title: 'Inventory Tracker',
  summary: 'Stock management for a small warehouse, replacing spreadsheets.',
  technologies: ['TypeScript', 'React', 'Node.js', 'MongoDB'],
  isFeatured: false,
} satisfies ProjectCreateInput;

/** ADM-PRJ-02 success, `201`, Section 7.2.1. */
export const adminProjectResponse = {
  data: {
    id: 'd4e5f6a7b8c9d0e1f2a3b4c5',
    publicAddressName: 'inventory-tracker',
    title: 'Inventory Tracker',
    summary: 'Stock management for a small warehouse, replacing spreadsheets.',
    problemContext: null,
    role: null,
    keyDecisions: null,
    outcome: null,
    technologies: ['TypeScript', 'React', 'Node.js', 'MongoDB'],
    liveProjectLink: null,
    sourceCodeLink: null,
    periodStart: null,
    periodEnd: null,
    images: [],
    status: 'draft',
    isFeatured: false,
    publishedAt: null,
    createdAt: '2026-10-20T09:30:00Z',
    updatedAt: '2026-10-20T09:30:00Z',
  },
} satisfies ItemResponse<AdminProject>;

/** ADM-PRJ-06 request, Section 7.2.1. */
export const publishProjectInput = { status: 'published' } satisfies StatusChangeInput;

/** ADM-SKL-02 success, Section 7.3. */
export const adminSkillResponse = {
  data: {
    id: 'e5f6a7b8c9d0e1f2a3b4c5d6',
    name: 'TypeScript',
    category: 'Languages',
    level: 'advanced',
    createdAt: '2026-10-20T09:40:00Z',
    updatedAt: '2026-10-20T09:40:00Z',
  },
} satisfies ItemResponse<AdminSkill>;

/** ADM-ART-03, Section 7.7.1. */
export const adminArticleResponse = {
  data: {
    id: 'f6a7b8c9d0e1f2a3b4c5d6e7',
    publicAddressName: 'designing-for-maintainability',
    title: 'Designing for Maintainability',
    summary: 'What I learned keeping a production application healthy for three years.',
    body: 'Maintainability is a product decision as much as a technical one...',
    coverImage: null,
    status: 'published',
    publishedAt: '2026-09-14T08:00:00Z',
    lastEditedAt: '2026-10-02T12:15:00Z',
    createdAt: '2026-09-10T17:00:00Z',
    updatedAt: '2026-10-02T12:15:00Z',
  },
} satisfies ItemResponse<AdminArticle>;

/** ADM-MSG-02, Section 7.8. */
export const adminMessageResponse = {
  data: {
    id: 'b2c3d4e5f6a7b8c9d0e1f2a3',
    senderName: 'Jamie Lee',
    senderEmail: 'jamie@example.com',
    subject: 'Project enquiry',
    messageText: 'Hello, I would like to discuss a contract web project.',
    status: 'new',
    createdAt: '2026-10-19T14:05:00Z',
    updatedAt: '2026-10-19T14:05:00Z',
  },
} satisfies ItemResponse<AdminMessage>;

/** ADM-MSG-03 request, Section 7.8. */
export const messageStatusInput = { status: 'replied' } satisfies MessageStatusInput;

/** ADM-MSG-01, Section 9.3: a paginated list with more than one page. */
export const adminMessageListResponse = {
  data: [
    {
      id: 'b2c3d4e5f6a7b8c9d0e1f2a3',
      senderName: 'Jamie Lee',
      subject: 'Project enquiry',
      status: 'new',
      createdAt: '2026-10-19T14:05:00Z',
    },
  ],
  meta: {
    pagination: { page: 1, pageSize: 20, totalItems: 37, totalPages: 2 },
  },
} satisfies PaginatedResponse<AdminMessageListItem>;

/** ADM-ART-11 success, Section 7.10. */
export const articleBodyImageResponse = {
  data: {
    assetId: 'portfolio/articles/ab12cd34',
    assetAddress: 'https://media.example.com/portfolio/articles/ab12cd34.png',
    textAlternative: 'Diagram of the request flow',
    isDecorative: false,
  },
} satisfies ItemResponse<ArticleBodyImage>;
