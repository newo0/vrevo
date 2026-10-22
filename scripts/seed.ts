import { db } from "../lib/db";
import geometry from "../data/geometry.json";
import project from "../materials/project_data.json";
import sources from "../materials/photo_sources.json";
import type { SiteContent } from "../lib/types";
import { SITE_NAME } from "../lib/brand";
const content: SiteContent = {
  metrikaId: "",
  analyticsEnabled: false,
  name: SITE_NAME,
  address: project.address,
  phone: project.salesContact.phoneE164,
  phoneDisplay: project.salesContact.phoneDisplay,
  contactName: "Владислав",
  priceFrom: 90000,
  headline: "Коттеджный посёлок на берегу озера Врево",
  introduction:
    "Тишина, природа заказника и возможность жить за городом круглый год. Место для своего дома, неспешных выходных и новых семейных традиций.",
  lakeText:
    "Посёлок расположен на берегу озера Врево в Лужском районе Ленинградской области. Прогулки у воды, отдых на берегу и наблюдение за сменой сезонов станут частью загородной жизни. Доступ к будущему пляжу и расстояние от конкретного участка уточняйте у менеджера.",
  natureText:
    "Озеро Врево входит в Череменецкий природный заказник. Здесь охраняются озёрные ландшафты и природные комплексы прилегающих территорий. Это окружение определяет характер места и требует бережного отношения к природе.",
  cityText:
    "Луга — ближайший городской ориентир: магазины, аптеки, медицина, школы, детские сады, кафе и повседневные услуги. По данным заказчика доступны такси и доставка продуктов. Доступность конкретных услуг уточняйте при выборе участка.",
  purchaseText:
    "Полная оплата · Ипотека — условия у менеджера · Рассрочка — индивидуально · Региональный материнский капитал Санкт-Петербурга — при соответствии условиям программы.",
  maintenanceText:
    "Вода и канализация — индивидуальные решения. Газ не планируется. Взносы и стоимость обслуживания определят при создании ТСЖ или УК.",
  privacy: "",
  consent: "",
  legalDetails: "",
  workingHours: "",
  geometryReviewed: false,
  routes: [
    {
      city: "Санкт-Петербург",
      origin: "59.9386,30.3141",
      roads:
        "Автомобильный маршрут через Лугу. Актуальные дороги и время — в навигаторе.",
      distanceKm: null,
      minutes: null,
      verifiedAt: null,
    },
    {
      city: "Великий Новгород",
      origin: "58.5215,31.2755",
      roads: "Маршрут до точки въезда в посёлок — в навигаторе.",
      distanceKm: null,
      minutes: null,
      verifiedAt: null,
    },
    {
      city: "Псков",
      origin: "57.8194,28.3325",
      roads: "Маршрут в направлении Луги до точки въезда — в навигаторе.",
      distanceKm: null,
      minutes: null,
      verifiedAt: null,
    },
  ],
  infrastructure: [
    {
      title: "Основные дороги",
      description:
        "Основные дороги готовы. Покрытие и условия обслуживания уточняйте у менеджера.",
      status: "Готово",
      season: "",
    },
    {
      title: "Электричество",
      description:
        "15 кВт по границе участка. Подключение конкретного участка оплачивается отдельно.",
      status: "Готово",
      season: "",
    },
    {
      title: "Пляж",
      description:
        "Место для отдыха у воды — следующий этап развития посёлка. Условия доступа уточняются.",
      status: "Запланировано",
      season: "Предварительно сезон 2027",
    },
    {
      title: "КПП и охрана",
      description:
        "КПП готов. Организация службы охраны запланирована на следующий сезон.",
      status: "КПП готов",
      season: "Охрана — предварительно 2027",
    },
    {
      title: "Детская площадка",
      description:
        "Пространство для детских игр запланировано на следующий сезон.",
      status: "Запланировано",
      season: "Предварительно сезон 2027",
    },
  ],
};
async function main() {
  for (const p of geometry.plots)
    await db.plot.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        number: p.number,
        status: project.soldPlotNumbers.includes(p.number)
          ? "sold"
          : "available",
        needsReview: p.needsReview,
        areaM2: null,
        priceRub: null,
      },
    });
  await db.content.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", json: JSON.stringify(content) },
  });
  for (const [i, s] of sources.entries())
    await db.media.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        file: s.file.replace("photos/", ""),
        title: s.short_title ?? s.title,
        category: s.category ?? "Врево",
        author: s.author,
        source: s.source_page,
        license: s.license,
        licenseUrl: s.license_url,
        publicationStatus: s.publication_status,
        order: i,
      },
    });
  console.log("Initial data ready; existing edits preserved.");
}
main().finally(() => db.$disconnect());
