"use client";
import Icon from "./Icon";
import { track } from "@/lib/analytics";
import { useRef, useState } from "react";
import type { Plot } from "@/lib/types";
export default function LeadForm({
  plot = null,
  demo,
  source = "contacts",
  onSuccess,
}: {
  plot?: Plot | null;
  demo: boolean;
  source?: string;
  onSuccess?: () => void;
}) {
  const started = useRef(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false),
    [phone, setPhone] = useState("");
  const [key, setKey] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    const requestKey = key || crypto.randomUUID();
    setKey(requestKey);
    const utm = Object.fromEntries(
      [...new URLSearchParams(location.search)]
        .filter(([k]) => k.startsWith("utm_"))
        .slice(0, 10),
    );
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey,
          name: f.get("name"),
          phone,
          date: f.get("date"),
          comment: f.get("comment"),
          consent: f.get("consent") === "on",
          website: f.get("website"),
          plotId: plot?.id ?? null,
          kind: plot
            ? plot.status === "reserved"
              ? "availability"
              : "plot"
            : "viewing",
          source,
          pageUrl: location.origin + location.pathname,
          utm,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setSuccess(true);
      track(d.demo ? "demo_lead_success" : "lead_success", { source });
      setMessage(
        d.demo
          ? "Тестовая заявка сохранена. Это демонстрация: письмо менеджеру не отправлялось."
          : "Заявка принята. Менеджер свяжется с вами и согласует просмотр.",
      );
      onSuccess?.();
    } catch (e) {
      track("lead_error", { source });
      setMessage(
        e instanceof Error
          ? e.message
          : "Ошибка соединения. Повторите попытку или позвоните.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <div className="form-success" role="status">
        <span>✓</span>
        <h3>{demo ? "Заявка сохранена" : "Спасибо за обращение"}</h3>
        <p>{message}</p>
        <button
          className="button"
          onClick={() => {
            setSuccess(false);
            setMessage("");
            setKey("");
          }}
        >
          Новое обращение
        </button>
      </div>
    );
  return (
    <form
      onSubmit={submit}
      className="lead-form"
      onFocus={() => {
        if (!started.current) {
          track("lead_start", { source });
          started.current = true;
        }
      }}
    >
      {plot && (
        <p className="selected-plot">
          Участок № {plot.number} ·{" "}
          {plot.status === "reserved"
            ? "Уточнение доступности"
            : "Заявка по участку"}
        </p>
      )}
      {demo && (
        <p className="demo-note">
          Демонстрационный режим: заявка сохранится для проверки, письма не
          отправляются.
        </p>
      )}
      <div className="form-row">
        <label>
          Ваше имя
          <input
            name="name"
            autoComplete="given-name"
            maxLength={100}
            placeholder="Как к вам обращаться"
          />
        </label>
        <label>
          Телефон *
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => {
              const raw = e.target.value;
              const digits = raw.replace(/\D/g, "");
              if (!digits) {
                setPhone("");
                return;
              }
              const d = digits.replace(/^[78]/, "").slice(0, 10);
              setPhone(
                "+7" +
                  (d.length ? " (" + d.slice(0, 3) : "") +
                  (d.length >= 3 ? ") " : "") +
                  d.slice(3, 6) +
                  (d.length > 6 ? "-" + d.slice(6, 8) : "") +
                  (d.length > 8 ? "-" + d.slice(8, 10) : ""),
              );
            }}
            placeholder="+7 (___) ___-__-__"
          />
        </label>
      </div>
      <label>
        Удобная дата просмотра
        <input type="date" name="date" />
        <small>Менеджер согласует дату и время с вами.</small>
      </label>
      <label>
        Комментарий
        <textarea
          name="comment"
          rows={3}
          maxLength={2000}
          placeholder="Что важно для вашего будущего дома?"
        />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="checkbox">
        <input type="checkbox" name="consent" required />
        <span>
          Я согласен на обработку персональных данных:{" "}
          <a href="/consent" target="_blank" rel="noreferrer">
            согласие
          </a>{" "}
          и{" "}
          <a href="/privacy" target="_blank" rel="noreferrer">
            политика
          </a>
          {demo ? " (тестовые тексты)" : ""}.
        </span>
      </label>
      <button className="button primary" type="submit" disabled={busy}>
        {busy
          ? "Сохраняем…"
          : demo
            ? "Отправить тестовую заявку"
            : "Записаться на просмотр"}{" "}
        <span>
          <Icon />
        </span>
      </button>
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
      <small>
        Отправка заявки не бронирует участок. Предпочитаете звонок?{" "}
        <a href="tel:+79117774486">+7 911 777-44-86</a>
      </small>
    </form>
  );
}
