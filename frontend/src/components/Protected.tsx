import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Protected({ children, roles }: { children: React.ReactNode; roles?: Array<'ADMIN' | 'COACH' | 'PARENT'> }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Đang tải...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
