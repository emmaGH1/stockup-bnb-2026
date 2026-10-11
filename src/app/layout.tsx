import '@fontsource-variable/space-grotesk';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './globals.css';

export const metadata = { title: 'Stockup 2.0 — Spend to Own' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="bg-paper font-sans text-ink antialiased">{children}</body></html>;
}
