import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DearPOS — open-source point-of-sale",
  description:
    "Self-hostable POS for restaurants, cafés, and small shops. Stripe Terminal, Tap to Pay, no subscription. Built in Spokane.",
  metadataBase: new URL("https://dearpos.com"),
  openGraph: {
    title: "DearPOS",
    description:
      "Yeah, it's a POS. Just not the way you mean it. Open source, self-hostable, no subscription.",
    url: "https://dearpos.com",
    siteName: "DearPOS",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
