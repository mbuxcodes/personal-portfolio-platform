import { formatPageTitle } from '@/utils/format-page-title';

export function AccountPage() {
  return (
    <>
      <title>{formatPageTitle('Account', 'Admin')}</title>
      <h1>Account</h1>
      <p>This admin page is a placeholder. Its content arrives in a later milestone.</p>
    </>
  );
}
