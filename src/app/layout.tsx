import './globals.css';
export const metadata = { title: 'Stockup 2.0 (provisional shell)' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="bg-paper text-ink antialiased">{children}</body></html>;
}
