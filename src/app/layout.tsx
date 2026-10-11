import '@fontsource-variable/archivo';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/400-italic.css';
import '@fontsource/source-serif-4/600.css';
import './globals.css';

export const metadata = { title: 'Stockup 2.0 — Spend to Own' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="bg-paper font-sans text-ink antialiased">{children}</body></html>;
}
