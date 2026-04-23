import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

type Mode = "light" | "dark" | "system";

const OPTIONS: { value: Mode; label: string; Icon: typeof Sun; isDefault?: boolean }[] = [
  { value: "system", label: "System", Icon: Monitor, isDefault: true },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

const STORAGE_KEY = "finatrades-theme";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current: Mode = mounted ? ((theme as Mode) || "system") : "system";
  const isDark = mounted && resolvedTheme === "dark";
  const ActiveIcon = current === "system" ? Monitor : isDark ? Moon : Sun;

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Theme"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
        data-testid="button-theme-toggle"
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose theme"
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Theme: ${current}`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground/70 transition-all duration-300 hover:text-foreground hover:border-primary/40 hover:shadow-[0_0_0_3px_rgba(163,66,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="button-theme-toggle"
      >
        <ActiveIcon className="h-4 w-4 transition-all duration-300" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-40 rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg backdrop-blur-xl p-1 z-50"
          data-testid="menu-theme"
        >
          {OPTIONS.map(({ value, label, Icon }) => {
            const active = current === value;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(value);
                  if (value === "system") {
                    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
                  }
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                }`}
                data-testid={`menuitem-theme-${value}`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left flex items-center gap-1.5">
                  {label}
                  {OPTIONS.find(o => o.value === value)?.isDefault && (
                    <span className="text-[10px] font-medium text-muted-foreground/80 px-1.5 py-0.5 rounded-full bg-muted/60 border border-border/40">
                      default
                    </span>
                  )}
                </span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
