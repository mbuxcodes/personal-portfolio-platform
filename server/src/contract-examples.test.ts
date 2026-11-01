import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  InvalidCredentialsError,
  NotFoundError,
  PublishRequirementsNotMetError,
  SessionExpiredError,
  SignInTemporarilyBlockedError,
  UnauthenticatedError,
  ValidationFailedError,
  type ApplicationError,
} from '#utils/application-error';
import { buildPaginationMeta } from '#utils/pagination';
import { sendItem, sendList, sendPage } from '#utils/response';
import { validateInput } from '#utils/validation';
import { API_BASE_PATH } from './route-groups.js';
import { createPipelineApp } from '../test/pipeline-app.js';

/**
 * The examples of API_DESIGN.md that fix the shape of a response, each sent through the real
 * application and compared with the contract. Only the request identifier is matched by form,
 * because the server creates it.
 */
const REQUEST_ID = expect.stringMatching(/^req_[0-9a-f]+$/);

function createAppWith(
  routes: Record<string, () => unknown>,
  respond: Record<string, (res: Parameters<typeof sendItem>[0]) => void> = {},
) {
  return createPipelineApp({
    registerRoutes: ({ publicRoutes }) => {
      for (const [path, run] of Object.entries(routes)) {
        publicRoutes.get(path, () => {
          run();
        });
      }
      for (const [path, send] of Object.entries(respond)) {
        publicRoutes.get(path, (_req, res) => void send(res));
      }
    },
  }).app;
}

const throwing = (error: ApplicationError | Error) => () => {
  throw error;
};

describe('Section 8.2: standard success response', () => {
  it('matches the example', async () => {
    const app = createAppWith(
      {},
      {
        '/skill': (res) =>
          sendItem(res, {
            id: 'e5f6a7b8c9d0e1f2a3b4c5d6',
            name: 'TypeScript',
            category: 'Languages',
            level: 'advanced',
            createdAt: '2026-10-20T09:40:00Z',
            updatedAt: '2026-10-20T09:40:00Z',
          }),
      },
    );

    const response = await request(app).get(`${API_BASE_PATH}/skill`).expect(200);

    expect(response.body).toEqual({
      data: {
        id: 'e5f6a7b8c9d0e1f2a3b4c5d6',
        name: 'TypeScript',
        category: 'Languages',
        level: 'advanced',
        createdAt: '2026-10-20T09:40:00Z',
        updatedAt: '2026-10-20T09:40:00Z',
      },
    });
  });
});

describe('Section 8.3 and 8.6: standard error response and not found', () => {
  it('matches the example', async () => {
    const app = createAppWith({ '/gone': throwing(new NotFoundError()) });

    const response = await request(app).get(`${API_BASE_PATH}/gone`).expect(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'We could not find what you were looking for.',
        requestId: REQUEST_ID,
      },
    });
    expect(Object.keys(response.body.error)).toEqual(['code', 'message', 'requestId']);
  });

  it('is identical for an address that never existed, a draft, and a removed record', async () => {
    const app = createAppWith({
      '/draft': throwing(new NotFoundError()),
      '/removed': throwing(new NotFoundError()),
    });

    const bodies = [
      (await request(app).get(`${API_BASE_PATH}/never-existed`)).body,
      (await request(app).get(`${API_BASE_PATH}/draft`)).body,
      (await request(app).get(`${API_BASE_PATH}/removed`)).body,
    ];

    const withoutId = bodies.map(({ error }) => ({ ...error, requestId: undefined }));
    expect(withoutId[1]).toEqual(withoutId[0]);
    expect(withoutId[2]).toEqual(withoutId[0]);
  });
});

