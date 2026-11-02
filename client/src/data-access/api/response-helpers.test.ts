import { describe, expect, it } from 'vitest';
import { adminMessageListResponse, currentUserResponse, publicSkillsResponse } from '../fixtures';
import { unwrapItem, unwrapList, unwrapPage } from './response-helpers';

describe('response helpers', () => {
  it('unwrapItem returns the record', () => {
    expect(unwrapItem(currentUserResponse)).toEqual(currentUserResponse.data);
  });

  it('unwrapList returns the list', () => {
    expect(unwrapList(publicSkillsResponse)).toBe(publicSkillsResponse.data);
  });

  it('unwrapPage returns the items and the page position', () => {
    const page = unwrapPage(adminMessageListResponse);

    expect(page.items).toBe(adminMessageListResponse.data);
    expect(page.pagination).toEqual({ page: 1, pageSize: 20, totalItems: 37, totalPages: 2 });
  });
});
