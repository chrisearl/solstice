export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return <div className="h-dvh overflow-y-auto overscroll-y-contain">{children}</div>;
}
