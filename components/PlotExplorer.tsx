"use client";
import Icon from "./Icon";
import { useEffect, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { track } from "@/lib/analytics";
import geometry from "@/data/geometry.json";
import { statuses, type Plot } from "@/lib/types";
export function PlotCanvas({
  plots,
  selected,
  onSelect,
  filter = "all",
  visibleIds,
}: {
  plots: Plot[];
  selected: string | null;
  onSelect: (p: Plot) => void;
  filter?: string;
  visibleIds?: Set<string>;
}) {
  const lookup = new Map(plots.map((p) => [p.id, p]));
  return (
    <TransformWrapper
      minScale={0.8}
      maxScale={5}
      initialScale={1}
      limitToBounds
      doubleClick={{ disabled: true }}
      wheel={{ step: 0.12, activationKeys: ["Control"] }}
      panning={{ excluded: ["plot-shape"] }}
    >
      {({ zoomIn, zoomOut, resetTransform }) => (
        <div className="plan-frame">
          <div className="plan-tools">
            <button
              type="button"
              aria-label="Увеличить схему"
              onClick={() => zoomIn()}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Уменьшить схему"
              onClick={() => zoomOut()}
            >
              −
            </button>
            <button type="button" onClick={() => resetTransform()}>
              Весь посёлок
            </button>
          </div>
          <TransformComponent
            wrapperClass="plan-wrapper"
            contentClass="plan-content"
          >
            <svg
              viewBox="0 0 878 1041"
              role="group"
              aria-label="Схема участков поселка"
              className="plot-svg"
            >
              <defs>
                <pattern
                  id="sold"
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="8" height="8" fill="#bdc3bb" />
                  <path d="M0 8L8 0" stroke="#7c877e" strokeWidth="2" />
                </pattern>
                <pattern
                  id="reserved"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="10" height="10" fill="#e4c57b" />
                  <circle cx="5" cy="5" r="1.5" fill="#86622a" />
                </pattern>
              </defs>
              <image href="/plan/genplan.webp" width="878" height="1041" />
              {geometry.plots.map((g) => {
                const p = lookup.get(g.id);
                return (
                  <polygon
                    key={g.id}
                    className={
                      "plot-shape " + (selected === g.id ? "selected" : "")
                    }
                    points={g.points.map((p) => p.join(",")).join(" ")}
                    fill={
                      p?.status === "available"
                        ? "#a9c89a"
                        : p?.status === "sold"
                          ? "url(#sold)"
                          : p?.status === "reserved"
                            ? "url(#reserved)"
                            : "#c9c9c9"
                    }
                    fillOpacity={
                      (filter !== "all" && p?.status !== filter) ||
                      (visibleIds && !visibleIds.has(g.id))
                        ? 0.1
                        : 0.74
                    }
                    stroke={selected === g.id ? "#163f33" : "#405447"}
                    strokeWidth={selected === g.id ? 5 : 1}
                    tabIndex={-1}
                    onClick={() => p && onSelect(p)}
                  >
                    <title>{`Участок ${g.number}: ${p ? (statuses[p.status as keyof typeof statuses] ?? "Статус уточняется") : "Нет актуальных данных"}`}</title>
                  </polygon>
                );
              })}
            </svg>
          </TransformComponent>
          <p className="plan-hint">
            Перемещайте фон схемы · Масштаб: кнопки, щипок или Ctrl + колесо
          </p>
        </div>
      )}
    </TransformWrapper>
  );
}
export default function PlotExplorer({
  initialPlots,
  onEnquire,
}: {
  initialPlots: Plot[];
  onEnquire: (plot: Plot) => void;
}) {
  const [plots, setPlots] = useState(initialPlots),
    [selected, setSelected] = useState<string | null>(null),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [view, setView] = useState("map"),
    [error, setError] = useState(""),
    [areaMin, setAreaMin] = useState(""),
    [priceMax, setPriceMax] = useState("");
  async function refresh() {
    try {
      const r = await fetch("/api/plots", { cache: "no-store" });
      if (!r.ok) throw Error();
      setPlots((await r.json()).plots);
      setError("");
    } catch {
      setError("Не удалось загрузить актуальные статусы. Позвоните менеджеру.");
    }
  }
  useEffect(() => {
    const num = new URLSearchParams(location.search).get("plot");
    const found = initialPlots.find((p) => p.id === num || p.number === num);
    if (found) setSelected(found.id);
    function focus() {
      void refresh();
    }
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [initialPlots]);
  function choose(p: Plot) {
    track("plot_select", { plotId: p.id });
    setSelected(p.id);
    const u = new URL(location.href);
    u.searchParams.set("plot", p.id);
    history.replaceState(null, "", u);
  }
  const p = plots.find((p) => p.id === selected),
    visible = plots
      .filter(
        (p) =>
          (filter === "all" || p.status === filter) &&
          (!search || p.number.includes(search)) &&
          (!areaMin ||
            (p.areaM2 !== null && p.areaM2 >= Number(areaMin) * 100)) &&
          (!priceMax ||
            (p.priceRub !== null && p.priceRub <= Number(priceMax))),
      )
      .sort((a, b) => Number(a.number) - Number(b.number));
  return (
    <div className="explorer">
      <div className="filter-bar">
        <label>
          Статус
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Все участки</option>
            {Object.entries(statuses).map(([v, t]) => (
              <option value={v} key={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Номер
          <input
            value={search}
            inputMode="numeric"
            placeholder="Например, 68"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {plots.some((p) => p.areaM2 !== null) && (
          <label>
            Площадь от, сот.
            <input
              type="number"
              min="0"
              value={areaMin}
              onChange={(e) => setAreaMin(e.target.value)}
            />
          </label>
        )}
        {plots.some((p) => p.priceRub !== null) && (
          <label>
            Цена до, ₽
            <input
              type="number"
              min="1"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </label>
        )}
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setFilter("all");
            setSearch("");
            setAreaMin("");
            setPriceMax("");
          }}
        >
          Сбросить фильтры
        </button>
        <div className="segmented">
          <button
            type="button"
            aria-pressed={view === "map"}
            onClick={() => setView("map")}
          >
            Схема
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            Список
          </button>
        </div>
      </div>
      <div className="legend">
        <span>
          <i className="dot available" />
          Свободен
        </span>
        <span>
          <i className="dot reserved" />
          Забронирован
        </span>
        <span>
          <i className="dot sold" />
          Продан
        </span>
      </div>
      {error && (
        <p role="alert" className="error">
          {error} <button onClick={refresh}>Повторить</button>
        </p>
      )}
      <div className="plan-layout">
        <div>
          {!visible.length && (
            <p role="status" className="empty">
              Нет подходящих участков
            </p>
          )}
          {view === "map" ? (
            <PlotCanvas
              plots={error ? [] : plots}
              visibleIds={new Set(visible.map((p) => p.id))}
              selected={selected}
              filter={filter}
              onSelect={choose}
            />
          ) : (
            <div className="plot-list" role="list" aria-label="Список участков">
              {visible.map((p) => (
                <button
                  role="listitem"
                  type="button"
                  key={p.id}
                  className={selected === p.id ? "active" : ""}
                  onClick={() => choose(p)}
                >
                  <strong>№ {p.number}</strong>
                  <span>
                    {statuses[p.status as keyof typeof statuses] ??
                      "Статус уточняется"}
                  </span>
                  <small>
                    {p.areaM2 ? `${p.areaM2 / 100} сот.` : "Площадь уточняется"}
                  </small>
                </button>
              ))}
            </div>
          )}
        </div>
        <aside className="plot-card" aria-live="polite">
          {p ? (
            <>
              <div className="eyebrow">Ваш выбор</div>
              <h3>Участок № {p.number}</h3>
              <p className={"status " + p.status}>
                {statuses[p.status as keyof typeof statuses] ??
                  "Статус уточняется"}
              </p>
              {p.areaM2 && (
                <p>
                  {p.areaM2 / 100} сот. · {p.areaM2} м²
                </p>
              )}
              <div className="plot-price">
                {p.priceRub
                  ? `${p.priceRub.toLocaleString("ru-RU")} ₽`
                  : "Стоимость по запросу"}
              </div>
              {p.priceRub && p.areaM2 && (
                <p>
                  {Math.round((p.priceRub / p.areaM2) * 100).toLocaleString(
                    "ru-RU",
                  )}{" "}
                  ₽ / сот.
                </p>
              )}
              {p.cadastralNumber && (
                <p>Кадастровый номер: {p.cadastralNumber}</p>
              )}
              <p>
                Электричество по границе, 15 кВт. Подключение оплачивается
                отдельно.
              </p>
              {p.description && <p>{p.description}</p>}
              {p.needsReview && (
                <p className="muted">
                  Номер по исходной схеме; требует сверки.
                </p>
              )}
              {["available", "reserved"].includes(p.status) ? (
                <button
                  className="button primary"
                  disabled={!!error}
                  onClick={async () => {
                    try {
                      const r = await fetch("/api/plots", {
                        cache: "no-store",
                      });
                      if (!r.ok) throw Error();
                      const fresh: Plot[] = (await r.json()).plots;
                      setPlots(fresh);
                      const current = fresh.find((q) => q.id === p.id);
                      if (
                        current &&
                        ["available", "reserved"].includes(current.status)
                      )
                        onEnquire(current);
                      else
                        setError(
                          "Статус изменился. Выберите свободный участок.",
                        );
                    } catch {
                      setError(
                        "Не удалось проверить актуальный статус. Повторите попытку.",
                      );
                    }
                  }}
                >
                  {p.status === "reserved"
                    ? "Уточнить доступность"
                    : "Оставить заявку по участку"}
                </button>
              ) : (
                <>
                  <p>Этот участок недоступен для заявки.</p>
                  <button
                    className="button"
                    onClick={() => {
                      setFilter("available");
                      setSelected(null);
                      setView("list");
                    }}
                  >
                    Посмотреть свободные
                  </button>
                </>
              )}
              <button
                className="text-button"
                onClick={() => navigator.clipboard?.writeText(location.href)}
              >
                Скопировать ссылку на участок
              </button>
              <small>Заявка не является подтверждённой бронью.</small>
            </>
          ) : (
            <>
              <span className="eyebrow">Место для вашего дома</span>
              <h3>Начните с участка</h3>
              <p>
                Выберите контур на схеме или откройте список. Здесь появятся его
                статус и известные параметры.
              </p>
              <div className="card-decoration">
                <Icon name="home" />
              </div>
              <small>
                Генплан — рекламная схема. Границы и площади уточняются по
                документам.
              </small>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
