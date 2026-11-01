import { formatPageTitle } from '@/utils/format-page-title';

export function DashboardPage() {
  return (
    <>
      <title>{formatPageTitle('Dashboard', 'Admin')}</title>
      <h1>Dashboard</h1>
      <p>This admin page is a placeholder. Its content arrives in a later milestone.</p>
    </>
  );
}
