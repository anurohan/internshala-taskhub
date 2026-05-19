import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'TaskHub — AI Product Photography Platform',
  description:
    'TaskHub is a professional AI-powered product photography task management platform. Generate stunning, consistent product images for e-commerce.',
  keywords: 'AI photography, product images, e-commerce, task management',
  openGraph: {
    title: 'TaskHub — AI Product Photography Platform',
    description: 'Generate 8 stunning, consistent AI product images from a single upload.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-[#0f0f13] text-white`}>
        {children}
        <Toaster
          position="top-right"
          richColors
          theme="dark"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              border: '1px solid #334155',
              color: '#f1f5f9',
            },
          }}
        />
      </body>
    </html>
  );
}
