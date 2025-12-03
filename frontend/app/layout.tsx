import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-provider';
import { ThemeProvider } from '@/lib/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Paggo OCR - Document Processing',
  description: 'Upload documents, extract text with OCR, and interact with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
                  const html = document.documentElement;
                  
                  // Remove any existing theme classes
                  html.classList.remove('light', 'dark');
                  
                  // Add the appropriate class
                  if (theme === 'dark') {
                    html.classList.add('dark');
                  }
                  
                  html.setAttribute('data-theme', theme);
                } catch (e) {
                  console.error('Theme initialization error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
