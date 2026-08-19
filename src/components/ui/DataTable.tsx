interface DataTableProps {
  columns: string[];
  rows: Array<Array<string | number | boolean>>;
  emptyMessage?: string;
}

export function DataTable({
  columns,
  rows,
  emptyMessage = "No data available.",
}: DataTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="px-4 py-3 text-left font-medium text-zinc-600"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-zinc-800">
                  {String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
