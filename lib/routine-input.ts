import "server-only";
import type { RoutineStepInput } from "@/lib/skin";
import { intIn, text } from "@/lib/validate";

export function parseRoutineStep(body: Record<string, unknown> | null): RoutineStepInput | string {
  const label = text(body?.label, 60);
  if (label.length < 2) return "Adım adı en az 2 karakter olmalı.";
  const timers = Array.isArray(body?.timers)
    ? [...new Set(body.timers.filter((t): t is number => Number.isInteger(t) && t >= 10 && t <= 3 * 3600))]
        .sort((a, b) => a - b)
        .slice(0, 3)
    : [];
  const weeklyTarget = body?.weeklyTarget === undefined || body?.weeklyTarget === null ? null : intIn(body.weeklyTarget, 1, 7);
  if (body?.weeklyTarget !== undefined && body?.weeklyTarget !== null && weeklyTarget === null) {
    return "Haftalık hedef 1 ile 7 arasında olmalı.";
  }
  return { label, detail: text(body?.detail, 200), timers, weeklyTarget };
}
