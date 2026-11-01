import { formatPageTitle } from '@/utils/format-page-title';

export function SettingsPage() {
  return (
    <>
      <title>{formatPageTitle('Settings', 'Admin')}</title>
      <h1>Settings</h1>
      <p>This admin page is a placeholder. Its content arrives in a later milestone.</p>
    </>
  );
}
