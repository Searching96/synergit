import { fetcher } from './client';
import type { RepoEvent } from '../../types';

export const eventsService = {
  getRepoEvents: async (repoId: string, eventType?: string, page = 1, pageSize = 20) => {
    let url = `/repos/${repoId}/activity?page=${page}&pageSize=${pageSize}`;
    if (eventType) {
      url += `&event_type=${eventType}`;
    }
    return await fetcher<RepoEvent[]>(url);
  },
};
