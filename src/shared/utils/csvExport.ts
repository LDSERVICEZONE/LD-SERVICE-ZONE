/**
 * Utility to export tabular data to CSV with UTF-8 BOM support for Microsoft Excel
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][]
) {
  const sanitizeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    // Escape internal quotes by doubling them and enclose in quotes
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvRows: string[] = [];
  // Add headers
  csvRows.push(headers.map(sanitizeCell).join(","));

  // Add data rows
  for (const row of rows) {
    csvRows.push(row.map(sanitizeCell).join(","));
  }

  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.setAttribute("download", safeFilename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
