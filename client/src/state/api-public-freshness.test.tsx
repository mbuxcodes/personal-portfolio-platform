import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { baseApi, CACHE_FRESHNESS } from '@/data-access';
import { publicSkillsResponse } from '@/data-access/fixtures';
import { apiUrl, mockServer, recordRequests, startMockServer } from '@/data-access/mocks';
import { createAppStore } from './store';

/*
 * BR-006: a change to public content appears on the next visitor load. So a public read is asked
 * again every time a page mounts it, and its data is dropped as soon as no page uses it
 * (API_DESIGN.md Section 8.9, ARCHITECTURE_DESIGN.md Section 6.5).
 */
startMockServer();

const publicApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    skills: builder.query<{ data: unknown[] }, void>({ query: () => 'skills' }),
  }),
});

function setup() {
  const store = createAppStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, wrapper };
}

describe('public read freshness', () => {
  it('declares the rule once, for every read', () => {
    expect(CACHE_FRESHNESS).toEqual({ keepUnusedDataFor: 0, refetchOnMountOrArgChange: true });
  });

  it('asks the server again when a page mounts a read that another component already holds', async () => {
    const { wrapper } = setup();
    const requests = recordRequests();

    const header = renderHook(() => publicApi.useSkillsQuery(), { wrapper });
    await waitFor(() => expect(header.result.current.isSuccess).toBe(true));
    expect(requests.count('GET', 'skills')).toBe(1);

    // The header stays mounted. A page now mounts the same read: it must not trust the cache.
    const page = renderHook(() => publicApi.useSkillsQuery(), { wrapper });
    await waitFor(() => expect(requests.count('GET', 'skills')).toBe(2));
    await waitFor(() => expect(page.result.current.isFetching).toBe(false));
  });

  it('shows a change the server made since the last visit, not the earlier answer', async () => {
    const { wrapper } = setup();

    const first = renderHook(() => publicApi.useSkillsQuery(), { wrapper });
    await waitFor(() => expect(first.result.current.data).toEqual(publicSkillsResponse));
    first.unmount();

    const changed = { data: [{ category: 'Changed group', skills: [] }] };
    mockServer.use(http.get(apiUrl('skills'), () => HttpResponse.json(changed)));

    const second = renderHook(() => publicApi.useSkillsQuery(), { wrapper });
    await waitFor(() => expect(second.result.current.data).toEqual(changed));
  });

  it('drops the data when no page uses it, so it is never shown as fresh later', async () => {
    const { store, wrapper } = setup();

    const page = renderHook(() => publicApi.useSkillsQuery(), { wrapper });
    await waitFor(() => expect(page.result.current.isSuccess).toBe(true));
    expect(Object.keys(store.getState().api.queries)).toHaveLength(1);

    page.unmount();

    await waitFor(() => expect(store.getState().api.queries).toEqual({}));
  });

  it('starts every page load with an empty cache', () => {
    const { store } = setup();

    expect(store.getState().api.queries).toEqual({});
  });
});
