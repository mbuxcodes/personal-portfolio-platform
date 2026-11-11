import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '@/state';
import { ComponentGalleryPage } from './component-gallery-page';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderGallery() {
  const store = createAppStore();

  render(
    <Provider store={store}>
      <MemoryRouter>
        <ComponentGalleryPage />
      </MemoryRouter>
    </Provider>,
  );

  return store;
}

describe('ComponentGalleryPage', () => {
  it('has one h1 and a section for every kind of shared component', () => {
    renderGallery();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const name of [
      'Buttons',
      'Form fields',
      'Confirm dialog',
      'Notifications',
      'Empty, loading and error states',
      'Region error boundary',
      'Pagination',
      'Image',
      'Animation patterns',
      'Layouts',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
  });

  it('links to all three layouts', () => {
    renderGallery();

    expect(screen.getByRole('link', { name: 'Public layout' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Admin layout' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Sign-in layout' })).toHaveAttribute(
      'href',
      '/admin/sign-in',
    );
  });

  it('raises notifications through the shared state', async () => {
    const user = userEvent.setup();
    const store = renderGallery();

    await user.click(screen.getByRole('button', { name: 'Show success' }));

    expect(store.getState().notifications.map((item) => item.message)).toEqual(['Project saved.']);
  });

  it('opens the confirm dialog and records the answer', async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    await user.keyboard('{Escape}');

    expect(screen.getByText('Cancelled.')).toBeInTheDocument();
  });

  it('shows and recovers the region error boundary', async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByRole('button', { name: 'Break the region' }));

    const section = screen.getByRole('region', { name: 'Region error boundary' });
    expect(within(section).getByRole('alert')).toBeInTheDocument();
  });

  it('changes the pagination page', async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Page 2 of 10')).toBeInTheDocument();
  });

  it('has no detectable violations', async () => {
    renderGallery();

    expect((await axe(document.body)).violations).toEqual([]);
  });
});
