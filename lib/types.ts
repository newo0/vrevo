export const statuses = {
  available: "Свободен",
  reserved: "Забронирован",
  sold: "Продан",
} as const;
export type PlotStatus = keyof typeof statuses;
export type Plot = {
  id: string;
  number: string;
  status: string;
  areaM2: number | null;
  priceRub: number | null;
  cadastralNumber: string | null;
  electricityKw: number | null;
  description: string | null;
  needsReview: boolean;
  updatedAt: string;
};
export type SiteContent = {
  metrikaId: string;
  analyticsEnabled: boolean;
  name: string;
  address: string;
  phone: string;
  phoneDisplay: string;
  contactName: string;
  priceFrom: number;
  headline: string;
  introduction: string;
  lakeText: string;
  natureText: string;
  cityText: string;
  purchaseText: string;
  maintenanceText: string;
  privacy: string;
  consent: string;
  legalDetails: string;
  workingHours: string;
  geometryReviewed: boolean;
  routes: {
    city: string;
    origin: string;
    roads: string;
    distanceKm: number | null;
    minutes: number | null;
    verifiedAt: string | null;
  }[];
  infrastructure: {
    title: string;
    description: string;
    status: string;
    season: string;
  }[];
};
export type MediaItem = {
  id: string;
  file: string;
  title: string;
  category: string;
  author: string;
  source: string;
  license: string;
  licenseUrl: string | null;
  publicationStatus: string;
  date: string | null;
  order: number;
  published: boolean;
  visualization: boolean;
};
export type PostItem = {
  id: string;
  title: string;
  text: string;
  date: string;
  mediaId: string | null;
  published: boolean;
};
