import { Link } from 'react-router';
import { SITE_NAME } from '@/utils/format-page-title';

/** The owner's name as plain text. */
export function SiteName() {
  return <>{SITE_NAME}</>;
}

/** The owner's name as a link to the Home page. */
export function BrandLink({ className }: { className?: string }) {
  return (
    <Link to="/" className={className}>
      {SITE_NAME}
    </Link>
  );
}
