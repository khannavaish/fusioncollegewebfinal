import "./globals.css";

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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
