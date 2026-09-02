import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/admin/AdminRoute';
import { Spinner } from './components/ui/Spinner/Spinner';

// ── Route-level code splitting (SEO-25) ──────────────────────────────
// All page components are lazy-loaded so that public routes (landing,
// docs, blog, marketing) never eagerly pull in dashboard/admin/settings
// code or their heavy dependencies (recharts, jspdf, xlsx, etc.).
// Guards (ProtectedRoute/AdminRoute) stay eager: they are tiny and gate
// every private route.

// Landing / public pages (default exports)
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ContactSales = lazy(() => import('./pages/ContactSales'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const StaticPage = lazy(() => import('./pages/StaticPage'));
const MarketingPage = lazy(() => import('./pages/MarketingPage'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin Pages (named exports)
const AdminLayout = lazy(() =>
  import('./pages/admin/layout/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const ModelPricingPage = lazy(() =>
  import('./pages/admin/pricing/ModelPricing').then((m) => ({ default: m.ModelPricingPage }))
);
const OrganizationsPage = lazy(() =>
  import('./pages/admin/organizations/Organizations').then((m) => ({ default: m.OrganizationsPage }))
);
const OrganizationDetailPage = lazy(() =>
  import('./pages/admin/organizations/OrganizationDetail').then((m) => ({
    default: m.OrganizationDetailPage,
  }))
);
const SystemHealthPage = lazy(() =>
  import('./pages/admin/health/SystemHealth').then((m) => ({ default: m.SystemHealthPage }))
);
const AdminAnalyticsPage = lazy(() =>
  import('./pages/admin/analytics/AdminAnalytics').then((m) => ({ default: m.AdminAnalyticsPage }))
);
const AdminUsersPage = lazy(() =>
  import('./pages/admin/users/Users').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminBudgetsPage = lazy(() =>
  import('./pages/admin/budgets/AdminBudgets').then((m) => ({ default: m.AdminBudgetsPage }))
);
const AdminIntegrationsPage = lazy(() =>
  import('./pages/admin/integrations/AdminIntegrations').then((m) => ({
    default: m.AdminIntegrationsPage,
  }))
);
const AdminReportsPage = lazy(() =>
  import('./pages/admin/reports/AdminReports').then((m) => ({ default: m.AdminReportsPage }))
);
const AdminSiteLinksPage = lazy(() =>
  import('./pages/admin/site-links/AdminSiteLinks').then((m) => ({ default: m.AdminSiteLinksPage }))
);
const AdminLandingPricingPage = lazy(() =>
  import('./pages/admin/landing-pricing/AdminLandingPricing').then((m) => ({
    default: m.AdminLandingPricingPage,
  }))
);
const PricingAgent = lazy(() =>
  import('./pages/admin/pricing-agent/PricingAgent').then((m) => ({ default: m.PricingAgent }))
);
const AdminPagesPage = lazy(() =>
  import('./pages/admin/pages/AdminPages').then((m) => ({ default: m.AdminPagesPage }))
);
const AdminBlogPage = lazy(() =>
  import('./pages/admin/blog/AdminBlog').then((m) => ({ default: m.AdminBlogPage }))
);
const AdminProvidersPage = lazy(() =>
  import('./pages/admin/providers/AdminProviders').then((m) => ({ default: m.AdminProvidersPage }))
);
const Forbidden403 = lazy(() =>
  import('./pages/admin/Forbidden403').then((m) => ({ default: m.Forbidden403 }))
);

// Auth pages
const SignIn = lazy(() => import('./pages/auth/SignIn').then((m) => ({ default: m.SignIn })));
const SignUp = lazy(() => import('./pages/auth/SignUp').then((m) => ({ default: m.SignUp })));
const AuthCallback = lazy(() => import('./pages/auth/Callback'));

// Onboarding
const Onboarding = lazy(() =>
  import('./pages/onboarding/Onboarding').then((m) => ({ default: m.Onboarding }))
);

// Dashboard
const DashboardLayout = lazy(() =>
  import('./pages/dashboard/layout/DashboardLayout').then((m) => ({ default: m.DashboardLayout }))
);
const Overview = lazy(() =>
  import('./pages/dashboard/overview/Overview').then((m) => ({ default: m.Overview }))
);
const CostAnalytics = lazy(() =>
  import('./pages/dashboard/cost-analytics/CostAnalytics').then((m) => ({ default: m.CostAnalytics }))
);
const ROICalculator = lazy(() =>
  import('./pages/dashboard/roi-calculator/ROICalculator').then((m) => ({ default: m.ROICalculator }))
);
const BudgetManager = lazy(() =>
  import('./pages/dashboard/budget-manager/BudgetManager').then((m) => ({ default: m.BudgetManager }))
);
const APIUsage = lazy(() =>
  import('./pages/dashboard/api-usage/APIUsage').then((m) => ({ default: m.APIUsage }))
);
const Reports = lazy(() =>
  import('./pages/dashboard/reports/Reports').then((m) => ({ default: m.Reports }))
);
const Integrations = lazy(() =>
  import('./pages/dashboard/integrations/Integrations').then((m) => ({ default: m.Integrations }))
);
const Alerts = lazy(() =>
  import('./pages/dashboard/alerts/Alerts').then((m) => ({ default: m.Alerts }))
);
const Benchmarks = lazy(() =>
  import('./pages/dashboard/benchmarks/Benchmarks').then((m) => ({ default: m.Benchmarks }))
);
const Playground = lazy(() =>
  import('./pages/dashboard/playground/Playground').then((m) => ({ default: m.Playground }))
);

// Settings
const SettingsLayout = lazy(() =>
  import('./pages/settings/layout/SettingsLayout').then((m) => ({ default: m.SettingsLayout }))
);
const Profile = lazy(() =>
  import('./pages/settings/profile/Profile').then((m) => ({ default: m.Profile }))
);
const Security = lazy(() =>
  import('./pages/settings/security/Security').then((m) => ({ default: m.Security }))
);
const Notifications = lazy(() =>
  import('./pages/settings/notifications/Notifications').then((m) => ({ default: m.Notifications }))
);
const Organization = lazy(() =>
  import('./pages/settings/organization/Organization').then((m) => ({ default: m.Organization }))
);
const Team = lazy(() => import('./pages/settings/team/Team').then((m) => ({ default: m.Team })));
const Billing = lazy(() =>
  import('./pages/settings/billing/Billing').then((m) => ({ default: m.Billing }))
);

function RouteFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        width: '100%',
      }}
    >
      <Spinner size="lg" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ── Landing Page ─────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/contact-sales" element={<ContactSales />} />

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
          <Route path="landing-pricing" element={<AdminLandingPricingPage />} />
          <Route path="pricing-agent" element={<PricingAgent />} />
          <Route path="pages" element={<AdminPagesPage />} />
          <Route path="blog" element={<AdminBlogPage />} />
          <Route path="providers" element={<AdminProvidersPage />} />
        </Route>

        {/* ── Blog (CMS-driven, explicit routes before catch-all) ── */}
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />

        {/* ── Marketing Pages (CMS-driven, explicit routes before catch-all) ── */}
        <Route path="/features" element={<MarketingPage slug="features" />} />
        <Route path="/pricing" element={<MarketingPage slug="pricing" />} />
        <Route path="/security" element={<MarketingPage slug="security" />} />

        {/* ── Dynamic Marketing Templates (one reusable route per category) ── */}
        <Route
          path="/alternatives/:slug"
          element={<MarketingPage template="alternative" />}
        />
        <Route
          path="/use-cases/:slug"
          element={<MarketingPage template="usecase" />}
        />

        {/* ── Dynamic Public Pages (e.g., /about-us, /privacy-policy) ── */}
        <Route path="/:slug" element={<StaticPage />} />

        {/* ── Catch-all — real 404 (noindex), NOT a soft redirect (SEO-26) ── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
