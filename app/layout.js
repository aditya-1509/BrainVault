import "./globals.css";

export const metadata = {
  title: "BillRAG - Parliamentary Bill Analysis",
  description: "AI-powered analysis of parliamentary bills and legislation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
