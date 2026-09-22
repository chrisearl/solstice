import { SolarStudio } from "@/components/solar-studio";
import { parseViewQuery } from "@/lib/view-query";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <SolarStudio initial={parseViewQuery(params)} />;
}
