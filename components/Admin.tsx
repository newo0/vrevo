"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Plot, SiteContent, MediaItem, PostItem } from "@/lib/types";
import { statuses } from "@/lib/types";
import { PlotCanvas } from "./PlotExplorer";
import Dialog from "./Dialog";
type Lead = {
  id: string;
  phone: string;
  name: string | null;
  comment: string | null;
  date: string | null;
  kind: string;
  source: string;
  plotNumber: string | null;
  createdAt: string;
  demo: boolean;
  processed: boolean;
  deliveries: {
    recipient: string;
    status: string;
    attempts: number;
    error: string | null;
  }[];
};
const fieldLabels: Record<string, string> = {
  metrikaId: "Идентификатор Яндекс Метрики (пусто — отключена)",
  name: "Название",
  address: "Полный адрес",
  phone: "Телефон для ссылки (+7...)",
  phoneDisplay: "Телефон на сайте",
  contactName: "Менеджер",
  priceFrom: "Цена предложения от, ₽ / сот.",
  headline: "Заголовок",
  introduction: "Описание поселка",
  lakeText: "Озеро",
  natureText: "Заказник",
  cityText: "Луга и городские услуги",
  purchaseText: "Условия покупки",
  maintenanceText: "Коммуникации и обслуживание",
  privacy: "Политика обработки данных",
  consent: "Текст согласия",
  legalDetails: "Реквизиты продавца",
  workingHours: "Режим работы",
};
export default function Admin({
  authenticated,
  initialContent,
  initialPlots,
}: {
  authenticated: boolean;
  initialContent: SiteContent | null;
  initialPlots: Plot[];
}) {
  const [tab, setTab] = useState("plots"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [plots, setPlots] = useState(initialPlots),
    [content, setContent] = useState(initialContent),
    [dirty, setDirty] = useState(false),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<Plot | null>(null),
    [media, setMedia] = useState<MediaItem[]>([]),
    [posts, setPosts] = useState<PostItem[]>([]),
    [leads, setLeads] = useState<Lead[]>([]),
    [issues, setIssues] = useState<string[]>([]),
    [editMedia, setEditMedia] = useState<MediaItem | null>(null),
    [editPost, setEditPost] = useState<PostItem | null>(null);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  async function load(which: string) {
    try {
      const r = await fetch("/api/admin/" + which);
      if (!r.ok) throw Error("Требуется повторный вход");
      const d = await r.json();
      if (which === "media") setMedia(d);
      if (which === "posts") setPosts(d);
      if (which === "leads") setLeads(d);
      if (which === "readiness") setIssues(d.issues);
    } catch (e) {
      setMessage(String(e));
    }
  }
  async function changeTab(t: string) {
    if (
      dirty &&
      !confirm("Есть несохранённые изменения. Перейти без сохранения?")
    )
      return;
    setDirty(false);
    setSelected(null);
    setTab(t);
    if (["media", "posts", "leads", "readiness"].includes(t)) await load(t);
    if (t === "posts") await load("media");
  }
  async function save(resource: string, body: unknown) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/" + resource, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage("Сохранено");
      setDirty(false);
      if (resource === "plots") {
        const r = await fetch("/api/plots");
        setPlots((await r.json()).plots);
      } else if (["media", "posts", "leads"].includes(resource))
        await load(resource);
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ошибка соединения");
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!authenticated)
    return (
      <main className="admin-login">
        <Link href="/">← На сайт</Link>
        <h1>Вход для администратора</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const f = new FormData(e.currentTarget);
            try {
              const r = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: f.get("password") }),
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              location.reload();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Ошибка сети");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Пароль
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </label>
          <button className="button primary" disabled={busy}>
            Войти
          </button>
          {message && <p role="alert">{message}</p>}
        </form>
        <small>
          Первичная учётная запись создаётся командой npm run admin:create;
          инструкция в README.
        </small>
      </main>
    );
  function editContent(k: string, value: unknown) {
    setContent((c) => (c ? { ...c, [k]: value } : null));
    setDirty(true);
  }
  return (
    <main className="admin">
      <div className="admin-toolbar">
        <a href="/" target="_blank" rel="noreferrer">
          ← Открыть сайт
        </a>
        <button
          className="text-button"
          onClick={async () => {
            if (dirty && !confirm("Выйти без сохранения?")) return;
            await fetch("/api/logout", { method: "POST" });
            location.reload();
          }}
        >
          Выйти
        </button>
      </div>
      <h1>Управление посёлком</h1>
      <p>Изменения сохраняются без пересборки сайта.</p>
      <nav className="admin-tabs">
        {Object.entries({
          plots: "Участки",
          content: "Тексты и контакты",
          infrastructure: "Инфраструктура",
          routes: "Маршруты",
          media: "Фотографии",
          posts: "Ход строительства",
          leads: "Заявки",
          readiness: "Перед публикацией",
        }).map(([k, t]) => (
          <button
            className={tab === k ? "active" : ""}
            key={k}
            onClick={() => changeTab(k)}
          >
            {t}
          </button>
        ))}
      </nav>
      {message && (
        <div className="message" role="status">
          {message}{" "}
          <button className="text-button" onClick={() => setMessage("")}>
            Закрыть
          </button>
        </div>
      )}
      <div className="admin-panel">
        {tab === "plots" && (
          <>
            <div className="admin-notice">
              Сверка генплана: номер 134 повторяется на восточной и западной
              сторонах. Между 126 и 128 нет однозначно читаемого 127. Площади из
              мелкой таблицы не внесены без сверки. Контуры оцифрованы по
              растру; перед публикацией проверить точность.
            </div>
            <div className="admin-toolbar">
              <input
                aria-label="Поиск участка"
                placeholder="Номер участка"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Фильтр статусов"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Все статусы</option>
                {Object.entries(statuses).map(([k, t]) => (
                  <option value={k} key={k}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="plan-layout">
              <div className="admin-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Номер</th>
                      <th>Статус</th>
                      <th>Площадь</th>
                      <th>Цена</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {plots
                      .filter(
                        (p) =>
                          p.number.includes(search) &&
                          (filter === "all" || p.status === filter),
                      )
                      .sort((a, b) => Number(a.number) - Number(b.number))
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            {p.number}
                            {p.needsReview ? " ⚠" : ""}
                          </td>
                          <td>
                            {statuses[p.status as keyof typeof statuses] ??
                              "Ошибка статуса"}
                          </td>
                          <td>{p.areaM2 ?? "—"}</td>
                          <td>{p.priceRub ?? "По запросу"}</td>
                          <td>
                            <button
                              onClick={() => {
                                if (
                                  dirty &&
                                  !confirm("Отменить несохранённые изменения?")
                                )
                                  return;
                                setSelected(p);
                                setDirty(false);
                              }}
                            >
                              Изменить
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div>
                {selected ? (
                  <form
                    className="admin-editor"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (
                        await save("plots", {
                          id: selected.id,
                          values: {
                            status: selected.status,
                            areaM2: selected.areaM2,
                            priceRub: selected.priceRub,
                            description: selected.description,
                            cadastralNumber: selected.cadastralNumber,
                            electricityKw: selected.electricityKw,
                          },
                        })
                      )
                        setSelected(null);
                    }}
                  >
                    <h3 className="wide">Участок № {selected.number}</h3>
                    <label>
                      Статус
                      <select
                        value={selected.status}
                        onChange={(e) => {
                          setSelected({ ...selected, status: e.target.value });
                          setDirty(true);
                        }}
                      >
                        {Object.entries(statuses).map(([k, t]) => (
                          <option value={k} key={k}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    {[
                      ["areaM2", "Площадь, м²"],
                      ["priceRub", "Индивидуальная цена, ₽"],
                      ["electricityKw", "Электричество, кВт"],
                    ].map(([k, t]) => (
                      <label key={k}>
                        {t}
                        <input
                          type="number"
                          min="1"
                          value={selected[k as "areaM2"] ?? ""}
                          onChange={(e) => {
                            setSelected({
                              ...selected,
                              [k]: e.target.value
                                ? Number(e.target.value)
                                : null,
                            });
                            setDirty(true);
                          }}
                        />
                      </label>
                    ))}
                    <label className="wide">
                      Кадастровый номер
                      <input
                        value={selected.cadastralNumber ?? ""}
                        onChange={(e) => {
                          setSelected({
                            ...selected,
                            cadastralNumber: e.target.value || null,
                          });
                          setDirty(true);
                        }}
                      />
                    </label>
                    <label className="wide">
                      Описание
                      <textarea
                        value={selected.description ?? ""}
                        onChange={(e) => {
                          setSelected({
                            ...selected,
                            description: e.target.value || null,
                          });
                          setDirty(true);
                        }}
                      />
                    </label>
                    <small className="wide">
                      Обновлено:{" "}
                      {new Date(selected.updatedAt).toLocaleString("ru-RU")}
                    </small>
                    <button className="button primary wide" disabled={busy}>
                      Сохранить участок
                    </button>
                  </form>
                ) : (
                  <p>Выберите участок для редактирования.</p>
                )}
              </div>
            </div>
            <PlotCanvas
              plots={plots}
              selected={selected?.id ?? null}
              onSelect={(p) => {
                if (!dirty || confirm("Отменить изменения?")) {
                  setSelected(p);
                  setDirty(false);
                }
              }}
            />
          </>
        )}
        {content && ["content", "infrastructure", "routes"].includes(tab) && (
          <form
            className="admin-editor"
            onSubmit={async (e) => {
              e.preventDefault();
              await save("content", { values: content });
            }}
          >
            {tab === "content" &&
              Object.entries(fieldLabels).map(([k, t]) => (
                <label
                  key={k}
                  className={
                    [
                      "introduction",
                      "lakeText",
                      "natureText",
                      "cityText",
                      "purchaseText",
                      "maintenanceText",
                      "privacy",
                      "consent",
                      "legalDetails",
                    ].includes(k)
                      ? "wide"
                      : ""
                  }
                >
                  {t}
                  {["priceFrom"].includes(k) ? (
                    <input
                      type="number"
                      min="1"
                      value={content.priceFrom}
                      onChange={(e) => editContent(k, Number(e.target.value))}
                    />
                  ) : [
                      "introduction",
                      "lakeText",
                      "natureText",
                      "cityText",
                      "purchaseText",
                      "maintenanceText",
                      "privacy",
                      "consent",
                      "legalDetails",
                    ].includes(k) ? (
                    <textarea
                      value={String(content[k as keyof SiteContent])}
                      onChange={(e) => editContent(k, e.target.value)}
                    />
                  ) : (
                    <input
                      value={String(content[k as keyof SiteContent])}
                      onChange={(e) => editContent(k, e.target.value)}
                    />
                  )}
                </label>
              ))}
            {tab === "infrastructure" &&
              content.infrastructure.map((x, i) => (
                <fieldset key={i} className="wide admin-editor">
                  <legend>{x.title}</legend>
                  {Object.entries({
                    title: "Заголовок",
                    status: "Фактический статус",
                    description: "Описание",
                    season: "Срок / сезон",
                  }).map(([k, t]) => (
                    <label key={k}>
                      {t}
                      <textarea
                        value={x[k as keyof typeof x]}
                        onChange={(e) =>
                          editContent(
                            "infrastructure",
                            content.infrastructure.map((v, j) =>
                              j === i ? { ...v, [k]: e.target.value } : v,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </fieldset>
              ))}
            {tab === "routes" &&
              content.routes.map((x, i) => (
                <fieldset key={i} className="wide admin-editor">
                  <legend>{x.city}</legend>
                  {Object.entries({
                    city: "Город",
                    origin: "Координаты начала (широта,долгота)",
                    roads: "Дороги и пояснение",
                    distanceKm: "Расстояние, км (только проверенное)",
                    minutes: "Время, мин. (только проверенное)",
                    verifiedAt: "Дата проверки",
                  }).map(([k, t]) => (
                    <label key={k}>
                      {t}
                      <input
                        type={
                          ["distanceKm", "minutes"].includes(k)
                            ? "number"
                            : "text"
                        }
                        value={x[k as keyof typeof x] ?? ""}
                        onChange={(e) =>
                          editContent(
                            "routes",
                            content.routes.map((v, j) =>
                              j === i
                                ? {
                                    ...v,
                                    [k]: ["distanceKm", "minutes"].includes(k)
                                      ? e.target.value
                                        ? Number(e.target.value)
                                        : null
                                      : e.target.value || null,
                                  }
                                : v,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </fieldset>
              ))}
            {tab === "content" && (
              <label className="checkbox wide">
                <input
                  type="checkbox"
                  checked={content.analyticsEnabled ?? false}
                  onChange={(e) =>
                    editContent("analyticsEnabled", e.target.checked)
                  }
                />
                Включить аналитику после согласия посетителя
              </label>
            )}
            <button className="button primary wide" disabled={busy}>
              {busy ? "Сохраняем…" : "Сохранить изменения"}
            </button>
          </form>
        )}
        {tab === "media" && (
          <>
            <label>
              Загрузить фото (JPEG, PNG, WebP, до 10 МБ)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  try {
                    const form = new FormData();
                    form.set("file", f);
                    const r = await fetch("/api/admin/upload", {
                      method: "POST",
                      body: form,
                    });
                    const d = await r.json();
                    if (!r.ok) throw Error(d.error);
                    await load("media");
                    setEditMedia(d);
                    setMessage(
                      "Файл загружен. Добавьте подпись, автора и права.",
                    );
                  } catch (e) {
                    setMessage(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            <div className="admin-cards">
              {media.map((m) => (
                <article key={m.id}>
                  <img src={"/media/" + m.file} alt={m.title} />
                  <h3>{m.title}</h3>
                  <p>
                    {m.publicationStatus} ·{" "}
                    {m.published ? "Включено" : "Скрыто"}
                  </p>
                  <button className="button" onClick={() => setEditMedia(m)}>
                    Редактировать фото
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (
                        confirm(
                          "Удалить фотографию из каталога? Файл сохраняется для восстановления.",
                        )
                      )
                        void save("media", { id: m.id, action: "delete" });
                    }}
                  >
                    Удалить
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
        {tab === "posts" && (
          <>
            <button
              className="button primary"
              onClick={() =>
                setEditPost({
                  id: "",
                  title: "",
                  text: "",
                  date: new Date().toISOString().slice(0, 10),
                  mediaId: null,
                  published: false,
                })
              }
            >
              Добавить запись
            </button>
            <div className="admin-cards">
              {posts.map((p) => (
                <article key={p.id}>
                  <time>{p.date}</time>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                  <p>{p.published ? "Опубликовано" : "Черновик"}</p>
                  <button className="button" onClick={() => setEditPost(p)}>
                    Редактировать запись
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (confirm("Удалить запись строительства?"))
                        void save("posts", { id: p.id, action: "delete" });
                    }}
                  >
                    Удалить
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
        {tab === "leads" && (
          <>
            <button className="text-button" onClick={() => load("leads")}>
              Обновить список
            </button>
            <div className="admin-cards">
              {!leads.length && <p>Заявок пока нет.</p>}
              {leads.map((l) => (
                <article key={l.id}>
                  <small>
                    {new Date(l.createdAt).toLocaleString("ru-RU")}{" "}
                    {l.demo ? "· ТЕСТ" : ""}
                  </small>
                  <h3>
                    {l.name || "Без имени"} · {l.phone}
                  </h3>
                  <p>
                    Тип: {l.kind} · Участок {l.plotNumber ?? "не выбран"} · Дата{" "}
                    {l.date || "не указана"}
                  </p>
                  <p>{l.comment}</p>
                  <p>Источник: {l.source}</p>
                  {l.deliveries.map((d) => (
                    <p key={d.recipient}>
                      {d.recipient}: {d.status} · Попыток: {d.attempts}
                      {d.error && <span className="error">{d.error}</span>}
                    </p>
                  ))}
                  {!l.demo && (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        save("leads", { id: l.id, action: "retry" })
                      }
                    >
                      Повторить неотправленные
                    </button>
                  )}
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={l.processed}
                      onChange={(e) =>
                        save("leads", { id: l.id, processed: e.target.checked })
                      }
                    />
                    Обработана
                  </label>
                </article>
              ))}
            </div>
          </>
        )}
        {tab === "readiness" && (
          <>
            <h3>Проверка перед публикацией</h3>
            {issues.length ? (
              <ul>
                {issues.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : (
              <p>
                Автоматические проверки пройдены. Проверьте также SMTP,
                резервные копии и юридические документы.
              </p>
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                checked={content?.geometryReviewed ?? false}
                onChange={(e) =>
                  editContent("geometryReviewed", e.target.checked)
                }
              />
              Владелец сверил все номера, контуры и площади генплана
            </label>
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                if (content && (await save("content", { values: content })))
                  await load("readiness");
              }}
            >
              Сохранить сверку и проверить
            </button>
          </>
        )}
      </div>
      {editMedia && (
        <Dialog
          title="Редактирование фотографии"
          onClose={() => {
            if (!dirty || confirm("Закрыть без сохранения?")) {
              setEditMedia(null);
              setDirty(false);
            }
          }}
        >
          <h2>Фотография</h2>
          <form
            className="admin-editor"
            onSubmit={async (e) => {
              e.preventDefault();
              const { id, file, ...values } = editMedia;
              void file;
              if (await save("media", { id, values })) setEditMedia(null);
            }}
          >
            {Object.entries({
              title: "Подпись",
              category: "Категория",
              author: "Автор / правообладатель",
              source: "Страница источника (https)",
              license: "Лицензия",
              licenseUrl: "Ссылка на лицензию (https)",
              date: "Дата съёмки",
              order: "Порядок",
            }).map(([k, t]) => (
              <label key={k}>
                {t}
                <input
                  type={
                    k === "order" ? "number" : k === "date" ? "date" : "text"
                  }
                  value={
                    (editMedia[k as keyof MediaItem] as string | number) ?? ""
                  }
                  onChange={(e) => {
                    setEditMedia({
                      ...editMedia,
                      [k]:
                        k === "order"
                          ? Number(e.target.value)
                          : e.target.value || null,
                    });
                    setDirty(true);
                  }}
                />
              </label>
            ))}
            <label>
              Права
              <select
                value={editMedia.publicationStatus}
                onChange={(e) => {
                  setEditMedia({
                    ...editMedia,
                    publicationStatus: e.target.value,
                  });
                  setDirty(true);
                }}
              >
                <option value="rights_not_confirmed">Не подтверждены</option>
                <option value="rights_confirmed">
                  Подтверждены владельцем
                </option>
                <option value="allowed_with_attribution_and_sharealike">
                  CC BY-SA с атрибуцией
                </option>
              </select>
            </label>
            {(["published", "visualization"] as const).map((k) => (
              <label className="checkbox" key={k}>
                <input
                  type="checkbox"
                  checked={editMedia[k]}
                  onChange={(e) => {
                    setEditMedia({ ...editMedia, [k]: e.target.checked });
                    setDirty(true);
                  }}
                />
                {k === "published" ? "Показывать в галерее" : "Визуализация"}
              </label>
            ))}
            <button className="button primary wide" disabled={busy}>
              Сохранить фото
            </button>
          </form>
        </Dialog>
      )}
      {editPost && (
        <Dialog
          title="Запись строительства"
          onClose={() => {
            if (!dirty || confirm("Закрыть без сохранения?")) {
              setEditPost(null);
              setDirty(false);
            }
          }}
        >
          <h2>Ход строительства</h2>
          <form
            className="admin-editor"
            onSubmit={async (e) => {
              e.preventDefault();
              const { id, ...values } = editPost;
              if (await save("posts", { id, values })) setEditPost(null);
            }}
          >
            {Object.entries({
              title: "Заголовок",
              date: "Дата",
              text: "Что сделано",
            }).map(([k, t]) => (
              <label className="wide" key={k}>
                {t}
                <textarea
                  value={String(editPost[k as keyof PostItem])}
                  onChange={(e) => {
                    setEditPost({ ...editPost, [k]: e.target.value });
                    setDirty(true);
                  }}
                />
              </label>
            ))}
            <label className="wide">
              Фото
              <select
                value={editPost.mediaId ?? ""}
                onChange={(e) => {
                  setEditPost({ ...editPost, mediaId: e.target.value || null });
                  setDirty(true);
                }}
              >
                <option value="">Без фото</option>
                {media.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={editPost.published}
                onChange={(e) => {
                  setEditPost({ ...editPost, published: e.target.checked });
                  setDirty(true);
                }}
              />
              Опубликовано
            </label>
            <button className="button primary wide" disabled={busy}>
              Сохранить запись
            </button>
          </form>
        </Dialog>
      )}
    </main>
  );
}
