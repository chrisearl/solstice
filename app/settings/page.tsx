import { SettingsView } from "@/components/settings-view";
import { parseStudioTheme } from "@/lib/studio-view";

export const metadata = {
  title: "Settings — Solstice",
  description: "Appearance and theme preferences for Solstice.",
};

function first(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const themeParam = first(params, "theme");
  const initialTheme = themeParam !== undefined ? parseStudioTheme(themeParam) : undefined;

  const returnParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "theme" || value === undefined) continue;
    if (Array.isArray(value)) {
      if (value[0]) returnParams.set(key, value[0]);
    } else {
      returnParams.set(key, value);
    }
  }
  if (initialTheme && initialTheme !== "default") {
    returnParams.set("theme", initialTheme);
  }

  const returnQuery = returnParams.toString();

  return <SettingsView initialTheme={initialTheme} returnQuery={returnQuery} />;
}
