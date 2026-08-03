import "./globals.css";
import Preloader from "./components/Preloader";
import NextTopLoader from 'nextjs-toploader';

export const metadata = {
  title: "Fusion LMS",
  description: "Fusion College Learning Management System",
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col">
        <NextTopLoader
          color="#06b6d4"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #06b6d4,0 0 5px #06b6d4"
        />
        <Preloader />
        {children}
      </body>
    </html>
  );
}
