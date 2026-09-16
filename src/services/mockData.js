// src/services/mockData.js

export const executiveKPIs = {
  totalProjects: { value: 5, change: 2.3, trend: 'up', period: 'vs previous month' },
  activeProjects: { value: 4, change: 4.2, trend: 'up', period: 'vs previous month' },
  completed: { value: 1, change: 1.5, trend: 'up', period: 'vs previous month' },
  delayed: { value: 2, change: 8.3, trend: 'down', period: 'vs previous month' },
  atRisk: { value: 4, change: 4.8, trend: 'down', period: 'vs previous month' },
  critical: { value: 1, change: 1.8, trend: 'down', period: 'vs previous month' },
};

export const rainTrajectoryData = [
  { month: 'Mar', scheduled: 10, actual: 8, adjusted: 9 },
  { month: 'Apr', scheduled: 15, actual: 12, adjusted: 14 },
  { month: 'May', scheduled: 22, actual: 18, adjusted: 20 },
  { month: 'Jun', scheduled: 30, actual: 25, adjusted: 28 },
  { month: 'Jul', scheduled: 38, actual: 30, adjusted: 35 },
  { month: 'Aug', scheduled: 48, actual: 38, adjusted: 42 },
  { month: 'Sep', scheduled: 55, actual: 42, adjusted: 48 },
];

export const aiInsights = {
  totalInsights: 12,
  confidence: '85%',
  summary: '12 road projects are showing a persistent gap between planned and actual progress over the last 2 reporting cycles.',
  alerts: [
    {
      id: 1,
      type: 'Critical',
      title: 'Large expenditure milestone',
      description: 'Large expenditure milestone approaching: ₹54 Cr for NH-44 expansion expected by Q3 end.',
      time: '2 hours ago',
    },
    {
      id: 2,
      type: 'Medium',
      title: 'Environmental clearance',
      description: 'Environmental monitoring clearance report submission overdue by 12 days.',
      time: '5 hours ago',
    },
    {
      id: 3,
      type: 'Warning',
      title: 'Fund release pending',
      description: 'Fund release amount is below threshold expectation for quarterly review.',
      time: '1 day ago',
    },
  ],
};

export const projectsRequiringAttention = [
  {
    id: 1,
    name: 'Bangalore-Chennai Expressway (Pkg 3)',
    department: 'Ministry of Road Transport & Highways',
    state: 'Karnataka',
    physicalProgress: 45,
    health: 'Active',
    riskLevel: 'Critical',
  },
  {
    id: 2,
    name: 'Dedicated Freight Corridor (Western Sector)',
    department: 'Ministry of Railways',
    state: 'Gujarat',
    physicalProgress: 68,
    health: 'Active',
    riskLevel: 'Medium',
  },
  {
    id: 3,
    name: 'Sagarika Multi-Modal Cargo Terminal',
    department: 'Ministry of Ports, Shipping & Waterways',
    state: 'Maharashtra',
    physicalProgress: 32,
    health: 'Delayed',
    riskLevel: 'High',
  },
];

export const healthByMinistry = [
  { ministry: 'Ministry of Road Transport & Highways', onTrack: 12, delayed: 3, critical: 1, total: 16 },
  { ministry: 'Ministry of Railways', onTrack: 8, delayed: 2, critical: 0, total: 10 },
  { ministry: 'Ministry of Housing & Urban Affairs', onTrack: 5, delayed: 4, critical: 2, total: 11 },
  { ministry: 'Ministry of Ports, Shipping & Waterways', onTrack: 3, delayed: 1, critical: 1, total: 5 },
];

// ===== PUBLIC DASHBOARD DATA =====

export const publicKPIs = {
  projectCount: { value: 5, label: 'Project Count', sublabel: 'Thousands of ₹M cr.' },
  originalCost: { value: '₹23,212', label: 'Original Cost', sublabel: 'Crore' },
  invoiceCost: { value: '₹27,010.5', label: 'Invoice Cost', sublabel: 'Total Invoices' },
  cumulativeExp: { value: '₹19,181.4', label: 'Cumulative Exp', sublabel: '+₹4,873 Quarter', change: '₹14,876.8' },
};

export const sectorWiseData = [
  { sector: 'Logistics', original: 7500, revised: 8200 },
  { sector: 'Urban Transport', original: 5200, revised: 5800 },
  { sector: 'Railways', original: 4800, revised: 5100 },
  { sector: 'Enablement & Infra', original: 3200, revised: 3500 },
  { sector: 'Power & Energy', original: 2500, revised: 2900 },
];

export const costOverviewData = [
  { month: 'Apr', original: 2000, revised: 2200, expenditure: 1800 },
  { month: 'May', original: 4500, revised: 4800, expenditure: 3900 },
  { month: 'Jun', original: 7000, revised: 7500, expenditure: 6200 },
  { month: 'Jul', original: 9500, revised: 10200, expenditure: 8500 },
  { month: 'Aug', original: 12000, revised: 13000, expenditure: 11000 },
];

export const physicalProgressData = [
  { name: 'Completed', value: 15, color: '#22c55e' },
  { name: 'Above 50%', value: 35, color: '#3b82f6' },
  { name: 'Below 50%', value: 30, color: '#f59e0b' },
  { name: 'Just Started', value: 20, color: '#ef4444' },
];

