import { formatPageTitle } from '@/utils/format-page-title';

export function AboutPage() {
  return (
    <>
      <title>{formatPageTitle('About')}</title>
      <h1>About</h1>
      <p>This page is a placeholder. Its content arrives in a later milestone.</p>
    </>
  );
}
