import "./globals.css";
import React from "react";

export const metadata = {
  title: "TGMS - Training Game Management System",
  description: "Web-based collaborative training and gamified learning platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
