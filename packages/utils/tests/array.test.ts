import { describe, expect, it } from 'vitest';
import { groupBy, chunk, uniqueBy, sortBy, partition } from '../src/array.js';

const orders = [
  { id: 'o1', status: 'pending', total: 100 },
  { id: 'o2', status: 'paid', total: 250 },
  { id: 'o3', status: 'paid', total: 40 },
  { id: 'o4', status: 'pending', total: 900 },
];

describe('array utils', () => {
  it('groups by a selector', () => {
    const grouped = groupBy(orders, (o) => o.status);
    expect(grouped.pending).toHaveLength(2);
    expect(grouped.paid).toHaveLength(2);
  });

  it('chunks into fixed sizes', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });

  it('dedupes by a selector', () => {
    const items = [{ k: 'a', v: 1 }, { k: 'a', v: 2 }, { k: 'b', v: 3 }];
    expect(uniqueBy(items, (i) => i.k)).toEqual([{ k: 'a', v: 1 }, { k: 'b', v: 3 }]);
  });

  it('sorts ascending and descending', () => {
    expect(sortBy(orders, (o) => o.total).map((o) => o.total)).toEqual([40, 100, 250, 900]);
    expect(sortBy(orders, (o) => o.total, 'desc').map((o) => o.total)).toEqual([900, 250, 100, 40]);
    expect(sortBy(orders, (o) => o.id)).toEqual(orders);
  });

  it('partitions by a predicate', () => {
    const [paid, pending] = partition(orders, (o) => o.status === 'paid');
    expect(paid.map((o) => o.id)).toEqual(['o2', 'o3']);
    expect(pending.map((o) => o.id)).toEqual(['o1', 'o4']);
  });
});