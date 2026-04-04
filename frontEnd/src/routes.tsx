import { createBrowserRouter, Navigate } from 'react-router';
import { BuyerDashboard } from './components/BuyerDashboard';
import { ProductDetail } from './components/ProductDetail';
import { MyPage } from './components/MyPage';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/',
    Component: ProtectedRoute,
    children: [
      {
        index: true,
        Component: BuyerDashboard,
        errorElement: <Navigate to="/" replace />,
      },
      {
        path: 'product/:id',
        Component: ProductDetail,
        errorElement: <Navigate to="/" replace />,
      },
      {
        path: 'mypage',
        Component: MyPage,
        errorElement: <Navigate to="/" replace />,
      },
    ],
  },
  {
    path: '/buyer',
    element: <Navigate to="/" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);