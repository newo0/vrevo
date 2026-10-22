"use client";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
export default function Analytics({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) {
  const [consent, setConsent] = useState<string | null>(null);
  useEffect(() => {
    setConsent(localStorage.getItem("vrevo-analytics-consent"));
  }, []);
  useEffect(() => {
    if (!enabled || !/^\d+$/.test(id) || consent !== "yes") return;
    const w = window as Window & {
      ym?: (id: number, method: string, ...args: unknown[]) => void;
      vrevoMetricId?: number;
    };
    const queue: unknown[][] = [];
    if (!w.ym) {
      const fn = (...args: unknown[]) => {
        queue.push(args);
      };
      Object.assign(fn, { a: queue, l: Date.now() });
      w.ym = fn as (id: number, method: string, ...args: unknown[]) => void;
    }
    w.vrevoMetricId = Number(id);
    w.ym?.(Number(id), "init", {
      clickmap: false,
      trackLinks: false,
      accurateTrackBounce: true,
      webvisor: false,
    });
    const script = document.createElement("script");
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    script.async = true;
    document.head.appendChild(script);
    const listener = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("a");
      const href = el?.getAttribute("href") ?? "";
      if (href === "#plots") track("plots_open");
      if (href.startsWith("tel:")) track("phone_click");
      if (href.includes("yandex.ru/maps/")) track("route_open");
    };
    document.addEventListener("click", listener);
    return () => {
      document.removeEventListener("click", listener);
      script.remove();
      w.vrevoMetricId = undefined;
    };
  }, [id, enabled, consent]);
  if (!enabled || !/^\d+$/.test(id) || consent !== null) return null;
  return (
    <div
      className="analytics-consent"
      role="region"
      aria-label="Настройка аналитики"
    >
      <p>
        Разрешить Яндекс Метрику для анализа использования сайта? Контакты из
        заявок в события не передаются.
      </p>
      <button
        className="button primary"
        onClick={() => {
          localStorage.setItem("vrevo-analytics-consent", "yes");
          setConsent("yes");
        }}
      >
        Разрешить
      </button>
      <button
        className="button"
        onClick={() => {
          localStorage.setItem("vrevo-analytics-consent", "no");
          setConsent("no");
        }}
      >
        Без аналитики
      </button>
    </div>
  );
}
