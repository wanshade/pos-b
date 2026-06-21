/**
 * CSV export helpers.
 * Each report page has a "Download CSV" button that triggers a client-side
 * download via a Blob. Server-side streaming is also supported via the
 * route handlers below.
 */

export function rowsToCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export type CsvSection = {
  title: string;
  headers: string[];
  rows: (string | number)[][];
};

export function sectionsToCsv(sections: CsvSection[]): string {
  const parts: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    if (i > 0) parts.push("");
    parts.push(`# ${sections[i].title}`);
    parts.push(rowsToCsv(sections[i].headers, sections[i].rows));
  }
  return parts.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
