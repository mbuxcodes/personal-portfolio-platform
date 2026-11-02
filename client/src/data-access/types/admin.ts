/*
 * What the Admin sends and receives. Source: API_DESIGN.md Section 7.
 *
 * Admin responses return the full record, including `id`, `createdAt` and `updatedAt`
 * (Section 7). The read-only fields (`id`, `createdAt`, `updatedAt`, `publicAddressName`,
 * `publishedAt`, `lastEditedAt`, `status`) are never part of a request type: sending one is
 * `422 READ_ONLY` (Section 7.0).
 */
import type { IsoDate, IsoTimestamp, SkillLevel } from './common';
import type { PublicContactDetail, PublicProfessionalLink } from './public';

/** Publication state, changed only by the status endpoints (AP-9). */
export type PublicationStatus = 'draft' | 'published';

/** Section 7.8. */
export type MessageStatus = 'new' | 'read' | 'replied' | 'archived';

/** An image as the Admin sees it. `assetId` identifies it within its parent (Section 7.10). */
export interface AdminImage {
  assetId: string;
  assetAddress: string;
  textAlternative: string | null;
  isDecorative: boolean;
}

export interface AdminProjectImage extends AdminImage {
  isCover: boolean;
}

/** PUT status endpoints, projects and articles (ADM-PRJ-06, ADM-ART-06). */
export interface StatusChangeInput {
  status: PublicationStatus;
}

/** The text part of an image change (ADM-ART-09, ADM-SET-04, ADM-SET-07). */
export interface ImageDetailsInput {
  textAlternative?: string | null;
  isDecorative?: boolean;
}

/** ADM-PRJ-09 also sets or clears the cover (Section 7.2). */
export interface ProjectImageDetailsInput extends ImageDetailsInput {
  isCover?: boolean;
}

/* ---------------------------------- Dashboard (7.1) ---------------------------------- */

export interface PublishableCounts {
  total: number;
  published: number;
  draft: number;
}

export interface TotalCount {
  total: number;
}

export type DashboardArea =
  'projects' | 'skills' | 'experience' | 'education' | 'certifications' | 'blog' | 'settings';

export interface DashboardMessage {
  id: string;
  senderName: string;
  subject: string | null;
  status: MessageStatus;
  createdAt: IsoTimestamp;
}

export interface DashboardPendingDraft {
  type: 'project' | 'article';
  id: string;
  title: string;
  updatedAt: IsoTimestamp;
}

/** ADM-DSH-01. Every value is derived at the time of the request. */
export interface DashboardOverview {
  contentCounts: {
    projects: PublishableCounts;
    skills: TotalCount;
    experience: TotalCount;
    education: TotalCount;
    certifications: TotalCount;
    articles: PublishableCounts;
  };
  messages: {
    newCount: number;
    recent: DashboardMessage[];
  };
  areaLastChanged: { area: DashboardArea; lastChangedAt: IsoTimestamp }[];
  pendingDrafts: DashboardPendingDraft[];
}

/* ---------------------------------- Projects (7.2) ---------------------------------- */

/** ADM-PRJ-01 list item. */
export interface AdminProjectListItem {
  id: string;
  publicAddressName: string;
  title: string;
  status: PublicationStatus;
  isFeatured: boolean;
  updatedAt: IsoTimestamp;
}

