/**
 * Kitchen status state machine.
 *
 * An order's kitchen lifecycle is independent of payment:
 *   QUEUED → PREPARING → READY → SERVED
 * Kitchen staff advance an order one step at a time. They can also send a
 * READY/PREPARING order back one step (e.g. mistaken tap), but cannot move a
 * SERVED order or touch an order that never entered the kitchen (NONE).
 */

import type { KitchenStatus } from "@prisma/client";

/** Statuses that are actively shown on the kitchen board. */
export const ACTIVE_KITCHEN_STATUSES: KitchenStatus[] = ["QUEUED", "PREPARING", "READY"];

/** Ordered prep stages (excludes NONE). */
export const KITCHEN_FLOW: KitchenStatus[] = ["QUEUED", "PREPARING", "READY", "SERVED"];

/** The next status in the flow, or null if already at the end / not in flow. */
export function nextKitchenStatus(current: KitchenStatus): KitchenStatus | null {
  const idx = KITCHEN_FLOW.indexOf(current);
  if (idx === -1 || idx === KITCHEN_FLOW.length - 1) return null;
  return KITCHEN_FLOW[idx + 1];
}

/** The previous status in the flow, or null if at the start / not in flow. */
export function prevKitchenStatus(current: KitchenStatus): KitchenStatus | null {
  const idx = KITCHEN_FLOW.indexOf(current);
  if (idx <= 0) return null;
  return KITCHEN_FLOW[idx - 1];
}

/** Whether a transition between two kitchen statuses is allowed. */
export function canTransition(from: KitchenStatus, to: KitchenStatus): boolean {
  return nextKitchenStatus(from) === to || prevKitchenStatus(from) === to;
}

/** Map a status to the Order timestamp column it should stamp (or null). */
export function timestampFieldFor(status: KitchenStatus):
  | "kitchenQueuedAt"
  | "kitchenPreparingAt"
  | "kitchenReadyAt"
  | "kitchenServedAt"
  | null {
  switch (status) {
    case "QUEUED": return "kitchenQueuedAt";
    case "PREPARING": return "kitchenPreparingAt";
    case "READY": return "kitchenReadyAt";
    case "SERVED": return "kitchenServedAt";
    default: return null;
  }
}

/** Human label for a kitchen status. */
export function kitchenStatusLabel(status: KitchenStatus): string {
  switch (status) {
    case "QUEUED": return "Queued";
    case "PREPARING": return "Preparing";
    case "READY": return "Ready";
    case "SERVED": return "Served";
    default: return "—";
  }
}
