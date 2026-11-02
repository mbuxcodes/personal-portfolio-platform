import { http, HttpResponse, type RequestHandler } from 'msw';
import {
  adminArticleResponse,
  adminMessageListResponse,
  adminMessageResponse,
  adminProjectResponse,
  adminSkillResponse,
  contactConfirmationResponse,
  currentUserResponse,
  dashboardResponse,
  loginResponse,
  notFoundError,
  publicArticleListResponse,
  publicCertificationsResponse,
  publicEducationResponse,
  publicExperienceResponse,
  publicProjectDetailResponse,
  publicProjectListResponse,
  publicSettingsResponse,
  publicSkillsResponse,
} from '../fixtures';
import { apiUrl } from './urls';

/*
 * The default mock API: every endpoint of API_DESIGN.md that has a contract example answers with
 * that example, wrapped exactly as the server wraps it. It is the contract's examples, served.
 * A test that needs something else (an error, a delay) replaces a handler for that test with
 * `mockServer.use(...)`, and the replacement is removed after the test.
 *
 * Endpoints with no example in the contract are not here, so a request to one is reported as
 * unhandled instead of answered with something invented.
 */
export const defaultHandlers: RequestHandler[] = [
  // Authentication (Section 5)
  http.post(apiUrl('auth/login'), () => HttpResponse.json(loginResponse)),
  http.post(apiUrl('auth/refresh'), () => new HttpResponse(null, { status: 204 })),
  http.post(apiUrl('auth/logout'), () => new HttpResponse(null, { status: 204 })),
  http.get(apiUrl('auth/me'), () => HttpResponse.json(currentUserResponse)),

  // Public (Section 6)
  http.get(apiUrl('settings'), () => HttpResponse.json(publicSettingsResponse)),
  http.get(apiUrl('projects'), () => HttpResponse.json(publicProjectListResponse)),
  http.get(apiUrl('projects/:publicAddressName'), ({ params }) =>
    params.publicAddressName === publicProjectDetailResponse.data.publicAddressName
      ? HttpResponse.json(publicProjectDetailResponse)
      : HttpResponse.json(notFoundError, { status: 404 }),
  ),
  http.get(apiUrl('skills'), () => HttpResponse.json(publicSkillsResponse)),
  http.get(apiUrl('experience'), () => HttpResponse.json(publicExperienceResponse)),
  http.get(apiUrl('education'), () => HttpResponse.json(publicEducationResponse)),
  http.get(apiUrl('certifications'), () => HttpResponse.json(publicCertificationsResponse)),
  http.get(apiUrl('articles'), () => HttpResponse.json(publicArticleListResponse)),
  http.post(apiUrl('messages'), () =>
    HttpResponse.json(contactConfirmationResponse, { status: 201 }),
  ),

  // Admin (Section 7)
  http.get(apiUrl('admin/dashboard'), () => HttpResponse.json(dashboardResponse)),
  http.post(apiUrl('admin/projects'), () =>
    HttpResponse.json(adminProjectResponse, { status: 201 }),
  ),
  http.post(apiUrl('admin/skills'), () => HttpResponse.json(adminSkillResponse, { status: 201 })),
  http.get(apiUrl('admin/articles/:id'), () => HttpResponse.json(adminArticleResponse)),
  http.get(apiUrl('admin/messages'), () => HttpResponse.json(adminMessageListResponse)),
  http.get(apiUrl('admin/messages/:id'), () => HttpResponse.json(adminMessageResponse)),
];
