import { fullRowsClassName, fullRowsCount, fullRowsHidesSome } from './full-rows';

describe('fullRowsCount', () => {
  it('cuts to the last full row, unless there is not even one', () => {
    expect(fullRowsCount(4, 3)).toBe(3);
    expect(fullRowsCount(4, 2)).toBe(4);
    expect(fullRowsCount(3, 2)).toBe(2);
    expect(fullRowsCount(6, 3)).toBe(6);
    expect(fullRowsCount(2, 3)).toBe(2);
    expect(fullRowsCount(0, 3)).toBe(0);
  });
});

describe('fullRowsClassName', () => {
  const columns = { base: 1, sm: 2, lg: 3 };

  it('hides each item only at the breakpoints where it would be alone in its row', () => {
    // 4 items: all of them in 1 and 2 columns, 3 in 3 columns.
    expect([0, 1, 2, 3].map((index) => fullRowsClassName(index, 4, columns))).toEqual([
      '',
      '',
      '',
      'lg:max-xl:hidden xl:max-2xl:hidden 2xl:max-3xl:hidden 3xl:hidden',
    ]);
    // 3 items: 2 in 2 columns, all in 1 and 3.
    expect(fullRowsClassName(2, 3, columns)).toBe('sm:max-md:hidden md:max-lg:hidden');
  });

  it('keeps everything when the rows are full or there are fewer items than columns', () => {
    expect([0, 1, 2, 3, 4, 5].every((index) => fullRowsClassName(index, 6, columns) === '')).toBe(
      true,
    );
    expect(fullRowsClassName(1, 2, columns)).toBe('');
  });
});

describe('fullRowsHidesSome', () => {
  it('never hides items of a full list (count 0)', () => {
    const columns = { base: 1, sm: 2, lg: 3 };
    for (let index = 0; index < 5; index++) expect(fullRowsClassName(index, 0, columns)).toBe('');
  });

  it('tells whether any breakpoint leaves an item out', () => {
    expect(fullRowsHidesSome(3, { sm: 2, xl: 3 })).toBe(true);
    expect(fullRowsHidesSome(4, { '2xl': 2 })).toBe(false);
    expect(fullRowsHidesSome(4, { sm: 2, lg: 3 })).toBe(true);
    expect(fullRowsHidesSome(6, { sm: 2, lg: 3 })).toBe(false);
    expect(fullRowsHidesSome(1, { base: 2, md: 3 })).toBe(false);
  });
});
