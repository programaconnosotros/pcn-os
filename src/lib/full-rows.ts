// A capped preview grid (the last 6 setups, 3 projects…) changes its column count with the
// screen, so the same items that fill 3 columns leave a hole in 2. `fullRowsClassName` hides, at
// each breakpoint, the items past the last full row: 4 items show as 4 in 2 columns and 3 in 3.
// When there are fewer items than columns they all stay, there's no full row to cut to.
// Only `hidden` is added per range, so each cell keeps its own display (flex, block, grid).

const BREAKPOINTS = ['base', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

/** Columns from each breakpoint up, like `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. */
export type Columns = Partial<Record<Breakpoint, number>>;

// Full class names, so Tailwind finds them in the source.
const HIDDEN: Record<Breakpoint, string> = {
  base: 'max-sm:hidden',
  sm: 'sm:max-md:hidden',
  md: 'md:max-lg:hidden',
  lg: 'lg:max-xl:hidden',
  xl: 'xl:max-2xl:hidden',
  '2xl': '2xl:max-3xl:hidden',
  '3xl': '3xl:hidden',
};

/** How many of `count` items fit in full rows of `columns`. */
export const fullRowsCount = (count: number, columns: number) =>
  count < columns ? count : count - (count % columns);

/**
 * Classes for the item at `index` of `count`, hiding it where it would start a partial row. An
 * item outside `count` isn't part of a capped preview (a full list passes 0): it always shows.
 */
export const fullRowsClassName = (index: number, count: number, columns: Columns) => {
  if (index >= count) return '';
  let current = 1;
  return BREAKPOINTS.flatMap((breakpoint) => {
    current = columns[breakpoint] ?? current;
    return index >= fullRowsCount(count, current) ? [HIDDEN[breakpoint]] : [];
  }).join(' ');
};

/** Whether some of `count` items get hidden at any breakpoint, so a preview links to the rest. */
export const fullRowsHidesSome = (count: number, columns: Columns) => {
  let current = 1;
  return BREAKPOINTS.some((breakpoint) => {
    current = columns[breakpoint] ?? current;
    return fullRowsCount(count, current) < count;
  });
};
