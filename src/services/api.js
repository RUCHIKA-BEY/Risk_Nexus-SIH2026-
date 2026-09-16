// src/services/api.js
// Async API service layer - structured for easy swap to real REST endpoints

import {
  executiveKPIs,
  rainTrajectoryData,
  aiInsights,
  projectsRequiringAttention,
  healthByMinistry,
  publicKPIs,
  sectorWiseData,
  costOverviewData,
  physicalProgressData,
  milestoneData,
  projectsOverview,
  filterOptions,
  stateWiseDistribution,
  globalProjects,
  dashboardMetrics,
} from './mockData';

export const simulateDelay = (ms = 800) => new Promise((resolve) => setTimeout(resolve, ms));

// const API_BASE_URL = '/api/v1';

export async function fetchExecutiveKPIs() {
  await simulateDelay();
  // Replace with: return fetch(`${API_BASE_URL}/executive/kpis`).then(r => r.json());
  return executiveKPIs;
}

export async function fetchRainTrajectory() {
  await simulateDelay();
  return rainTrajectoryData;
}

export async function fetchAIInsights() {
  await simulateDelay(200);
  return aiInsights;
}

export async function fetchProjectsRequiringAttention() {
  await simulateDelay();
  return projectsRequiringAttention;
}

export async function fetchHealthByMinistry() {
  await simulateDelay();
  return healthByMinistry;
}

export async function fetchPublicKPIs() {
  await simulateDelay();
  return publicKPIs;
}

export async function fetchSectorWiseData() {
  await simulateDelay();
  return sectorWiseData;
}

export async function fetchCostOverview() {
  await simulateDelay();
  return costOverviewData;
}

export async function fetchPhysicalProgress() {
  await simulateDelay(200);
  return physicalProgressData;
}

export async function fetchMilestoneData() {
  await simulateDelay(200);
  return milestoneData;
}

export async function fetchProjectsOverview() {
  await simulateDelay(400);
  return projectsOverview;
}

export async function fetchFilterOptions() {
  await simulateDelay(100);
  return filterOptions;
}

export async function fetchStateWiseDistribution() {
  await simulateDelay(200);
  return stateWiseDistribution;
}

export async function fetchDashboardMetrics() {
  await simulateDelay(400);
  return dashboardMetrics;
}

export async function fetchGlobalProjects() {
  await simulateDelay(600);
  return globalProjects;
}

export async function fetchProjectStatus() {
  const [kpis, sectors, costs, progress, milestones, projects, filters] = await Promise.all([
    fetchPublicKPIs(),
    fetchSectorWiseData(),
    fetchCostOverview(),
    fetchPhysicalProgress(),
    fetchMilestoneData(),
    fetchProjectsOverview(),
    fetchFilterOptions(),
  ]);
  return { kpis, sectors, costs, progress, milestones, projects, filters };
}

export async function fetchPageData(pageName) {
  await simulateDelay(200);
  return { title: `${pageName} Data`, loadedAt: new Date().toISOString() };
}

export async function fetchProjectDetails(projectId) {
  await simulateDelay(300);
  const project = globalProjects.find(p => p.id === projectId);
  if (!project) {
    throw new Error('Project not found');
  }
  return project;
}
