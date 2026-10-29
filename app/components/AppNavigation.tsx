
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/app/components/LogoutButton";

const menu = [
  { label: "Vue d’ensemble", href: "/", icon: "⌂" },
  { label: "Biens", href: "/biens", icon: "▦" },
  { label: "Logements", href: "/logements", icon: "⌂" },
  { label: "Locataires", href: "/locataires", icon: "♙" },
  { label: "Baux", href: "/baux", icon: "▤" },
  { label: "Paiements", href: "/paiements", icon: "€" },
  { label: "Impayés", href: "/impayes", icon: "!" },
];

const pagesPubliques = [
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
];

export default function AppNavigation({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const pagePublique = pagesPubliques.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );

  // La page d'accueil possède déjà son menu.
  if (pagePublique || pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="w-full shrink-0 border-r border-slate-200 bg-white p-5 md:min-h-screen md:w-64">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-xl text-white">
            L
          </span>
          <span>
            <span className="block text-xl font-bold">Localy</span>
            <span className="text-xs text-slate-500">Gestion locative</span>
          </span>
        </Link>

        <nav className="flex flex-wrap gap-2 md:flex-col">
          {menu.map((item) => {
            const actif =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={actif ? "page" : undefined}
                className={`rounded-lg px-3 py-2.5 text-sm transition ${
                  actif
                    ? "bg-emerald-50 font-semibold text-emerald-900"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold">Votre patrimoine</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Gérez vos logements et suivez vos loyers au même endroit.
          </p>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <Link
            href="/"
            className="mb-4 block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            ← Retour à la vue d’ensemble
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
