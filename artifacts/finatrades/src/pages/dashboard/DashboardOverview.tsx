import { useAuth } from '@/context/AuthContext';
import ExporterDashboard from './ExporterDashboard';
import ImporterDashboard from './ImporterDashboard';
import GovernmentDashboard from './GovernmentDashboard';
import AdminDashboard from './AdminDashboard';

export default function DashboardOverview() {
  const { user } = useAuth();
  if ((user as any)?.role === 'admin') return <AdminDashboard />;
  const t = (user as any)?.userType;
  switch (t) {
    case 'importer':   return <ImporterDashboard />;
    case 'government': return <GovernmentDashboard />;
    case 'exporter':
    case 'warehouse':
    case undefined:
    case null:
      return <ExporterDashboard />;
    default:
      return <ExporterDashboard />;
  }
}
