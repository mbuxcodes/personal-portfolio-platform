/** A page number, or a gap where pages are left out. */
export type PageItem = number | 'gap';

/**
 * Chooses which page numbers to show: the first page, the last page, and the pages next to the
 * current one, with a gap where the rest are left out. A short list shows every page.
 *
 * `getPageItems(5, 10)` returns `[1, 'gap', 4, 5, 6, 'gap', 10]`.
 */
export function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const shown = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: PageItem[] = [];

  shown.forEach((page, position) => {
    const previous = shown[position - 1];

    if (previous !== undefined && page - previous > 1) {
      // One missing page is shown as the page itself, since a gap would be no shorter.
      items.push(page - previous === 2 ? page - 1 : 'gap');
    }

    items.push(page);
  });

  return items;
}
