type MetricWindow = Window & {
  ym?: (id: number, method: string, ...args: unknown[]) => void;
  vrevoMetricId?: number;
};
export function track(
  event: string,
  params: Record<string, string | number> = {},
) {
  if (typeof window === "undefined") return;
  const w = window as MetricWindow;
  if (w.ym && w.vrevoMetricId)
    w.ym(w.vrevoMetricId, "reachGoal", event, params);
}
