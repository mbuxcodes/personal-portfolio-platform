import { formatPageTitle } from '@/utils/format-page-title';

export function SignInPage() {
  return (
    <>
      <title>{formatPageTitle('Sign in', 'Admin')}</title>
      <h1>Sign in</h1>
      <p>This admin page is a placeholder. Its content arrives in a later milestone.</p>
    </>
  );
}
