"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv, rowsToCsv, sectionsToCsv, type CsvSection } from "./csv-export";

export function CsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        const csv = rowsToCsv(headers, rows);
        downloadCsv(filename, csv);
      }}
    >
      <DownloadIcon className="size-4" /> Download CSV
    </Button>
  );
}

export function CsvMultiButton({
  filename,
  sections,
}: {
  filename: string;
  sections: CsvSection[];
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        const csv = sectionsToCsv(sections);
        downloadCsv(filename, csv);
      }}
    >
      <DownloadIcon className="size-4" /> Export Report
    </Button>
  );
}
