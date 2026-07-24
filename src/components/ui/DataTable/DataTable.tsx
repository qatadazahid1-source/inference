import styles from './DataTable.module.css';

interface Column<T = any> {
  header: string;
  accessorKey: string;
  cell?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * Resolves a dot-notation accessor key like "users.full_name" from a row object.
 * e.g. getNestedValue({ users: { full_name: "Ali" } }, "users.full_name") => "Ali"
 */
function getNestedValue(obj: any, key: string): any {
  return key.split('.').reduce((acc, part) => acc?.[part], obj);
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No data found.',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.accessorKey}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.accessorKey}>
                    <div className={styles.skeleton} style={{ width: `${60 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.accessorKey}>{col.header}</th>
              ))}
            </tr>
          </thead>
        </table>
        <div className={styles.empty}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.accessorKey}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {columns.map((col) => {
                const rawValue = getNestedValue(row, col.accessorKey);
                return (
                  <td key={col.accessorKey}>
                    {col.cell ? col.cell(rawValue, row) : (rawValue ?? '—')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