/** The admin project representation (Section 7.2.1). */
export interface AdminProject {
  id: string;
  publicAddressName: string;
  title: string;
  summary: string | null;
  problemContext: string | null;
  role: string | null;
  keyDecisions: string | null;
  outcome: string | null;
  technologies: string[];
  liveProjectLink: string | null;
  sourceCodeLink: string | null;
  periodStart: IsoDate | null;
  periodEnd: IsoDate | null;
  images: AdminProjectImage[];
  status: PublicationStatus;
  isFeatured: boolean;
  publishedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** ADM-PRJ-02. Only `title` is required (Section 7.2.1). */
export interface ProjectCreateInput {
  title: string;
  summary?: string | null;
  problemContext?: string | null;
  role?: string | null;
  keyDecisions?: string | null;
  outcome?: string | null;
  technologies?: string[];
  liveProjectLink?: string | null;
  sourceCodeLink?: string | null;
  periodStart?: IsoDate | null;
  periodEnd?: IsoDate | null;
  isFeatured?: boolean;
}

/** ADM-PRJ-04. Provided fields change, omitted fields do not, `null` clears (Section 7.0). */
export type ProjectUpdateInput = Partial<ProjectCreateInput>;

/* ---------------------------------- Skills (7.3) ---------------------------------- */

export interface AdminSkill {
  id: string;
  name: string;
  category: string;
  level: SkillLevel | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** ADM-SKL-02. `name` and `category` are required. */
export interface SkillCreateInput {
  name: string;
  category: string;
  level?: SkillLevel | null;
}

export type SkillUpdateInput = Partial<SkillCreateInput>;

/* ---------------------------------- Experience (7.4) ---------------------------------- */

export interface AdminExperience {
  id: string;
  roleTitle: string;
  organization: string;
  location: string | null;
  startDate: IsoDate;
  endDate: IsoDate | null;
  summary: string | null;
  responsibilities: string[];
  achievements: string[];
  technologies: string[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** ADM-EXP-02. `roleTitle`, `organization` and `startDate` are required. */
export interface ExperienceCreateInput {
  roleTitle: string;
  organization: string;
  location?: string | null;
  startDate: IsoDate;
  endDate?: IsoDate | null;
  summary?: string | null;
  responsibilities?: string[];
  achievements?: string[];
  technologies?: string[];
}

export type ExperienceUpdateInput = Partial<ExperienceCreateInput>;

/* ---------------------------------- Education (7.5) ---------------------------------- */

export interface AdminEducation {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy: string;
  startDate: IsoDate;
  endDate: IsoDate | null;
  description: string | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** ADM-EDU-02. `institution`, `qualification`, `fieldOfStudy` and `startDate` are required. */
export interface EducationCreateInput {
  institution: string;
  qualification: string;
  fieldOfStudy: string;
  startDate: IsoDate;
  endDate?: IsoDate | null;
  description?: string | null;
}

export type EducationUpdateInput = Partial<EducationCreateInput>;

/* ------------------------------- Certifications (7.6) ------------------------------- */

/** `isExpired` is not part of the admin representation and is never writable (Section 7.6). */
export interface AdminCertification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: IsoDate;
  expiryDate: IsoDate | null;
  credentialId: string | null;
  verificationLink: string | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** ADM-CRT-02. `name`, `issuingOrganization` and `issueDate` are required. */
export interface CertificationCreateInput {
  name: string;
  issuingOrganization: string;
  issueDate: IsoDate;
  expiryDate?: IsoDate | null;
  credentialId?: string | null;
  verificationLink?: string | null;
}

export type CertificationUpdateInput = Partial<CertificationCreateInput>;

/* ---------------------------------- Articles (7.7) ---------------------------------- */

/** ADM-ART-01 list item. */
export interface AdminArticleListItem {
  id: string;
  title: string;
  status: PublicationStatus;
  publishedAt: IsoTimestamp | null;
  updatedAt: IsoTimestamp;
}

/** The admin article representation (Section 7.7.1). */
export interface AdminArticle {
  id: string;
  publicAddressName: string;
  title: string;
  summary: string | null;
  body: string | null;
  coverImage: AdminImage | null;
  status: PublicationStatus;
  publishedAt: IsoTimestamp | null;
  lastEditedAt: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** ADM-ART-02. Only `title` is required (Section 7.7.1). */
export interface ArticleCreateInput {
  title: string;
  summary?: string | null;
  body?: string | null;
}

export type ArticleUpdateInput = Partial<ArticleCreateInput>;

/** ADM-ART-11 success. Provisional, see API_DESIGN.md OI-1. */
export type ArticleBodyImage = AdminImage;

/* ---------------------------------- Messages (7.8) ---------------------------------- */

/** ADM-MSG-01 list item. */
export interface AdminMessageListItem {
  id: string;
  senderName: string;
  subject: string | null;
  status: MessageStatus;
  createdAt: IsoTimestamp;
}

/** ADM-MSG-02: the full message. */
export interface AdminMessage extends AdminMessageListItem {
  senderEmail: string;
  messageText: string;
  updatedAt: IsoTimestamp;
}

/** ADM-MSG-03. Only the status can change (Section 7.8). */
export interface MessageStatusInput {
  status: MessageStatus;
}

/* ---------------------------------- Settings (7.9) ---------------------------------- */

/** ADM-SET-01: the public fields plus image management fields. */
export interface AdminSettings {
  id: string;
  ownerName: string;
  headline: string;
  homeIntroduction: string | null;
  aboutNarrative: string | null;
  professionalBackground: string | null;
  profileImage: AdminImage | null;
  availabilityStatement: string | null;
  professionalLinks: PublicProfessionalLink[];
  publicContactDetails: PublicContactDetail[];
  siteTitle: string | null;
  siteDescription: string | null;
  defaultShareImage: AdminImage | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** ADM-SET-02. List fields are replaced as a whole when provided (Section 7.9). */
export interface SettingsUpdateInput {
  ownerName?: string;
  headline?: string;
  homeIntroduction?: string | null;
  aboutNarrative?: string | null;
  professionalBackground?: string | null;
  availabilityStatement?: string | null;
  professionalLinks?: PublicProfessionalLink[];
  publicContactDetails?: PublicContactDetail[];
  siteTitle?: string | null;
  siteDescription?: string | null;
}
