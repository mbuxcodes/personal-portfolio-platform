/*
 * What visitors receive. Source: API_DESIGN.md Section 6.
 *
 * Public responses never include `id`, `status`, `isFeatured`, `createdAt`, `updatedAt`,
 * `assetId`, or any internal field (Section 6). Public lists are keyed by `publicAddressName`
 * where it exists (ARCHITECTURE_DESIGN.md Section 6.5).
 */
import type { IsoDate, IsoTimestamp, SkillLevel } from './common';

/** Section 6.0. `textAlternative` is `null` only if the image is decorative. */
export interface PublicImage {
  assetAddress: string;
  textAlternative: string | null;
  isDecorative: boolean;
}

/** Images in a project's `images` list also say whether they are the cover (Section 6.0). */
export interface PublicProjectImage extends PublicImage {
  isCover: boolean;
}

export interface PublicProfessionalLink {
  label: string;
  address: string;
}

export interface PublicContactDetail {
  label: string;
  value: string;
}

/** PUB-SET-01 (Section 6.1). */
export interface PublicSettings {
  ownerName: string;
  headline: string;
  homeIntroduction: string | null;
  aboutNarrative: string | null;
  professionalBackground: string | null;
  profileImage: PublicImage | null;
  availabilityStatement: string | null;
  professionalLinks: PublicProfessionalLink[];
  publicContactDetails: PublicContactDetail[];
  siteTitle: string | null;
  siteDescription: string | null;
  defaultShareImage: PublicImage | null;
}

/** PUB-PRJ-01 list item (Section 6.2). */
export interface PublicProjectListItem {
  publicAddressName: string;
  title: string;
  summary: string;
  coverImage: PublicImage;
  technologies: string[];
}

/** PUB-PRJ-02 detail: every list field plus the fields below (Section 6.2). */
export interface PublicProjectDetail extends PublicProjectListItem {
  problemContext: string;
  role: string;
  keyDecisions: string | null;
  outcome: string;
  liveProjectLink: string | null;
  sourceCodeLink: string | null;
  periodStart: IsoDate | null;
  periodEnd: IsoDate | null;
  images: PublicProjectImage[];
}

export interface PublicSkill {
  name: string;
  level: SkillLevel | null;
}

/** PUB-SKL-01: skills grouped by category (Section 6.3). */
export interface PublicSkillGroup {
  category: string;
  skills: PublicSkill[];
}

/** PUB-EXP-01 (Section 6.4). `isCurrent` is derived from an empty `endDate`. */
export interface PublicExperience {
  roleTitle: string;
  organization: string;
  location: string | null;
  startDate: IsoDate;
  endDate: IsoDate | null;
  isCurrent: boolean;
  summary: string | null;
  responsibilities: string[];
  achievements: string[];
  technologies: string[];
}

/** PUB-EDU-01 (Section 6.5). `isInProgress` is derived from an empty `endDate`. */
export interface PublicEducation {
  institution: string;
  qualification: string;
  fieldOfStudy: string;
  startDate: IsoDate;
  endDate: IsoDate | null;
  isInProgress: boolean;
  description: string | null;
}

/** PUB-CRT-01 (Section 6.6). `isExpired` is derived by the server. */
export interface PublicCertification {
  name: string;
  issuingOrganization: string;
  issueDate: IsoDate;
  expiryDate: IsoDate | null;
  isExpired: boolean;
  credentialId: string | null;
  verificationLink: string | null;
}

/** PUB-ART-01 list item (Section 6.7). */
export interface PublicArticleListItem {
  publicAddressName: string;
  title: string;
  summary: string;
  coverImage: PublicImage | null;
  publishedAt: IsoTimestamp;
}

/**
 * PUB-ART-02 detail: every list field plus the fields below (Section 6.7). `body` is one string
 * of formatted content. Its format is open (API_DESIGN.md OI-1), so it is not interpreted here.
 */
export interface PublicArticleDetail extends PublicArticleListItem {
  body: string;
  lastEditedAt: IsoTimestamp | null;
}

/** PUB-MSG-01 request body (Section 6.8). */
export interface ContactMessageInput {
  senderName: string;
  senderEmail: string;
  subject?: string;
  messageText: string;
}

/** PUB-MSG-01 success: `201`. It deliberately holds no identifier (Section 6.8). */
export interface ContactConfirmation {
  received: boolean;
}
