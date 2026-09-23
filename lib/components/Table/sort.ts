export const ASCENDING = 'ascending'
export const DESCENDING = 'descending'

export type SortDirection = typeof ASCENDING | typeof DESCENDING

export interface TableSort {
  key: string
  direction: SortDirection
}

/** Reads a column off a row for sorting. Memoise a set of these - they are a dependency of the sort. */
export type TableSortValues<TRow> = Record<string, (row: TRow) => unknown>

function text (value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return value.toString()

  return JSON.stringify(value)
}

function compare (a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === undefined || a === null) return -1
  if (b === undefined || b === null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()

  return text(a).localeCompare(text(b))
}

function readColumn (row: unknown, key: string): unknown {
  // rows are plain objects, and a column with no matching property sorts as undefined
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- an unconstrained TRow cannot be indexed by an arbitrary string
  return (row as Record<string, unknown>)[key]
}

/**
 * What clicking a column asks for: the column already sorted by flips
 * direction, and any other takes `firstDirection`.
 */
export function nextSort (sort: TableSort | undefined, key: string, firstDirection: SortDirection = ASCENDING): TableSort {
  if (sort?.key !== key) return { key, direction: firstDirection }

  return { key, direction: sort.direction === ASCENDING ? DESCENDING : ASCENDING }
}

/**
 * Rows in the order a sort asks for, comparing numbers, dates and strings each
 * on their own terms.
 *
 * A Table doesn't sort what it is given - rows ordered by the server, which is
 * the only way to rank or page over more rows than are on screen, would be
 * reordered by a table that insisted on sorting. Use this where the rows are
 * all in hand and sorting them in the browser is the whole job:
 *
 * ```tsx
 * const [sort, setSort] = useState<TableSort>({ key: 'name', direction: ASCENDING })
 * const sorted = useMemo(() => sortRows(devices, sort), [devices, sort])
 *
 * <Table sort={sort} onSortChange={setSort}>…</Table>
 * ```
 *
 * @param rows The rows to order. They are copied rather than sorted in place.
 * @param sort The column to order by, and which way. Rows are returned as they came when there is none.
 * @param sortValues For columns that don't sort by `row[key]`, e.g. one showing a relative time that should sort by its timestamp.
 */
export function sortRows<TRow> (rows: TRow[], sort?: TableSort, sortValues?: TableSortValues<TRow>): TRow[] {
  if (!sort) return rows

  const { key } = sort
  const sortValue = sortValues?.[key] ?? ((row: TRow) => readColumn(row, key))
  const direction = sort.direction === DESCENDING ? -1 : 1

  return [...rows].sort((a, b) => compare(sortValue(a), sortValue(b)) * direction)
}
