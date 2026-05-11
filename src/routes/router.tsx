import { lazy, Suspense, ReactElement } from 'react';
import { Outlet, RouteObject, createBrowserRouter } from 'react-router-dom';

import PageLoader from 'components/loading/PageLoader';
import Splash from 'components/loading/Splash';
import paths from './paths';

const App = lazy<() => ReactElement>(() => import('App'));

const Dashboard = lazy<() => ReactElement>(() => import('pages/Dashboard'));
const MapView = lazy<() => ReactElement>(() => import('pages/MapView'));
const Miners = lazy<() => ReactElement>(() => import('pages/Miners'));
const Alerts = lazy<() => ReactElement>(() => import('pages/Alerts'));
const History = lazy<() => ReactElement>(() => import('pages/History'));
const Trajectories = lazy<() => ReactElement>(() => import('pages/Trajectories'));
const Reports = lazy<() => ReactElement>(() => import('pages/Reports'));
const Users = lazy<() => ReactElement>(() => import('pages/Users'));
const Settings = lazy<() => ReactElement>(() => import('pages/Settings'));
const System = lazy<() => ReactElement>(() => import('pages/System'));
const Devices = lazy<() => ReactElement>(() => import('pages/Devices'));
const Extraction = lazy<() => ReactElement>(() => import('pages/Extraction'));
const Traceability = lazy<() => ReactElement>(() => import('pages/Traceability'));
const Communicate = lazy<() => ReactElement>(() => import('pages/Communicate'));
const Logout = lazy<() => ReactElement>(() => import('pages/Logout'));
const ErrorPage = lazy<() => ReactElement>(() => import('pages/error/ErrorPage'));
const Login = lazy<() => ReactElement>(() => import('pages/authentication/Login'));
const SignUp = lazy<() => ReactElement>(() => import('pages/authentication/SignUp'));
const ForgotPassword = lazy<() => ReactElement>(() => import('pages/authentication/ForgotPassword'));

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
            path: 'map',
            element: <MapView />,
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
            element: <History />,
          },
          {
            path: 'trajectories',
            element: <Trajectories />,
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
            element: <Traceability />,
          },
          {
            path: 'communicate',
            element: <Communicate />,
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
