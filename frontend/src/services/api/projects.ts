import { fetcher } from './client';
import type {
  Project,
  ProjectView,
  ProjectItem,
  ProjectItemDTO,
  CreateProjectPayload,
  UpdateProjectPayload,
  CreateProjectViewPayload,
  CreateProjectItemPayload,
  UpdateProjectItemPayload,
} from '../../types';

export const projectsApi = {
  createProject: (payload: CreateProjectPayload) =>
    fetcher<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listProjects: () =>
    fetcher<Project[]>('/projects'),

  getProject: (projectId: string) =>
    fetcher<Project>(`/projects/${projectId}`),

  updateProject: (projectId: string, payload: UpdateProjectPayload) =>
    fetcher<Project>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteProject: (projectId: string) =>
    fetcher<{ message: string }>(`/projects/${projectId}`, {
      method: 'DELETE',
    }),

  createView: (projectId: string, payload: CreateProjectViewPayload) =>
    fetcher<ProjectView>(`/projects/${projectId}/views`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listViews: (projectId: string) =>
    fetcher<ProjectView[]>(`/projects/${projectId}/views`),

  updateView: (projectId: string, viewId: string, payload: CreateProjectViewPayload) =>
    fetcher<ProjectView>(`/projects/${projectId}/views/${viewId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteView: (projectId: string, viewId: string) =>
    fetcher<{ message: string }>(`/projects/${projectId}/views/${viewId}`, {
      method: 'DELETE',
    }),

  addItem: (projectId: string, payload: CreateProjectItemPayload) =>
    fetcher<ProjectItem>(`/projects/${projectId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listItems: (projectId: string) =>
    fetcher<ProjectItemDTO[]>(`/projects/${projectId}/items`),

  updateItem: (projectId: string, itemId: string, payload: UpdateProjectItemPayload) =>
    fetcher<ProjectItem>(`/projects/${projectId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteItem: (projectId: string, itemId: string) =>
    fetcher<{ message: string }>(`/projects/${projectId}/items/${itemId}`, {
      method: 'DELETE',
    }),
};
