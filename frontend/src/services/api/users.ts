import { fetcher } from "./client";

export interface SearchUserResult {
  id: string;
  username: string;
  email: string;
}

export const usersApi = {
  searchUsers: (query: string): Promise<SearchUserResult[]> => {
    return fetcher<SearchUserResult[]>(`/users/search?q=${encodeURIComponent(query)}`);
  },
};
