import { formatPageTitle } from '@/utils/format-page-title';

export function ArticlesManagementPage() {
  return (
    <>
      <title>{formatPageTitle('Manage articles', 'Admin')}</title>
      <h1>Manage articles</h1>
      <p>This admin page is a placeholder. Its content arrives in a later milestone.</p>
    </>
  );
}
