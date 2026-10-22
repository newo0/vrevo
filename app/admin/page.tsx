import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/brand";
import { authenticated } from "@/lib/auth";
import { getContent, getPlots } from "@/lib/site";
import Admin from "@/components/Admin";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `Управление — ${SITE_NAME}`,
  robots: { index: false, follow: false },
};
export default async function Page() {
  const auth = await authenticated();
  return (
    <Admin
      authenticated={auth}
      initialContent={auth ? await getContent() : null}
      initialPlots={auth ? await getPlots() : []}
    />
  );
}
