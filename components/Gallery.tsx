"use client";
import { useState } from "react";
import type { MediaItem } from "@/lib/types";
import Dialog from "./Dialog";
export function PhotoCredit({ m }: { m: MediaItem }) {
  return (
    <div className="photo-credit">
      <span>
        {m.title}
        {m.visualization ? " · Визуализация" : ""}
      </span>
      <small>
        {m.author} ·{" "}
        <a href={m.source || undefined} target="_blank" rel="noreferrer">
          Источник
        </a>
        {m.licenseUrl && (
          <>
            {" "}
            ·{" "}
            <a href={m.licenseUrl} target="_blank" rel="noreferrer">
              {m.license}
            </a>
          </>
        )}
        {m.publicationStatus === "rights_not_confirmed"
          ? " · Права на публикацию уточняются"
          : ""}{" "}
        · Веб-копия: масштабирование и кадрирование. Оригинал сохранён.
      </small>
    </div>
  );
}
export default function Gallery({ media }: { media: MediaItem[] }) {
  const [category, setCategory] = useState("Все"),
    [current, setCurrent] = useState<MediaItem | null>(null);
  const cats = ["Все", ...new Set(media.map((m) => m.category))];
  return (
    <>
      <div className="gallery-tabs">
        {cats.map((c) => (
          <button
            className={category === c ? "active" : ""}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="gallery-grid">
        {media
          .filter((m) => category === "Все" || m.category === category)
          .map((m) => (
            <figure key={m.id}>
              <button
                type="button"
                onClick={() => setCurrent(m)}
                aria-label={"Открыть фото: " + m.title}
              >
                <img
                  src={"/media/" + m.file}
                  width={640}
                  height={420}
                  alt={m.title}
                  loading="lazy"
                />
              </button>
              <figcaption>
                <PhotoCredit m={m} />
              </figcaption>
            </figure>
          ))}
      </div>
      {current && (
        <Dialog title={current.title} onClose={() => setCurrent(null)}>
          <img
            className="lightbox-image"
            src={"/media/" + current.file}
            alt={current.title}
          />
          <PhotoCredit m={current} />
        </Dialog>
      )}
    </>
  );
}
