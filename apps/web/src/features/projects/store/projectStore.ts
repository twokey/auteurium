/**
 * Project cache and state management
 * Provides client-side caching and optimistic updates for projects
 */

import { create } from 'zustand'
import type { Project } from '../../../types'

interface ProjectState {
  // Cache
  projects: Project[]
  recentlyViewedIds: string[]
  lastFetchTime: number | null
  
  // Actions
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  addRecentlyViewed: (projectId: string) => void
  clearCache: () => void
  isCacheStale: (maxAge?: number) => boolean
}

const MAX_RECENTLY_VIEWED = 10
const DEFAULT_CACHE_TTL = 60000 // 1 minute

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial State
  projects: [],
  recentlyViewedIds: [],
  lastFetchTime: null,
  
  // Actions
  setProjects: (projects) =>
    set({ 
      projects,
      lastFetchTime: Date.now()
    }),
    
  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
      lastFetchTime: Date.now()
    })),
    
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
      lastFetchTime: Date.now()
    })),
    
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      recentlyViewedIds: state.recentlyViewedIds.filter((viewedId) => viewedId !== id),
      lastFetchTime: Date.now()
    })),
    
  addRecentlyViewed: (projectId) =>
    set((state) => {
      const filtered = state.recentlyViewedIds.filter((id) => id !== projectId)
      const updated = [projectId, ...filtered].slice(0, MAX_RECENTLY_VIEWED)
      return { recentlyViewedIds: updated }
    }),
    
  clearCache: () =>
    set({
      projects: [],
      recentlyViewedIds: [],
      lastFetchTime: null
    }),
    
  isCacheStale: (maxAge = DEFAULT_CACHE_TTL) => {
    const { lastFetchTime } = get()
    if (!lastFetchTime) return true
    return Date.now() - lastFetchTime > maxAge
  },
}))