describe('Section 8.4: validation error', () => {
  const details = [
    { field: 'roleTitle', code: 'REQUIRED', message: 'Role title is required.' },
    {
      field: 'endDate',
      code: 'END_BEFORE_START',
      message: 'The end date cannot be before the start date.',
    },
    {
      field: 'technologies[2]',
      code: 'TOO_LONG',
      message: 'Each technology must be 50 characters or fewer.',
    },
  ] as const;

  it('matches the example, field by field', async () => {
    const app = createAppWith({ '/invalid': throwing(new ValidationFailedError(details)) });

    const response = await request(app).get(`${API_BASE_PATH}/invalid`).expect(422);

    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Please correct the highlighted fields.',
        details,
        requestId: REQUEST_ID,
      },
    });
    expect(Object.keys(response.body.error)).toEqual(['code', 'message', 'details', 'requestId']);
  });

  it('is what the validation helper produces for the same problems', () => {
    const experience = z.strictObject({
      roleTitle: z.string().trim().min(1),
      technologies: z.array(z.string().max(50, 'Each technology must be 50 characters or fewer.')),
    });
    const period = z
      .strictObject({ startDate: z.iso.date(), endDate: z.iso.date() })
      .refine((value) => value.endDate >= value.startDate, {
        path: ['endDate'],
        message: 'The end date cannot be before the start date.',
        params: { code: 'END_BEFORE_START' },
      });
    const detailsOf = (run: () => unknown) => {
      try {
        run();
      } catch (error) {
        return (error as ApplicationError).details;
      }
      return undefined;
    };

    expect(
      detailsOf(() =>
        validateInput('body', experience, { technologies: ['a', 'b', 'x'.repeat(51)] }),
      ),
    ).toEqual([details[0], details[2]]);
    expect(
      detailsOf(() =>
        validateInput('body', period, { startDate: '2026-05-01', endDate: '2026-01-01' }),
      ),
    ).toEqual([details[1]]);
  });
});

describe('Section 8.5: unauthorized', () => {
  it.each([
    [new UnauthenticatedError(), 'UNAUTHENTICATED', 'Please sign in to continue.'],
    [new SessionExpiredError(), 'SESSION_EXPIRED', 'Your session has ended. Please sign in again.'],
  ])('matches the example for %s', async (error, code, message) => {
    const app = createAppWith({ '/private': throwing(error) });

    const response = await request(app).get(`${API_BASE_PATH}/private`).expect(401);

    expect(response.body).toEqual({ error: { code, message, requestId: REQUEST_ID } });
  });
});

describe('Section 8.7: internal error', () => {
  it('matches the example, whatever went wrong', async () => {
    const app = createAppWith({
      '/bug': throwing(new RangeError('Maximum call stack size exceeded in /srv/app/x.ts')),
    });

    const response = await request(app).get(`${API_BASE_PATH}/bug`).expect(500);

    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side. Please try again.',
        requestId: REQUEST_ID,
      },
    });
  });
});

describe('Section 5.3: sign-in errors', () => {
  it('matches the example for wrong credentials', async () => {
    const app = createAppWith({ '/login-failed': throwing(new InvalidCredentialsError()) });

    const response = await request(app).get(`${API_BASE_PATH}/login-failed`).expect(401);

    expect(response.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'The email or password is incorrect.',
        requestId: REQUEST_ID,
      },
    });
  });

  it('matches the example for a temporary block, in the body and in the header', async () => {
    const app = createAppWith({ '/blocked': throwing(new SignInTemporarilyBlockedError(900)) });

    const response = await request(app).get(`${API_BASE_PATH}/blocked`).expect(429);

    expect(response.body).toEqual({
      error: {
        code: 'SIGN_IN_TEMPORARILY_BLOCKED',
        message: 'Too many failed attempts. Please try again later.',
        retryAfterSeconds: 900,
        requestId: REQUEST_ID,
      },
    });
    expect(Object.keys(response.body.error)).toEqual([
      'code',
      'message',
      'retryAfterSeconds',
      'requestId',
    ]);
    expect(response.headers['retry-after']).toBe('900');
  });
});

describe('Section 7.2: publish requirements', () => {
  it('matches the example, naming every missing item', async () => {
    const details = [
      {
        field: 'problemContext',
        code: 'MISSING_FOR_PUBLISH',
        message: 'Describe the problem or context.',
      },
      { field: 'role', code: 'MISSING_FOR_PUBLISH', message: 'Describe your role.' },
      { field: 'outcome', code: 'MISSING_FOR_PUBLISH', message: 'Describe the outcome.' },
      { field: 'images', code: 'MISSING_FOR_PUBLISH', message: 'Add a cover image.' },
    ] as const;
    const app = createAppWith({
      '/publish': throwing(
        new PublishRequirementsNotMetError(details, {
          message: 'This project cannot be published yet. Complete the missing items first.',
        }),
      ),
    });

    const response = await request(app).get(`${API_BASE_PATH}/publish`).expect(422);

    expect(response.body).toEqual({
      error: {
        code: 'PUBLISH_REQUIREMENTS_NOT_MET',
        message: 'This project cannot be published yet. Complete the missing items first.',
        details,
        requestId: REQUEST_ID,
      },
    });
  });
});

