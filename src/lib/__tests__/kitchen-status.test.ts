import { describe, it, expect } from "vitest";
import {
  nextKitchenStatus,
  prevKitchenStatus,
  canTransition,
  timestampFieldFor,
  ACTIVE_KITCHEN_STATUSES,
  kitchenStatusLabel,
} from "@/lib/kitchen/status";

describe("kitchen status state machine", () => {
  it("advances QUEUED → PREPARING → READY → SERVED", () => {
    expect(nextKitchenStatus("QUEUED")).toBe("PREPARING");
    expect(nextKitchenStatus("PREPARING")).toBe("READY");
    expect(nextKitchenStatus("READY")).toBe("SERVED");
  });

  it("has no next after SERVED and ignores NONE", () => {
    expect(nextKitchenStatus("SERVED")).toBeNull();
    expect(nextKitchenStatus("NONE")).toBeNull();
  });

  it("steps back through the flow", () => {
    expect(prevKitchenStatus("SERVED")).toBe("READY");
    expect(prevKitchenStatus("READY")).toBe("PREPARING");
    expect(prevKitchenStatus("PREPARING")).toBe("QUEUED");
    expect(prevKitchenStatus("QUEUED")).toBeNull();
  });

  it("allows only single-step forward/back transitions", () => {
    expect(canTransition("QUEUED", "PREPARING")).toBe(true);
    expect(canTransition("PREPARING", "QUEUED")).toBe(true);
    expect(canTransition("PREPARING", "READY")).toBe(true);
    // skipping a step is not allowed
    expect(canTransition("QUEUED", "READY")).toBe(false);
    expect(canTransition("QUEUED", "SERVED")).toBe(false);
    // can't move a served order
    expect(canTransition("SERVED", "READY")).toBe(true); // one step back is allowed
    expect(canTransition("SERVED", "QUEUED")).toBe(false);
    // NONE is inert
    expect(canTransition("NONE", "QUEUED")).toBe(false);
  });

  it("maps each status to its timestamp column", () => {
    expect(timestampFieldFor("QUEUED")).toBe("kitchenQueuedAt");
    expect(timestampFieldFor("PREPARING")).toBe("kitchenPreparingAt");
    expect(timestampFieldFor("READY")).toBe("kitchenReadyAt");
    expect(timestampFieldFor("SERVED")).toBe("kitchenServedAt");
    expect(timestampFieldFor("NONE")).toBeNull();
  });

  it("board shows only queued/preparing/ready", () => {
    expect(ACTIVE_KITCHEN_STATUSES).toEqual(["QUEUED", "PREPARING", "READY"]);
    expect(ACTIVE_KITCHEN_STATUSES).not.toContain("SERVED");
    expect(ACTIVE_KITCHEN_STATUSES).not.toContain("NONE");
  });

  it("labels statuses for display", () => {
    expect(kitchenStatusLabel("QUEUED")).toBe("Queued");
    expect(kitchenStatusLabel("SERVED")).toBe("Served");
    expect(kitchenStatusLabel("NONE")).toBe("—");
  });
});
