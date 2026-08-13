import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { logout } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "Nabava | Revoz",
  description: "Interna nabavna aplikacija",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold text-slate-800">
              Nabava · Revoz
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:text-blue-600">
                Pregled
              </Link>
              <Link href="/projects" className="hover:text-blue-600">
                Analize ponudb
              </Link>
              <Link href="/suppliers" className="hover:text-blue-600">
                Dobavitelji
              </Link>
              <form action={logout}>
                <button type="submit" className="text-slate-400 hover:text-red-500">
                  Odjava
                </button>
              </form>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