describe('Section 9.3 and 6.3: collections', () => {
  it('matches the paginated example', async () => {
    const app = createAppWith(
      {},
      {
        '/messages': (res) =>
          sendPage(
            res,
            [
              {
                id: 'b2c3d4e5f6a7b8c9d0e1f2a3',
                senderName: 'Jamie Lee',
                subject: 'Project enquiry',
                status: 'new',
                createdAt: '2026-10-19T14:05:00Z',
              },
            ],
            buildPaginationMeta({ page: 1, pageSize: 20, totalItems: 37 }),
          ),
      },
    );

    const response = await request(app).get(`${API_BASE_PATH}/messages`).expect(200);

    expect(response.body).toEqual({
      data: [
        {
          id: 'b2c3d4e5f6a7b8c9d0e1f2a3',
          senderName: 'Jamie Lee',
          subject: 'Project enquiry',
          status: 'new',
          createdAt: '2026-10-19T14:05:00Z',
        },
      ],
      meta: { pagination: { page: 1, pageSize: 20, totalItems: 37, totalPages: 2 } },
    });
  });

  it('matches the unpaginated example, where the total counts skills and not groups', async () => {
    const app = createAppWith(
      {},
      {
        '/skills': (res) =>
          sendList(
            res,
            [
              {
                category: 'Languages',
                skills: [
                  { name: 'JavaScript', level: 'expert' },
                  { name: 'TypeScript', level: 'advanced' },
                ],
              },
              { category: 'Tools', skills: [{ name: 'Git', level: null }] },
            ],
            3,
          ),
      },
    );

    const response = await request(app).get(`${API_BASE_PATH}/skills`).expect(200);

    expect(response.body).toEqual({
      data: [
        {
          category: 'Languages',
          skills: [
            { name: 'JavaScript', level: 'expert' },
            { name: 'TypeScript', level: 'advanced' },
          ],
        },
        { category: 'Tools', skills: [{ name: 'Git', level: null }] },
      ],
      meta: { totalItems: 3 },
    });
  });
});

describe('Section 12: malformed requests', () => {
  function createAppForRequests() {
    return createPipelineApp({
      config: { bodyLimits: { jsonBytes: 100, multipartBytes: 200 } },
      registerRoutes: ({ publicRoutes }) => {
        publicRoutes.post('/submit', (_req, res) => void res.status(201).end());
      },
    }).app;
  }

  it.each([
    ['invalid JSON', 400, 'MALFORMED_REQUEST', '{"a":', 'application/json'],
    ['a wrong content type', 415, 'UNSUPPORTED_CONTENT_TYPE', 'a=1', 'text/plain'],
    [
      'an oversized body',
      413,
      'REQUEST_TOO_LARGE',
      JSON.stringify({ a: 'x'.repeat(200) }),
      'application/json',
    ],
  ] as const)('%s is %i %s', async (_name, status, code, body, contentType) => {
    const response = await request(createAppForRequests())
      .post(`${API_BASE_PATH}/submit`)
      .set('Content-Type', contentType)
      .send(body);

    expect(response.status).toBe(status);
    expect(response.body).toEqual({
      error: { code, message: expect.any(String), requestId: REQUEST_ID },
    });
  });
});

describe('Section 8.8: Retry-After', () => {
  it('is sent with a 429 from the rate limit, with the standard body', async () => {
    const { app } = createPipelineApp({
      config: {
        rateLimits: {
          publicRead: { max: 1, windowSeconds: 60 },
          contact: { max: 1000, windowSeconds: 60 },
          signIn: { max: 1000, windowSeconds: 60 },
          renewal: { max: 1000, windowSeconds: 60 },
          admin: { max: 1000, windowSeconds: 60 },
          upload: { max: 1000, windowSeconds: 60 },
        },
      },
    });
    await request(app).get(`${API_BASE_PATH}/anything`);

    const response = await request(app).get(`${API_BASE_PATH}/anything`).expect(429);

    expect(response.headers['retry-after']).toMatch(/^\d+$/);
    expect(response.body).toEqual({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please wait a moment and try again.',
        requestId: REQUEST_ID,
      },
    });
  });
});
