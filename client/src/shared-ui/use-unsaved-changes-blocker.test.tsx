import { act, fireEvent, render, screen } from '@testing-library/react';
import { Link, createMemoryRouter, RouterProvider } from 'react-router';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useUnsavedChangesBlocker } from '@/shared-ui/use-unsaved-changes-blocker';

function EditPage() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { isBlocked, proceed, stay } = useUnsavedChangesBlocker(hasUnsavedChanges);

  return (
    <div>
      <h1>Edit</h1>
      <button type="button" onClick={() => setHasUnsavedChanges(true)}>
        Change a field
      </button>
      <button type="button" onClick={() => setHasUnsavedChanges(false)}>
        Save
      </button>
      <Link to="/other">Leave</Link>
      <Link to="/edit?tab=2">Same page</Link>
      {isBlocked ? (
        <div role="alertdialog" aria-label="Unsaved changes">
          <button type="button" onClick={stay}>
            Stay
          </button>
          <button type="button" onClick={proceed}>
            Discard and leave
          </button>
        </div>
      ) : null}
    </div>
  );
}

function renderEditPage() {
  const router = createMemoryRouter(
    [
      { path: '/edit', element: <EditPage /> },
      { path: '/other', element: <h1>Other page</h1> },
    ],
    { initialEntries: ['/edit'] },
  );

  render(<RouterProvider router={router} />);

  return router;
}

describe('useUnsavedChangesBlocker', () => {
  it('lets the user leave a form with no changes', () => {
    const router = renderEditPage();

    fireEvent.click(screen.getByRole('link', { name: 'Leave' }));

    expect(router.state.location.pathname).toBe('/other');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('pauses navigation away from a form with unsaved changes', () => {
    const router = renderEditPage();

    fireEvent.click(screen.getByRole('button', { name: 'Change a field' }));
    fireEvent.click(screen.getByRole('link', { name: 'Leave' }));

    expect(router.state.location.pathname).toBe('/edit');
    expect(screen.getByRole('alertdialog', { name: 'Unsaved changes' })).toBeInTheDocument();
  });

  it('keeps the user on the form when they choose to stay', () => {
    const router = renderEditPage();

    fireEvent.click(screen.getByRole('button', { name: 'Change a field' }));
    fireEvent.click(screen.getByRole('link', { name: 'Leave' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }));

    expect(router.state.location.pathname).toBe('/edit');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit' })).toBeInTheDocument();
  });

  it('lets the paused navigation continue when they choose to leave', () => {
    const router = renderEditPage();

    fireEvent.click(screen.getByRole('button', { name: 'Change a field' }));
    fireEvent.click(screen.getByRole('link', { name: 'Leave' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }));

    expect(router.state.location.pathname).toBe('/other');
  });

  it('stops blocking once the changes are saved', () => {
    const router = renderEditPage();

    fireEvent.click(screen.getByRole('button', { name: 'Change a field' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('link', { name: 'Leave' }));

    expect(router.state.location.pathname).toBe('/other');
  });

  it('does not block a change of search on the same page', () => {
    const router = renderEditPage();

    fireEvent.click(screen.getByRole('button', { name: 'Change a field' }));
    fireEvent.click(screen.getByRole('link', { name: 'Same page' }));

    expect(router.state.location.search).toBe('?tab=2');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks the browser to warn before the tab is closed or reloaded', () => {
    renderEditPage();
    fireEvent.click(screen.getByRole('button', { name: 'Change a field' }));

    const event = new Event('beforeunload', { cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
  });

  it('does not warn before the tab is closed when nothing has changed', () => {
    renderEditPage();

    const event = new Event('beforeunload', { cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(false);
  });
});
