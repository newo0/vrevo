"use client";
import Icon from "./Icon";
import Link from "next/link";
import { useState } from "react";
import type { SiteContent, MediaItem, Plot, PostItem } from "@/lib/types";
import Analytics from "./Analytics";
import PlotExplorer from "./PlotExplorer";
import LeadForm from "./LeadForm";
import Dialog from "./Dialog";
import Gallery, { PhotoCredit } from "./Gallery";
const entry = "58.584476,29.856943";
const route = (origin?: string) =>
  `https://yandex.ru/maps/?rtext=${origin ?? ""}~${entry}&rtt=auto`;
export default function Site({
  content: c,
  plots,
  media,
  posts,
  demo,
}: {
  content: SiteContent;
  plots: Plot[];
  media: MediaItem[];
  posts: PostItem[];
  demo: boolean;
}) {
  const [menu, setMenu] = useState(false),
    [form, setForm] = useState<{ plot: Plot | null; source: string } | null>(
      null,
    ),
    [map, setMap] = useState(false);
  const hero = media.find((m) => m.id === "P01"),
    nature =
      media.find((m) => m.id === "P08") ??
      media.find((m) => m.category === "Череменецкое озеро");
  const links = [
    ["О посёлке", "about"],
    ["Участки", "plots"],
    ["Озеро и природа", "lake"],
    ["Инфраструктура", "infrastructure"],
    ["Как добраться", "directions"],
    ["Контакты", "contacts"],
  ];
  const enquire = (source: string, plot: Plot | null = null) =>
    setForm({ plot, source });
  return (
    <>
      <Analytics id={c.metrikaId ?? ""} enabled={c.analyticsEnabled ?? false} />
      <header className="header">
        <a className="brand" href="#">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M5 27 24 8l19 19M12 24v17h24V24M22 41V29h7v12M3 46q10-7 21-1t21-1" />
          </svg>
          <span>
            {c.name}
            <small>У ОЗЕРА ВРЕВО</small>
          </span>
        </a>
        <nav aria-label="Главное меню" className={menu ? "open" : ""}>
          {links.map(([t, id]) => (
            <a href={"#" + id} key={id} onClick={() => setMenu(false)}>
              {t}
            </a>
          ))}
        </nav>
        <a className="header-phone" href={"tel:" + c.phone}>
          {c.phoneDisplay}
        </a>
        <button
          className="menu-button"
          aria-expanded={menu}
          aria-label="Открыть меню"
          onClick={() => setMenu(!menu)}
        >
          {menu ? "Закрыть" : "Меню ☰"}
        </button>
      </header>
      <main>
        {demo && (
          <div className="demo-banner">
            Закрытый демонстрационный макет · Посёлок строится
          </div>
        )}
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="tiny-star">✳</span> Свой дом. Свой ритм.
            </p>
            <h1 id="hero-title">{c.headline}</h1>
            <p className="hero-intro">
              Тишина, природа заказника и возможность жить за городом круглый
              год.
            </p>
            <div className="offer">
              Участки без подряда
              <strong>
                от {c.priceFrom.toLocaleString("ru-RU")} ₽ <span>за сотку</span>
              </strong>
            </div>
            <p className="hero-address">{c.address}</p>
            <div className="hero-buttons">
              <a className="button primary" href="#plots">
                Выбрать участок{" "}
                <span>
                  <Icon />
                </span>
              </a>
              <button
                className="button secondary"
                onClick={() => enquire("hero")}
              >
                Записаться на просмотр
              </button>
            </div>
          </div>
          <figure className="hero-photo">
            {hero ? (
              <>
                <img
                  src={"/media/" + hero.file}
                  alt="Озеро Врево — берег и вода"
                  width={1200}
                  height={675}
                  fetchPriority="high"
                />
                <figcaption>
                  <span>01 / ОЗЕРО ВРЕВО</span>
                  <span>Место, куда хочется возвращаться</span>
                </figcaption>
              </>
            ) : (
              <div className="photo-placeholder">Озеро Врево</div>
            )}
            <div className="construction-tag">
              <span />
              Посёлок строится
            </div>
            <div className="photo-coordinate">
              58°35′04″ N<br />
              29°51′25″ E
            </div>
          </figure>
        </section>
        <div className="hero-bottom">
          <span>Ленинградская область / Лужский район</span>
          <a href="#about">
            Ближе к природе <span>↓</span>
          </a>
        </div>
        <section className="section about" id="about">
          <div className="section-label">01 / О месте</div>
          <div>
            <h2>
              Больше тишины.
              <br />
              <em>Больше своего.</em>
            </h2>
            <p className="large-copy">{c.introduction}</p>
            <div className="feature-row">
              <div>
                <span>
                  <Icon name="wave" />
                </span>
                <h3>У воды</h3>
                <p>На берегу озера Врево</p>
              </div>
              <div>
                <span>
                  <Icon name="tree" />
                </span>
                <h3>Среди природы</h3>
                <p>Озёрные ландшафты заказника</p>
              </div>
              <div>
                <span>
                  <Icon name="home" />
                </span>
                <h3>Без подряда</h3>
                <p>Дом в вашем собственном стиле</p>
              </div>
              <div>
                <span>
                  <Icon />
                </span>
                <h3>Рядом с Лугой</h3>
                <p>Городские сервисы поблизости</p>
              </div>
            </div>
          </div>
        </section>
        <section className="section plots-section" id="plots">
          <div className="section-heading">
            <div>
              <p className="section-label">02 / Найдите своё место</p>
              <h2>
                Какой участок — <em>ваш?</em>
              </h2>
            </div>
            <p>
              Участки без подряда
              <br />
              от {c.priceFrom.toLocaleString("ru-RU")} ₽ за сотку
            </p>
          </div>
          <PlotExplorer
            initialPlots={plots}
            onEnquire={(p) => enquire("plot-card", p)}
          />
          <div className="purchase">
            <div>
              <span className="eyebrow">Условия покупки</span>
              <h3>Свобода планировать будущее</h3>
            </div>
            <div>
              <p>{c.purchaseText}</p>
              <button
                className="text-button"
                onClick={() => enquire("purchase")}
              >
                Обсудить условия с менеджером <Icon />
              </button>
            </div>
          </div>
        </section>
        <section className="section lake-section" id="lake">
          <div className="lake-copy">
            <p className="section-label">03 / Озеро Врево</p>
            <h2>
              У каждого дня
              <br />
              <em>есть свой берег.</em>
            </h2>
            <p>{c.lakeText}</p>
            <span className="large-symbol">≈</span>
          </div>
          <figure>
            {hero && (
              <>
                <img
                  src={"/media/" + hero.file}
                  width={1200}
                  height={675}
                  alt="Берег озера Врево"
                  loading="lazy"
                />
                <figcaption>
                  <PhotoCredit m={hero} />
                  <small>
                    Снимок берега у другого комплекса; это не пляж строящегося
                    посёлка.
                  </small>
                </figcaption>
              </>
            )}
          </figure>
        </section>
        <section className="nature-section section">
          <div className="nature-image">
            {nature && (
              <figure>
                <img
                  src={"/media/" + nature.file}
                  width={900}
                  height={600}
                  alt={nature.title}
                  loading="lazy"
                />
                <figcaption>
                  <PhotoCredit m={nature} />
                </figcaption>
              </figure>
            )}
          </div>
          <div>
            <p className="section-label">04 / Бережно к природе</p>
            <h2>
              Озёрный край.
              <br />
              <em>Череменецкий заказник.</em>
            </h2>
            <p>{c.natureText}</p>
            <ul className="nature-facts">
              <li>Озеро Врево входит в заказник</li>
              <li>Охраняемые озёрные ландшафты</li>
              <li>Бережное отношение к природному окружению</li>
            </ul>
          </div>
        </section>
        <section className="section" id="infrastructure">
          <p className="section-label">05 / Основа загородной жизни</p>
          <h2>
            Здесь всё <em>по делу.</em>
          </h2>
          <div className="infrastructure-grid">
            {c.infrastructure.map((x, i) => (
              <article key={i}>
                <span className="infra-number">0{i + 1}</span>
                <span
                  className={
                    "status " +
                    (x.status.includes("Готов") || x.status.includes("готов")
                      ? "available"
                      : "reserved")
                  }
                >
                  {x.status}
                </span>
                <h3>{x.title}</h3>
                <p>{x.description}</p>
                {x.season && <small>{x.season}</small>}
              </article>
            ))}
          </div>
          <p className="maintenance">{c.maintenanceText}</p>
        </section>
        <section className="section directions" id="directions">
          <div className="section-heading">
            <div>
              <p className="section-label">06 / Дорога домой</p>
              <h2>
                За городом.
                <br />
                <em>В пределах привычной жизни.</em>
              </h2>
            </div>
            <p>
              Удобный автомобильный подъезд
              <br />
              из Санкт-Петербурга
            </p>
          </div>
          <div className="directions-layout">
            <div className="regional-map">
              <svg
                viewBox="0 0 520 470"
                role="img"
                aria-label="Схема расположения: Санкт-Петербург на севере, Великий Новгород на востоке, Псков на юго-западе, Луга и точка въезда у озера Врево"
              >
                <path
                  d="M170 50Q230 150 230 230L220 280M410 235Q300 250 220 280M90 410Q140 320 220 280"
                  fill="none"
                  stroke="#66816b"
                  strokeWidth="3"
                  strokeDasharray="7 7"
                />
                <path d="M235 295q-35 28-12 70 15-25 12-70" fill="#9dbfca" />
                <g fill="#1b4336">
                  {[
                    [170, 50],
                    [410, 235],
                    [90, 410],
                    [230, 230],
                  ].map(([x, y]) => (
                    <circle key={x} cx={x} cy={y} r={5} />
                  ))}
                  <circle cx="220" cy="280" r="10" />
                </g>
                <g fill="#183e31" fontSize="15">
                  <text x="185" y="55">
                    Санкт-Петербург
                  </text>
                  <text x="315" y="218">
                    Великий Новгород
                  </text>
                  <text x="105" y="415">
                    Псков
                  </text>
                  <text x="245" y="234">
                    Луга
                  </text>
                  <text x="245" y="287">
                    {c.name}
                  </text>
                  <text x="249" y="325" fontSize="12">
                    озеро Врево
                  </text>
                </g>
              </svg>
              <p>
                Схема расположения, не в масштабе. Линии показывают направления;
                дорожные маршруты — в навигаторе.
              </p>
            </div>
            <div className="route-cards">
              {c.routes.map((r) => (
                <article key={r.city}>
                  <h3>{r.city}</h3>
                  <p>{r.roads}</p>
                  {r.distanceKm && r.minutes && (
                    <p>
                      {r.distanceKm} км · около {r.minutes} мин.
                      <small>
                        Проверено {r.verifiedAt}; время зависит от дорожной
                        ситуации.
                      </small>
                    </p>
                  )}
                  <a href={route(r.origin)} target="_blank" rel="noreferrer">
                    Построить маршрут <Icon />
                  </a>
                </article>
              ))}
            </div>
          </div>
          <div className="city-block">
            <span className="eyebrow">Луга / Всё необходимое рядом</span>
            <h3>Городские привычки остаются с вами</h3>
            <p>{c.cityText}</p>
          </div>
        </section>
        <section className="section gallery-section" id="gallery">
          <p className="section-label">07 / Почувствовать место</p>
          <h2>
            Каждый сезон — <em>новая история.</em>
          </h2>
          <Gallery media={media} />
          {posts.length > 0 && (
            <div className="construction-posts">
              <h3>Ход строительства</h3>
              {posts.map((p) => {
                const m = media.find((m) => m.id === p.mediaId);
                return (
                  <article key={p.id}>
                    <time>{p.date}</time>
                    <h3>{p.title}</h3>
                    <p>{p.text}</p>
                    {m && (
                      <figure>
                        <img
                          src={"/media/" + m.file}
                          width={640}
                          height={420}
                          alt={m.title}
                          loading="lazy"
                        />
                        <PhotoCredit m={m} />
                      </figure>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <section className="contacts section" id="contacts">
          <div>
            <p className="section-label">08 / До встречи у озера</p>
            <h2>
              Приезжайте.
              <br />
              <em>Почувствуйте своё.</em>
            </h2>
            <p>
              Пройдёмся по посёлку, посмотрим участки и ответим на ваши вопросы.
            </p>
            <a className="contact-phone" href={"tel:" + c.phone}>
              {c.phoneDisplay}
            </a>
            <p>
              {c.contactName}, отдел продаж
              {c.workingHours && " · " + c.workingHours}
            </p>
            <address>{c.address}</address>
            <a
              className="text-link"
              href={route()}
              target="_blank"
              rel="noreferrer"
            >
              Маршрут к точке въезда <Icon />
            </a>
            <button className="text-button" onClick={() => setMap(!map)}>
              {map ? "Скрыть карту" : "Загрузить интерактивную карту"}
            </button>
            {map && (
              <iframe
                className="external-map"
                title="Точка въезда в посёлок"
                src="https://yandex.ru/map-widget/v1/?ll=29.856943%2C58.584476&z=13&pt=29.856943%2C58.584476%2Cpm2gnm"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            )}
            {c.legalDetails && <p>{c.legalDetails}</p>}
          </div>
          <div className="contact-form-panel">
            <h3>Записаться на просмотр</h3>
            <LeadForm demo={demo} />
          </div>
        </section>
      </main>
      <footer>
        <a className="brand" href="#">
          {c.name}
        </a>
        <span>Участки без подряда у озера Врево</span>
        <div>
          <Link href="/privacy">Политика</Link>
          <Link href="/consent">Согласие</Link>
          <Link href="/credits">Источники фотографий</Link>
        </div>
        <small>Информация на сайте не является публичной офертой.</small>
      </footer>
      <div className="mobile-actions">
        <a href="#plots">Участки</a>
        <button onClick={() => enquire("mobile-bar")}>
          Записаться <Icon />
        </button>
      </div>
      {form && (
        <Dialog title="Записаться на просмотр" onClose={() => setForm(null)}>
          <p className="eyebrow">{c.name}</p>
          <h2>
            {form.plot ? "Ваш будущий участок" : "Увидеть своими глазами"}
          </h2>
          <LeadForm plot={form.plot} source={form.source} demo={demo} />
        </Dialog>
      )}
    </>
  );
}
