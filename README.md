# RiskNexus Frontend (PAIMANA Dashboard)

This repository contains the frontend codebase for the **PAIMANA Infrastructure & Project Monitoring Dashboard**, representing the Ministry of Statistics and Programme Implementation (MoSPI). 

The dashboard provides a strict, utilitarian, and highly accessible user interface to monitor Indian government infrastructure projects, track financial/physical progress, and surface AI-driven risk alerts.

## 🚀 Features

- **Executive & Public Dashboards:** High-level views of project distributions, delays, and critical KPI metrics using Recharts.
- **Project Drill-Down:** Deep navigation into specific projects to view milestones, maps, and detailed progress.
- **AI Intelligence & Risk Alerts:** Mock data integration showcasing AI-driven insights, predicted cost escalations, and actionable recommendations.
- **Advanced Navigation:** A state-driven, collapsible sidebar with accordion sub-menus for a clean, maximized workspace.
- **Theme Support:** Fully integrated Dark and Light mode toggling.
- **Accessibility (a11y) First:** Top banner controls for text resizing, high contrast, and screen reader skip links (government standard).

## 🛠️ Tech Stack

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Charting:** Recharts

## 📦 Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/notrajveer/RiskNexus-Frontend.git
   cd paimana-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

## 📁 Project Structure

- `src/components/layout/` - Core layout components (Sidebar, TopBanner, Footer).
- `src/components/shared/` - Reusable UI elements (Charts, KPICards, FAB, Badges).
- `src/pages/` - Main route views (ExecutiveOverview, PublicDashboard, etc.).
- `src/services/` - Mock data contracts and API simulation.
- `src/context/` - Global state context (ThemeContext).