export const milestoneData = [
  { name: 'Approval Stage', completed: 45, total: 50 },
  { name: 'Land Acquisition', completed: 30, total: 50 },
  { name: 'Foundation', completed: 28, total: 40 },
  { name: 'Construction Phase', completed: 15, total: 35 },
  { name: 'Quality Audit', completed: 8, total: 20 },
];

export const projectsOverview = [
  {
    id: 1,
    name: 'DMRC Phase IV',
    ministry: 'Ministry of Urban Development',
    lastReview: '2024-08-15',
    originalCost: 45892,
    revisedCost: 48500,
    expenditure: 32150,
    physicalProgress: 68,
    status: 'On Track',
  },
  {
    id: 2,
    name: 'Delhi-Mumbai Expressway (Pkg 12)',
    ministry: 'Ministry of Road Transport & Highways',
    lastReview: '2024-08-10',
    originalCost: 98200,
    revisedCost: 102500,
    expenditure: 71200,
    physicalProgress: 72,
    status: 'On Track',
  },
  {
    id: 3,
    name: 'National Freight Corridor (Western - North)',
    ministry: 'Ministry of Railways',
    lastReview: '2024-07-28',
    originalCost: 65400,
    revisedCost: 72100,
    expenditure: 45600,
    physicalProgress: 55,
    status: 'Delayed',
  },
  {
    id: 4,
    name: 'Smart City Kochi',
    ministry: 'Ministry of Housing & Urban Affairs',
    lastReview: '2024-08-05',
    originalCost: 15200,
    revisedCost: 16800,
    expenditure: 9800,
    physicalProgress: 48,
    status: 'At Risk',
  },
  {
    id: 5,
    name: 'Sagarmala Port Modernization',
    ministry: 'Ministry of Ports, Shipping & Waterways',
    lastReview: '2024-07-30',
    originalCost: 22800,
    revisedCost: 24500,
    expenditure: 14200,
    physicalProgress: 42,
    status: 'At Risk',
  },
];

export const filterOptions = {
  sectors: ['All Sectors', 'Logistics', 'Urban Transport', 'Railways', 'Enablement & Infra', 'Power & Energy'],
  ministries: ['All Ministries', 'Ministry of Road Transport & Highways', 'Ministry of Railways', 'Ministry of Housing & Urban Affairs'],
  states: ['All States / UTs', 'Karnataka', 'Gujarat', 'Maharashtra', 'Delhi', 'Kerala'],
  dateRanges: ['All Date Slabs', 'Last 30 Days', 'Last 90 Days', 'Last 6 Months', 'Last Year'],
  months: ['Aug 2024', 'Jul 2024', 'Jun 2024', 'May 2024'],
};

export const stateWiseDistribution = [
  { state: 'Maharashtra', count: 42, percentage: 18.3 },
  { state: 'Karnataka', count: 35, percentage: 15.2 },
  { state: 'Gujarat', count: 28, percentage: 12.2 },
  { state: 'Tamil Nadu', count: 25, percentage: 10.9 },
  { state: 'Uttar Pradesh', count: 22, percentage: 9.6 },
  { state: 'Rajasthan', count: 18, percentage: 7.8 },
  { state: 'Madhya Pradesh', count: 16, percentage: 7.0 },
  { state: 'West Bengal', count: 14, percentage: 6.1 },
  { state: 'Delhi', count: 12, percentage: 5.2 },
  { state: 'Others', count: 18, percentage: 7.7 },
];

export const dashboardMetrics = {
  totalProjects: 1542,
  totalBudget: '₹ 2,45,000 Cr',
  activeEscalations: 12
};

export const globalProjects = [
  { id: 'PRJ-1001', name: 'Bangalore-Chennai Expressway', department: 'Ministry of Road Transport & Highways', state: 'Karnataka', physicalProgress: 85, financialProgress: 80, riskLevel: 'Low', predictedCostEscalation: 2.5 },
  { id: 'PRJ-1002', name: 'Dedicated Freight Corridor', department: 'Ministry of Railways', state: 'Gujarat', physicalProgress: 45, financialProgress: 50, riskLevel: 'High', predictedCostEscalation: 12.0 },
  { id: 'PRJ-1003', name: 'Mumbai Trans Harbour Link', department: 'Ministry of Road Transport & Highways', state: 'Maharashtra', physicalProgress: 98, financialProgress: 95, riskLevel: 'Low', predictedCostEscalation: 0.5 },
  { id: 'PRJ-1004', name: 'Navi Mumbai International Airport', department: 'Ministry of Civil Aviation', state: 'Maharashtra', physicalProgress: 60, financialProgress: 65, riskLevel: 'Medium', predictedCostEscalation: 4.8 },
  { id: 'PRJ-1005', name: 'Chenab Bridge', department: 'Ministry of Railways', state: 'Jammu & Kashmir', physicalProgress: 92, financialProgress: 88, riskLevel: 'Medium', predictedCostEscalation: 3.2 },
  { id: 'PRJ-1006', name: 'Polavaram Irrigation Project', department: 'Ministry of Jal Shakti', state: 'Andhra Pradesh', physicalProgress: 35, financialProgress: 40, riskLevel: 'Critical', predictedCostEscalation: 18.5 },
];
