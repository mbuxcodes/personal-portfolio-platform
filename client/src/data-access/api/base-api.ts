import { createApi } from '@reduxjs/toolkit/query/react';
import { TAG_TYPES } from '../tags/tag-types';
import { CACHE_FRESHNESS } from './api-config';
import { createRenewingBaseQuery } from './base-query';

/**
 * The one RTK Query API of the application (TD-007, ADR-09).
 *
 * It has NO endpoints of its own. Each feature adds the ones it uses from its own `api/` folder
 * with `baseApi.injectEndpoints`, so endpoint definitions live with the feature that needs them
 * (ARCHITECTURE_DESIGN.md Section 6.2, TD-049) and all of them share one cache, one renewal, and
 * one error shape:
 *
 *     export const projectsApi = baseApi.injectEndpoints({
 *       endpoints: (builder) => ({
 *         getProjects: builder.query<PublicProjectListItem[], void>({
 *           query: () => 'projects',
 *           providesTags: (result) => providesList('Project', result),
 *         }),
 *       }),
 *     });
 *
 * Every mutation must declare `invalidatesTags` (see `tags/tag-helpers.ts`).
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: createRenewingBaseQuery(),
  tagTypes: TAG_TYPES,
  endpoints: () => ({}),
  ...CACHE_FRESHNESS,
});
