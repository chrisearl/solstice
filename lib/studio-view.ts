export type StudioModel = "astrolabe" | "orrery";
export type StudioTheme = "default" | "davinci";

export interface StudioView {
  model: StudioModel;
  theme: StudioTheme;
}

export const DEFAULT_STUDIO_VIEW: StudioView = {
  model: "astrolabe",
  theme: "default",
};

export function parseStudioModel(value: string | undefined): StudioModel {
  return value === "orrery" ? "orrery" : "astrolabe";
}

export function parseStudioTheme(value: string | undefined): StudioTheme {
  return value === "davinci" ? "davinci" : "default";
}

export function resolveStudioView(
  model: StudioModel,
  theme: StudioTheme,
  davinciUnlocked: boolean,
): StudioView {
  return {
    model,
    theme: theme === "davinci" && !davinciUnlocked ? "default" : theme,
  };
}
