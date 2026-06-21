import { describe, it, expect, beforeEach } from "vitest";
import { dec } from "@/lib/money";
import { computeLineTotalForTest } from "@/lib/pos/cart-store-helpers";
import { useCart } from "@/lib/pos/cart-store";

// We re-implement the line-total math in this test (not importing from the
// store, which carries React/Zustand deps). This way the math test is
// fast and pure.

describe("cart math (pure functions)", () => {
  it("line total = (unitPrice + modifier sum) * qty", () => {
    // (25000 + 5000 variant + 5000 mod) * 2 = 70000
    const total = computeLineTotalForTest({
      unitPrice: "30000",
      discount: "0",
      modifierDeltas: ["5000"],
      qty: 2,
    });
    expect(total.toString()).toBe("70000");
  });

  it("line total with per-unit discount", () => {
    // (25000 - 2000 + 5000) * 2 = 56000
    const total = computeLineTotalForTest({
      unitPrice: "25000",
      discount: "2000",
      modifierDeltas: ["5000"],
      qty: 2,
    });
    expect(total.toString()).toBe("56000");
  });

  it("subtotal sums all lines", () => {
    const line1 = computeLineTotalForTest({ unitPrice: "25000", discount: "0", modifierDeltas: [], qty: 1 });
    const line2 = computeLineTotalForTest({ unitPrice: "30000", discount: "1000", modifierDeltas: ["5000"], qty: 3 });
    const sub = line1.plus(line2);
    // 25000 + (30000-1000+5000)*3 = 25000 + 102000 = 127000
    expect(sub.toString()).toBe("127000");
  });

  it("tax + discount math: (subtotal - discount) * (1 + taxPct/100)", () => {
    const sub = dec("127000");
    const disc = dec("2000");
    const taxRatePct = 10;
    const tax = sub.minus(disc).times(taxRatePct).dividedBy(100);
    const total = sub.minus(disc).plus(tax);
    // 125000 * 0.1 = 12500; total = 125000 + 12500 = 137500
    expect(tax.toString()).toBe("12500");
    expect(total.toString()).toBe("137500");
  });

  it("sub-penny stays exact", () => {
    const a = dec("0.10");
    const b = dec("0.20");
    expect(a.plus(b).toString()).toBe("0.3");
  });
});

describe("cart store (Zustand) basic actions", () => {
  beforeEach(() => {
    // reset the persisted store between tests
    useCart.setState({
      lines: [],
      orderDiscount: "0",
      orderDiscountCode: "",
      orderNotes: "",
      customerName: "",
      type: "DINE_IN",
    });
  });

  it("addLine creates a new line with qty=1", () => {
    useCart.getState().addLine({
      menuItemId: "m1",
      nameSnapshot: "Latte",
      variant: null,
      modifiers: [],
      unitPrice: "25000",
    });
    const lines = useCart.getState().lines;
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(1);
    expect(lines[0].menuItemId).toBe("m1");
  });

  it("addLine merges duplicate item+variant+modifiers (increment qty)", () => {
    const s = useCart.getState();
    s.addLine({ menuItemId: "m1", nameSnapshot: "Latte", variant: null, modifiers: [], unitPrice: "25000" });
    s.addLine({ menuItemId: "m1", nameSnapshot: "Latte", variant: null, modifiers: [], unitPrice: "25000" });
    s.addLine({ menuItemId: "m1", nameSnapshot: "Latte", variant: null, modifiers: [], unitPrice: "25000" });
    const lines = useCart.getState().lines;
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(3);
  });

  it("addLine does NOT merge different variants", () => {
    const s = useCart.getState();
    s.addLine({ menuItemId: "m1", nameSnapshot: "Latte", variant: { id: "v1", name: "S", priceDelta: "0" }, modifiers: [], unitPrice: "25000" });
    s.addLine({ menuItemId: "m1", nameSnapshot: "Latte", variant: { id: "v2", name: "L", priceDelta: "5000" }, modifiers: [], unitPrice: "30000" });
    expect(useCart.getState().lines).toHaveLength(2);
  });

  it("updateQty + removeLine", () => {
    const s = useCart.getState();
    s.addLine({ menuItemId: "m1", nameSnapshot: "X", variant: null, modifiers: [], unitPrice: "1000" });
    const lineId = useCart.getState().lines[0].lineId;
    s.updateQty(lineId, 5);
    expect(useCart.getState().lines[0].qty).toBe(5);
    s.updateQty(lineId, 0); // removes
    expect(useCart.getState().lines).toHaveLength(0);
  });

  it("subtotal reflects line changes", () => {
    const s = useCart.getState();
    s.addLine({ menuItemId: "m1", nameSnapshot: "X", variant: null, modifiers: [], unitPrice: "1000" });
    s.addLine({ menuItemId: "m2", nameSnapshot: "Y", variant: null, modifiers: [], unitPrice: "2000" });
    expect(useCart.getState().subtotal().toString()).toBe("3000");
  });

  it("clear empties everything", () => {
    const s = useCart.getState();
    s.addLine({ menuItemId: "m1", nameSnapshot: "X", variant: null, modifiers: [], unitPrice: "1000" });
    s.setOrderDiscount("500");
    s.setCustomerName("Alice");
    s.clear();
    expect(useCart.getState().lines).toHaveLength(0);
    expect(useCart.getState().orderDiscount).toBe("0");
    expect(useCart.getState().customerName).toBe("");
  });
});
