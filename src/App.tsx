import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/admin/AdminRoute';

// Landing page (from NEW ROI sub-project)
import LandingPage from './pages/LandingPage';
import DocsPage from './pages/DocsPage';

// Admin Pages
import { AdminLayout } from './pages/admin/layout/AdminLayout';
import { ModelPricingPage } from './pages/admin/pricing/ModelPricing';
import { OrganizationsPage } from './pages/admin/organizations/Organizations';
import { OrganizationDetailPage } from './pages/admin/organizations/OrganizationDetail';
import { SystemHealthPage } from './pages/admin/health/SystemHealth';
import { AdminAnalyticsPage } from './pages/admin/analytics/AdminAnalytics';
import { AdminUsersPage } from './pages/admin/users/Users';
import { AdminBudgetsPage } from './pages/admin/budgets/AdminBudgets';
import { AdminIntegrationsPage } from './pages/admin/integrations/AdminIntegrations';
import { AdminReportsPage } from './pages/admin/reports/AdminReports';
import { AdminSiteLinksPage } from './pages/admin/site-links/AdminSiteLinks';
import { Forbidden403 } from './pages/admin/Forbidden403';

// Auth pages
import { SignIn } from './pages/auth/SignIn';
import { SignUp } from './pages/auth/SignUp';
import AuthCallback from './pages/auth/Callback';
// Placeholder auth pages (create as needed):
// import { ForgotPassword } from './pages/auth/ForgotPassword';
// import { ResetPassword } from './pages/auth/ResetPassword';
// import { VerifyEmail } from './pages/auth/VerifyEmail';

// Onboarding
import { Onboarding } from './pages/onboarding/Onboarding';

// Dashboard
import { DashboardLayout } from './pages/dashboard/layout/DashboardLayout';
import { Overview } from './pages/dashboard/overview/Overview';
import { CostAnalytics } from './pages/dashboard/cost-analytics/CostAnalytics';
import { ROICalculator } from './pages/dashboard/roi-calculator/ROICalculator';
import { BudgetManager } from './pages/dashboard/budget-manager/BudgetManager';
import { APIUsage } from './pages/dashboard/api-usage/APIUsage';
import { Reports } from './pages/dashboard/reports/Reports';
import { Integrations } from './pages/dashboard/integrations/Integrations';
import { Alerts } from './pages/dashboard/alerts/Alerts';
import { Benchmarks } from './pages/dashboard/benchmarks/Benchmarks';
import { Playground } from './pages/dashboard/playground/Playground';

// Settings
import { SettingsLayout } from './pages/settings/layout/SettingsLayout';
import { Profile } from './pages/settings/profile/Profile';
import { Security } from './pages/settings/security/Security';
import { Notifications } from './pages/settings/notifications/Notifications';
import { Organization } from './pages/settings/organization/Organization';
import { Team } from './pages/settings/team/Team';
import { Billing } from './pages/settings/billing/Billing';

export default function App() {
  return (
    <Routes>
      {/* ── Landing Page ─────────────────────────────── */}
      <Route path="/" element={<LandingPage />} />

      {/* ── Docs (from NEW ROI sub-project) ──────────── */}
      <Route path="/docs" element={<Navigate to="/docs/overview" replace />} />
      <Route path="/docs/:slug" element={<DocsPage />} />

      {/* ── Auth — all possible URL variations ──────── */}
      <Route path="/auth/signin" element={<SignIn />} />
      <Route path="/auth/login" element={<SignIn />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/login" element={<SignIn />} />

      <Route path="/auth/signup" element={<SignUp />} />
      <Route path="/auth/register" element={<SignUp />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/register" element={<SignUp />} />

      <Route path="/auth/callback" element={<AuthCallback />} />
      {/* TODO: Create these pages when needed */}
      {/* <Route path="/auth/forgot-password" element={<ForgotPassword />} /> */}
      {/* <Route path="/auth/reset-password" element={<ResetPassword />} /> */}
      {/* <Route path="/auth/verify-email" element={<VerifyEmail />} /> */}

      {/* ── Protected routes ─────────────────────────── */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* ── Dashboard routes ─────────────────────────── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="cost-analytics" element={<CostAnalytics />} />
        <Route path="roi-calculator" element={<ROICalculator />} />
        <Route path="budget-manager" element={<BudgetManager />} />
        <Route path="api-usage" element={<APIUsage />} />
        <Route path="reports" element={<Reports />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="benchmarks" element={<Benchmarks />} />
        <Route path="playground" element={<Playground />} />
      </Route>

      {/* ── Settings routes ──────────────────────────── */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsLayout />
          </ProtectedRoute>
        }
      >
        <Route path="profile" element={<Profile />} />
        <Route path="security" element={<Security />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="organization" element={<Organization />} />
        <Route path="team" element={<Team />} />
        <Route path="billing" element={<Billing />} />
        <Route index element={<Navigate to="/settings/profile" replace />} />
      </Route>

      {/* ── Admin routes ─────────────────────────────── */}
      <Route path="/403" element={<Forbidden403 />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/pricing" replace />} />
        <Route path="pricing" element={<ModelPricingPage />} />
        <Route path="organizations" element={<OrganizationsPage />} />
        <Route path="organizations/:id" element={<OrganizationDetailPage />} />
        <Route path="health" element={<SystemHealthPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="budgets" element={<AdminBudgetsPage />} />
        <Route path="integrations" element={<AdminIntegrationsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="site-links" element={<AdminSiteLinksPage />} />
      </Route>

      {/* ── Catch-all ─────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

