/** Tableau moderne générique : colonnes déclaratives, tri optionnel géré par le parent */
export default function DataTable({ columns, rows, rowKey = 'id', onRowClick, emptyMessage = 'Aucune donnée', footer }) {
  if (!rows?.length) {
    return <div className="p-10 text-center text-sm text-steel-500">{emptyMessage}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="border-b border-steel-200 bg-steel-50">
          <tr>{columns.map((c) => <th key={c.key} className={`th ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-steel-100">
          {rows.map((row) => (
            <tr key={row[rowKey]} className={onRowClick ? 'cursor-pointer hover:bg-steel-50' : ''} onClick={() => onRowClick?.(row)}>
              {columns.map((c) => <td key={c.key} className={`td ${c.align === 'right' ? 'text-right' : ''}`}>{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {footer}
    </div>
  );
}
