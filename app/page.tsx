import { SolarStudio } from "@/components/solar-studio";
import { parseViewQuery } from "@/lib/view-query";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // One instant for the server HTML and the client's first render. The studio
  // snaps to the browser clock after hydration.
  return <SolarStudio initial={parseViewQuery(params)} now={Date.now()} />;
}
