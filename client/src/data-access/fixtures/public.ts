import type { ItemResponse, ListResponse, PaginatedResponse } from '../types/common';
import type {
  ContactConfirmation,
  ContactMessageInput,
  PublicArticleListItem,
  PublicCertification,
  PublicEducation,
  PublicExperience,
  PublicProjectDetail,
  PublicProjectListItem,
  PublicSettings,
  PublicSkillGroup,
} from '../types/public';

/*
 * Public responses copied from the examples in API_DESIGN.md Section 6. Each is the whole
 * response body as sent on the wire, so a mock server can return it unchanged. Where the contract
 * gives no example (the public article detail), there is no fixture: nothing is invented.
 */

/** PUB-SET-01, Section 6.1. */
export const publicSettingsResponse = {
  data: {
    ownerName: 'Alex Morgan',
    headline: 'Full Stack Software Engineer',
    homeIntroduction: 'I build reliable web applications and write about how they are made.',
    aboutNarrative: 'I am a software engineer with a focus on maintainable systems.',
    professionalBackground: 'Five years of building and operating production web applications.',
    profileImage: {
      assetAddress: 'https://media.example.com/portfolio/alex.jpg',
      textAlternative: 'Portrait of Alex Morgan',
      isDecorative: false,
    },
    availabilityStatement: 'Open to full-time roles from January.',
    professionalLinks: [
      { label: 'GitHub', address: 'https://github.com/example' },
      { label: 'LinkedIn', address: 'https://www.linkedin.com/in/example' },
    ],
    publicContactDetails: [{ label: 'Email', value: 'alex@example.com' }],
    siteTitle: 'Alex Morgan, Full Stack Engineer',
    siteDescription: 'Portfolio, projects, and writing by Alex Morgan.',
    defaultShareImage: null,
  },
} satisfies ItemResponse<PublicSettings>;

/** PUB-PRJ-01, Section 6.2. */
export const publicProjectListResponse = {
  data: [
    {
      publicAddressName: 'inventory-tracker',
      title: 'Inventory Tracker',
      summary: 'Stock management for a small warehouse, replacing spreadsheets.',
      coverImage: {
        assetAddress: 'https://media.example.com/portfolio/inventory-cover.jpg',
        textAlternative: 'Dashboard showing current stock levels',
        isDecorative: false,
      },
      technologies: ['TypeScript', 'React', 'Node.js', 'MongoDB'],
    },
  ],
  meta: {
    pagination: { page: 1, pageSize: 12, totalItems: 1, totalPages: 1 },
  },
} satisfies PaginatedResponse<PublicProjectListItem>;

/** PUB-PRJ-02, Section 6.2. */
export const publicProjectDetailResponse = {
  data: {
    publicAddressName: 'inventory-tracker',
    title: 'Inventory Tracker',
    summary: 'Stock management for a small warehouse, replacing spreadsheets.',
    coverImage: {
      assetAddress: 'https://media.example.com/portfolio/inventory-cover.jpg',
      textAlternative: 'Dashboard showing current stock levels',
      isDecorative: false,
    },
    technologies: ['TypeScript', 'React', 'Node.js', 'MongoDB'],
    problemContext: 'A warehouse tracked stock in shared spreadsheets, causing frequent errors.',
    role: 'Sole developer, responsible for design and delivery.',
    keyDecisions: 'Chose a simple audit trail over full versioning to keep scope small.',
    outcome: 'Stock discrepancies fell sharply within the first quarter.',
    liveProjectLink: 'https://inventory.example.com',
    sourceCodeLink: 'https://github.com/example/inventory-tracker',
    periodStart: '2025-02-01',
    periodEnd: '2025-06-30',
    images: [
      {
        assetAddress: 'https://media.example.com/portfolio/inventory-cover.jpg',
        textAlternative: 'Dashboard showing current stock levels',
        isDecorative: false,
        isCover: true,
      },
    ],
  },
} satisfies ItemResponse<PublicProjectDetail>;

/** PUB-SKL-01, Section 6.3. */
export const publicSkillsResponse = {
  data: [
    {
      category: 'Languages',
      skills: [
        { name: 'JavaScript', level: 'expert' },
        { name: 'TypeScript', level: 'advanced' },
      ],
    },
    {
      category: 'Tools',
      skills: [{ name: 'Git', level: null }],
    },
  ],
  meta: { totalItems: 3 },
} satisfies ListResponse<PublicSkillGroup>;

/** PUB-EXP-01, Section 6.4. */
export const publicExperienceResponse = {
  data: [
    {
      roleTitle: 'Software Engineer',
      organization: 'Northwind Systems',
      location: 'Remote',
      startDate: '2023-03-01',
      endDate: null,
      isCurrent: true,
      summary: 'Backend and web development for a logistics platform.',
      responsibilities: ['Designed order-tracking features', 'Maintained deployment pipeline'],
      achievements: ['Reduced page load time by 40 percent'],
      technologies: ['Node.js', 'TypeScript', 'MongoDB'],
    },
  ],
  meta: { totalItems: 1 },
} satisfies ListResponse<PublicExperience>;

/** PUB-EDU-01, Section 6.5. */
export const publicEducationResponse = {
  data: [
    {
      institution: 'State University',
      qualification: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science',
      startDate: '2017-09-01',
      endDate: '2021-06-30',
      isInProgress: false,
      description: 'Graduated with honors.',
    },
  ],
  meta: { totalItems: 1 },
} satisfies ListResponse<PublicEducation>;

/** PUB-CRT-01, Section 6.6. */
export const publicCertificationsResponse = {
  data: [
    {
      name: 'Cloud Practitioner',
      issuingOrganization: 'Example Certification Body',
      issueDate: '2024-05-10',
      expiryDate: '2027-05-10',
      isExpired: false,
      credentialId: 'ABC-12345',
      verificationLink: 'https://verify.example.com/ABC-12345',
    },
  ],
  meta: { totalItems: 1 },
} satisfies ListResponse<PublicCertification>;

/** PUB-ART-01, Section 6.7. */
export const publicArticleListResponse = {
  data: [
    {
      publicAddressName: 'designing-for-maintainability',
      title: 'Designing for Maintainability',
      summary: 'What I learned keeping a production application healthy for three years.',
      coverImage: null,
      publishedAt: '2026-09-14T08:00:00Z',
    },
  ],
  meta: {
    pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
  },
} satisfies PaginatedResponse<PublicArticleListItem>;

/** PUB-MSG-01 request body, Section 6.8. */
export const contactMessageInput = {
  senderName: 'Jamie Lee',
  senderEmail: 'jamie@example.com',
  subject: 'Project enquiry',
  messageText: 'Hello, I would like to discuss a contract web project.',
} satisfies ContactMessageInput;

/** PUB-MSG-01 success, `201`, Section 6.8. */
export const contactConfirmationResponse = {
  data: { received: true },
} satisfies ItemResponse<ContactConfirmation>;
