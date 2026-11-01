import { formatPageTitle } from '@/utils/format-page-title';

export function MessagesPage() {
  return (
    <>
      <title>{formatPageTitle('Messages', 'Admin')}</title>
      <h1>Messages</h1>
      <p>This admin page is a placeholder. Its content arrives in a later milestone.</p>
    </>
  );
}
