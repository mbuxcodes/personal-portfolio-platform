import { Button } from '@/shared-ui/button';
import { classNames } from '@/utils/class-names';
import { getPageItems } from './get-page-items';

export interface PaginationProps {
  /** The page shown now, counting from 1. */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Names the navigation. Give each control on a page a different name. */
  label?: string;
}

/**
 * Previous and next buttons and the page numbers between them. It only draws what it is given
 * and reports the page that was chosen: no data is fetched here.
 *
 * Every control is a real `button`, so Tab, Enter and Space work. The current page is marked
 * with `aria-current="page"` and with a filled background, so it does not rely on color alone
 * (a number with a fill differs in shape from the others). With one page or none, nothing shows.
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  label = 'Pagination',
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const items = getPageItems(currentPage, totalPages);

  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          <Button
            variant="secondary"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Previous
          </Button>
        </li>
        {items.map((item, position) =>
          item === 'gap' ? (
            <li key={`gap-${position}`} aria-hidden="true" className="px-1 text-text-secondary">
              …
            </li>
          ) : (
            <li key={item}>
              <Button
                variant="secondary"
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? 'page' : undefined}
                className={classNames(
                  'min-w-12',
                  item === currentPage &&
                    'border-surface-inverse bg-surface-inverse text-text-inverse hover:bg-surface-inverse',
                )}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            </li>
          ),
        )}
        <li>
          <Button
            variant="secondary"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </Button>
        </li>
      </ul>
    </nav>
  );
}
