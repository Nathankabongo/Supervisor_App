import { lazy, Suspense, ReactElement } from 'react';
import { Navigate, Outlet, RouteObject, createBrowserRouter } from 'react-router-dom';

import PageLoader from 'components/loading/PageLoader';
import Splash from 'components/loading/Splash';
import paths from './paths';

const App = lazy<() => ReactElement>(() => import('App'));

const Dashboard = lazy<() => ReactElement>(() => import('pages/Dashboard'));
const Localisation = lazy<() => ReactElement>(() => import('pages/Localisation'));
const Miners = lazy<() => ReactElement>(() => import('pages/Miners'));
const Alerts = lazy<() => ReactElement>(() => import('pages/Alerts'));
const Reports = lazy<() => ReactElement>(() => import('pages/Reports'));
const Users = lazy<() => ReactElement>(() => import('pages/Users'));
const Settings = lazy<() => ReactElement>(() => import('pages/Settings'));
const System = lazy<() => ReactElement>(() => import('pages/System'));
const GisConfig = lazy<() => ReactElement>(() => import('pages/GisConfig'));
const Devices = lazy<() => ReactElement>(() => import('pages/Devices'));
const Extraction = lazy<() => ReactElement>(() => import('pages/Extraction'));
const Communicate = lazy<() => ReactElement>(() => import('pages/Communicate'));
const WatchLogs = lazy<() => ReactElement>(() => import('pages/WatchLogs'));
const Fleet = lazy<() => ReactElement>(() => import('pages/Fleet'));
const Maintenance = lazy<() => ReactElement>(() => import('pages/Maintenance'));
const Esg = lazy<() => ReactElement>(() => import('pages/Esg'));
const Geotech = lazy<() => ReactElement>(() => import('pages/Geotech'));
const DigitalTwin = lazy<() => ReactElement>(() => import('pages/DigitalTwin'));
const AiCenter = lazy<() => ReactElement>(() => import('pages/AiCenter'));
const Blasting = lazy<() => ReactElement>(() => import('pages/Blasting'));
const Inventory = lazy<() => ReactElement>(() => import('pages/Inventory'));
const ArVr = lazy<() => ReactElement>(() => import('pages/ArVr'));
const Drone = lazy<() => ReactElement>(() => import('pages/Drone'));
const Erp = lazy<() => ReactElement>(() => import('pages/Erp'));
const SecurityCyber = lazy<() => ReactElement>(() => import('pages/SecurityCyber'));
const HumanSafety = lazy<() => ReactElement>(() => import('pages/HumanSafety'));
const Dispatch = lazy<() => ReactElement>(() => import('pages/Dispatch'));
const Energy = lazy<() => ReactElement>(() => import('pages/Energy'));
const Water = lazy<() => ReactElement>(() => import('pages/Water'));
const Weather = lazy<() => ReactElement>(() => import('pages/Weather'));
const VisionAi = lazy<() => ReactElement>(() => import('pages/VisionAi'));
const CrisisCenter = lazy<() => ReactElement>(() => import('pages/CrisisCenter'));
const DirectorDashboard = lazy<() => ReactElement>(() => import('pages/DirectorDashboard'));
const Logout = lazy<() => ReactElement>(() => import('pages/Logout'));
const ErrorPage = lazy<() => ReactElement>(() => import('pages/error/ErrorPage'));
const Login = lazy<() => ReactElement>(() => import('pages/authentication/Login'));
const SignUp = lazy<() => ReactElement>(() => import('pages/authentication/SignUp'));
const ForgotPassword = lazy<() => ReactElement>(
  () => import('pages/authentication/ForgotPassword'),
);

const routes: RouteObject[] = [
  {
    path: '/authentication/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: '/authentication/sign-up',
    element: (
      <Suspense fallback={<PageLoader />}>
        <SignUp />
      </Suspense>
    ),
  },
  {
    path: '/authentication/forgot-password',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ForgotPassword />
      </Suspense>
    ),
  },
  {
    element: (
      <Suspense fallback={<Splash />}>
        <App />
      </Suspense>
    ),
    children: [
      {
        path: paths.home,
        element: (
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: 'localisation',
            element: <Localisation />,
          },
          {
            path: 'map',
            element: <Navigate to="/localisation?tab=carte" replace />,
          },
          {
            path: 'miners',
            element: <Miners />,
          },
          {
            path: 'alerts',
            element: <Alerts />,
          },
          {
            path: 'history',
            element: <Navigate to="/localisation?tab=tracabilite" replace />,
          },
          {
            path: 'trajectories',
            element: <Navigate to="/localisation?tab=trajectoires" replace />,
          },
          {
            path: 'reports',
            element: <Reports />,
          },
          {
            path: 'users',
            element: <Users />,
          },
          {
            path: 'settings',
            element: <Settings />,
          },
          {
            path: 'gis-config',
            element: <GisConfig />,
          },
          {
            path: 'system',
            element: <System />,
          },
          {
            path: 'devices',
            element: <Devices />,
          },
          {
            path: 'extraction',
            element: <Extraction />,
          },
          {
            path: 'traceability',
            element: <Navigate to="/localisation?tab=tracabilite" replace />,
          },
          {
            path: 'communicate',
            element: <Communicate />,
          },
          {
            path: 'watch-logs',
            element: <WatchLogs />,
          },
          {
            path: 'fleet',
            element: <Fleet />,
          },
          {
            path: 'maintenance',
            element: <Maintenance />,
          },
          {
            path: 'esg',
            element: <Esg />,
          },
          {
            path: 'geotech',
            element: <Geotech />,
          },
          {
            path: 'digital-twin',
            element: <DigitalTwin />,
          },
          {
            path: 'ai',
            element: <AiCenter />,
          },
          {
            path: 'blasting',
            element: <Blasting />,
          },
          {
            path: 'inventory',
            element: <Inventory />,
          },
          {
            path: 'ar-vr',
            element: <ArVr />,
          },
          {
            path: 'drone',
            element: <Drone />,
          },
          {
            path: 'erp',
            element: <Erp />,
          },
          {
            path: 'security-cyber',
            element: <SecurityCyber />,
          },
          {
            path: 'human-safety',
            element: <HumanSafety />,
          },
          {
            path: 'dispatch',
            element: <Dispatch />,
          },
          {
            path: 'energy',
            element: <Energy />,
          },
          {
            path: 'water',
            element: <Water />,
          },
          {
            path: 'weather',
            element: <Weather />,
          },
          {
            path: 'vision-ai',
            element: <VisionAi />,
          },
          {
            path: 'crisis-center',
            element: <CrisisCenter />,
          },
          {
            path: 'director-dashboard',
            element: <DirectorDashboard />,
          },
        ],
      },
    ],
  },
  {
    path: '/logout',
    element: (
      <Suspense fallback={<PageLoader />}>
        <Logout />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: <ErrorPage />,
  },
];

const router = createBrowserRouter(routes);

export default router;
