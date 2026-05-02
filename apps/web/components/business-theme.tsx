import type { CSSProperties } from "react";
import { resolveTheme, themeStyleVars } from "@/lib/themes";

// Wraps children in a div whose inline style overrides the theme CSS vars
// for that subtree. Tailwind classes that reference --color-* inherit
// through the cascade.
export function BusinessTheme({
  business,
  className,
  children,
}: {
  business: { logoUrl: string | null; theme: unknown };
  className?: string;
  children: React.ReactNode;
}) {
  const { colors } = resolveTheme(business);
  return (
    <div
      style={
        {
          ...themeStyleVars(colors),
          background: "var(--color-background)",
          color: "var(--color-foreground)",
          minHeight: "100vh",
        } as CSSProperties
      }
      className={className}
    >
      {children}
    </div>
  );
}
