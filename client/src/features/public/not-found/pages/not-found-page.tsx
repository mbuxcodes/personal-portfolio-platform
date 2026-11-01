import { formatPageTitle } from '@/utils/format-page-title';

export function NotFoundPage() {
  return (
    <>
      <title>{formatPageTitle('Page not found')}</title>
      <h1>Page not found</h1>
      <p>This address does not match any page on this site.</p>
    </>
  );
}
