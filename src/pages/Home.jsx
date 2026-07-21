import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <Navigate to="/front-desk" replace />;
  }
  return <Navigate to="/stylist" replace />;
}