import { cn } from '../../utils/format';

export interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  isLoading?: boolean;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading = false,
}: CategoryFilterProps) {
  if (isLoading && categories.length === 0) {
    return (
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
        aria-label="Memuat kategori"
      >
        {[72, 96, 88, 80, 112].map((width) => (
          <div
            key={width}
            style={{ width: `${width}px` }}
            className="h-[44px] shrink-0 animate-pulse rounded-full border border-hairline bg-subtle"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Filter kategori produk"
      className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap sm:overflow-visible sm:pb-0"
    >
      <button
        type="button"
        aria-pressed={selectedCategory === ''}
        onClick={() => onSelectCategory('')}
        className={cn(
          'inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors duration-200',
          selectedCategory === ''
            ? 'border-ink bg-ink text-surface shadow-[var(--shadow-card)]'
            : 'border-hairline bg-surface text-ink-secondary hover:border-border-strong hover:text-ink',
        )}
      >
        Semua
      </button>

      {categories.map((category) => {
        const isActive = selectedCategory === category;
        return (
          <button
            key={category}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelectCategory(category)}
            className={cn(
              'inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors duration-200',
              isActive
                ? 'border-ink bg-ink text-surface shadow-[var(--shadow-card)]'
                : 'border-hairline bg-surface text-ink-secondary hover:border-border-strong hover:text-ink',
            )}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
