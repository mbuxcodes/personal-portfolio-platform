import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { getPageItems } from './get-page-items';
import { Pagination } from './pagination';

describe('getPageItems', () => {
  it('shows every page of a short list', () => {
    expect(getPageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('leaves a gap on each side of the current page in a long list', () => {
    expect(getPageItems(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
  });

  it('does not leave a gap for a single missing page', () => {
    expect(getPageItems(4, 10)).toEqual([1, 2, 3, 4, 5, 'gap', 10]);
  });

  it('handles the first and last pages', () => {
    expect(getPageItems(1, 10)).toEqual([1, 2, 'gap', 10]);
    expect(getPageItems(10, 10)).toEqual([1, 'gap', 9, 10]);
  });
});

describe('Pagination', () => {
  it('shows nothing for a single page', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('is a named navigation and marks the current page', () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} label="Project pages" />,
    );

    expect(screen.getByRole('navigation', { name: 'Project pages' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute('aria-current');
  });

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    rerender(<Pagination currentPage={3} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('reports the chosen page from the keyboard', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.tab();
    await user.tab();
    await user.tab();
    await user.keyboard(' ');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
    expect(onPageChange).toHaveBeenNthCalledWith(3, 3);
  });

  it('hides the gaps from assistive technology and offers only real controls', () => {
    const { container } = render(
      <Pagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />,
    );

    expect(container.querySelectorAll('li[aria-hidden="true"]')).toHaveLength(2);
    expect(screen.getAllByRole('button')).toHaveLength(7);
  });

  it('has no detectable violations', async () => {
    const { container } = render(
      <Pagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});
