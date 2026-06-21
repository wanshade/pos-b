import { describe, it, expect } from "vitest";
import { rowsToCsv } from "@/components/reports/csv-export";

describe("rowsToCsv", () => {
  it("joins simple rows with commas", () => {
    const csv = rowsToCsv(["a", "b"], [["1", "2"], ["3", "4"]]);
    expect(csv).toBe("a,b\n1,2\n3,4");
  });

  it("quotes fields with commas", () => {
    const csv = rowsToCsv(["x"], [["a,b"]]);
    expect(csv).toBe('x\n"a,b"');
  });

  it("quotes fields with newlines", () => {
    const csv = rowsToCsv(["x"], [["line1\nline2"]]);
    expect(csv).toBe('x\n"line1\nline2"');
  });

  it("escapes double-quotes by doubling", () => {
    const csv = rowsToCsv(["x"], [['she said "hi"']]);
    expect(csv).toBe('x\n"she said ""hi"""');
  });

  it("coerces numbers", () => {
    const csv = rowsToCsv(["n"], [[42], [3.14]]);
    expect(csv).toBe("n\n42\n3.14");
  });

  it("empty rows returns just header", () => {
    expect(rowsToCsv(["a", "b"], [])).toBe("a,b");
  });
});
