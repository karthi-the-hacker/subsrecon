import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Select } from './Select';

export interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [
      1,
      'ellipsis',
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      'ellipsis',
      totalPages,
    ];
  };

  const pages = getPageNumbers();

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-dark-card/80 backdrop-blur-md border border-dark-border/80 rounded-xl text-xs font-mono text-dark-muted ${className}`}
    >
      <div className="flex items-center gap-3">
        <span>
          SHOWING <span className="font-bold text-primary">{startItem}</span> -{' '}
          <span className="font-bold text-primary">{endItem}</span> OF{' '}
          <span className="font-bold text-dark-text">{totalItems}</span> NODES
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-dark-border/80 pl-3">
            <span>PER_PAGE:</span>
            <div className="w-20">
              <Select<number>
                size="sm"
                value={pageSize}
                options={pageSizeOptions.map((opt) => ({ value: opt, label: String(opt) }))}
                isSearchable={false}
                onChange={(val) => val && onPageSizeChange(val)}
                aria-label="Items per page"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          aria-label="Previous Page"
          className="px-2 py-1"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-dark-muted">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                aria-current={p === safeCurrentPage ? 'page' : undefined}
                className={`min-w-[28px] h-7 px-2 rounded font-mono font-bold text-xs transition-all ${
                  p === safeCurrentPage
                    ? 'bg-primary text-dark-bg font-extrabold shadow-[0_0_10px_rgba(0,255,136,0.6)]'
                    : 'text-dark-muted hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/30'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          aria-label="Next Page"
          className="px-2 py-1"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </nav>
  );
};
