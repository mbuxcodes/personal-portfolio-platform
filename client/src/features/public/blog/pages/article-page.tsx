import { formatPageTitle } from '@/utils/format-page-title';

export function ArticlePage() {
  return (
    <>
      <title>{formatPageTitle('Article')}</title>
      <h1>Article</h1>
      <p>This page is a placeholder. Its content arrives in a later milestone.</p>
    </>
  );
}
