import { formatPageTitle } from '@/utils/format-page-title';

export function HomePage() {
  return (
    <>
      <title>{formatPageTitle()}</title>
      <h1>Home</h1>
      <p>This page is a placeholder. Its content arrives in a later milestone.</p>
    </>
  );
}
