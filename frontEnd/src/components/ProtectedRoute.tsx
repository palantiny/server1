import { Navigate, Outlet, useLocation } from 'react-router';
import { getToken } from '../api';

/**
 * 로그인 토큰이 없으면 /login 으로 보냄.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const token = getToken();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
