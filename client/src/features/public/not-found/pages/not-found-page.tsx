import { Link } from 'react-router';
import { formatPageTitle } from '@/utils/format-page-title';

/** Shown for unknown addresses, drafts and removed records (FR-SITE-004). It always offers a way on. */
export function NotFoundPage() {
  return (
    <>
      <title>{formatPageTitle('Page not found')}</title>
      <h1>Page not found</h1>
      <p className="mt-4">This address does not match any page on this site.</p>
      <p className="mt-4">
        <Link to="/">Go to the home page</Link>
      </p>
    </>
  );
}
