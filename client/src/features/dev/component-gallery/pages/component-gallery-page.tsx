import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Animate, type AnimationPattern } from '@/shared-ui/animate';
import { Button } from '@/shared-ui/button';
import { ConfirmDialog } from '@/shared-ui/confirm-dialog';
import { RegionErrorBoundary } from '@/shared-ui/error-boundary';
import { EmptyState, ErrorState, LoadingState } from '@/shared-ui/feedback';
import { Checkbox, Select, TextArea, TextInput } from '@/shared-ui/form';
import { Image } from '@/shared-ui/image';
import { Pagination } from '@/shared-ui/pagination';
import { notificationAdded, useAppDispatch } from '@/state';
import { formatPageTitle } from '@/utils/format-page-title';

/*
 * Development-only gallery of the shared components (M3.5). It is registered only when the
 * client runs in development (see `routing/dev-routes.ts`), so it is not part of the production
 * build. It has no layout of its own, so it can be reviewed at a phone width on its own.
 */

const animationPatterns: AnimationPattern[] = ['fade', 'rise', 'scale'];

const roleOptions = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
];

function GallerySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

/** Throws while rendering, to show the region error boundary and its retry. */
function BrokenRegion({ broken }: { broken: boolean }) {
  if (broken) {
    throw new Error('Gallery: this region is broken on purpose.');
  }

  return <p>This region is working.</p>;
}

export function ComponentGalleryPage() {
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastAnswer, setLastAnswer] = useState('No answer yet.');
  const [page, setPage] = useState(1);
  const [replay, setReplay] = useState(0);
  const [broken, setBroken] = useState(false);
  const [retries, setRetries] = useState(0);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-4 tablet:p-8">
      <title>{formatPageTitle('Component gallery', 'Development')}</title>
      <header className="flex flex-col gap-2">
        <h1>Component gallery</h1>
        <p className="text-text-secondary">
          Every shared component in one place. This page exists in development only.
        </p>
      </header>

      <GallerySection id="gallery-buttons" title="Buttons">
        <div className="flex flex-wrap gap-4">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
        </div>
      </GallerySection>

      <GallerySection id="gallery-forms" title="Form fields">
        <TextInput label="Name" hint="As it should appear on the site." required />
        <TextInput
          label="Email"
          type="email"
          error="Enter an email address such as name@example.com."
        />
        <TextArea label="Message" hint="Up to 1000 characters." />
        <Select label="Role" options={roleOptions} placeholder="Choose a role" />
        <Checkbox
          label="Show this entry on the public site"
          hint="Unpublished entries stay hidden."
        />
        <Checkbox label="I accept the terms" error="You must accept the terms to continue." />
      </GallerySection>

      <GallerySection id="gallery-dialog" title="Confirm dialog">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="danger" onClick={() => setDialogOpen(true)}>
            Delete project
          </Button>
          <p>{lastAnswer}</p>
        </div>
        <ConfirmDialog
          open={dialogOpen}
          title="Delete this project?"
          description="The project is removed from the site. This cannot be undone."
          confirmLabel="Delete project"
          destructive
          onConfirm={() => {
            setLastAnswer('Confirmed.');
            setDialogOpen(false);
          }}
          onCancel={() => {
            setLastAnswer('Cancelled.');
            setDialogOpen(false);
          }}
        />
      </GallerySection>

      <GallerySection id="gallery-notifications" title="Notifications">
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => dispatch(notificationAdded('success', 'Project saved.'))}>
            Show success
          </Button>
          <Button
            variant="secondary"
            onClick={() => dispatch(notificationAdded('error', 'The project could not be saved.'))}
          >
            Show error
          </Button>
        </div>
      </GallerySection>

      <GallerySection id="gallery-states" title="Empty, loading and error states">
        <EmptyState
          title="No projects yet"
          description="Projects will appear here once they are published."
        />
        <LoadingState label="Loading projects…" />
        <ErrorState
          message="The projects could not be loaded."
          onRetry={() => setRetries((count) => count + 1)}
        />
        <p className="text-text-secondary">Retry pressed {retries} times.</p>
      </GallerySection>

      <GallerySection id="gallery-boundary" title="Region error boundary">
        <RegionErrorBoundary regionName="this demo" resetKey={broken}>
          <BrokenRegion broken={broken} />
        </RegionErrorBoundary>
        <div>
          <Button variant="secondary" onClick={() => setBroken(true)}>
            Break the region
          </Button>
        </div>
      </GallerySection>

      <GallerySection id="gallery-pagination" title="Pagination">
        <Pagination
          currentPage={page}
          totalPages={10}
          onPageChange={setPage}
          label="Gallery pages"
        />
        <p className="text-center text-text-secondary">Page {page} of 10</p>
      </GallerySection>

      <GallerySection id="gallery-image" title="Image">
        <Image
          src="/gallery/missing.png"
          alt="A project screenshot that failed to load"
          width={640}
          height={360}
        />
        <Image src="/gallery/missing-decoration.png" decorative width={640} height={120} />
      </GallerySection>

      <GallerySection id="gallery-animation" title="Animation patterns">
        <p className="text-text-secondary">
          Turn on reduced motion in the system settings to see the content appear without movement.
        </p>
        <div>
          <Button variant="secondary" onClick={() => setReplay((count) => count + 1)}>
            Replay
          </Button>
        </div>
        <ul key={replay} className="flex flex-col gap-2">
          {animationPatterns.map((pattern, index) => (
            <Animate
              key={pattern}
              as="li"
              pattern={pattern}
              index={index}
              className="rounded-md bg-surface-muted p-4"
            >
              Pattern: {pattern}
            </Animate>
          ))}
        </ul>
      </GallerySection>

      <GallerySection id="gallery-layouts" title="Layouts">
        <ul className="flex flex-col gap-2">
          <li>
            <Link to="/">Public layout</Link>
          </li>
          <li>
            <Link to="/admin">Admin layout</Link>
          </li>
          <li>
            <Link to="/admin/sign-in">Sign-in layout</Link>
          </li>
        </ul>
      </GallerySection>
    </main>
  );
}
