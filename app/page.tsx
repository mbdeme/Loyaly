
import { getCurrentUser } from "@/lib/supabase/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
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

function euros(centimes: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(centimes / 100);
}

function nomPeriode(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export default async function Home() {
  const user = await getCurrentUser();

  const maintenant = new Date();
  const debutMois = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    1
  );
  const debutMoisSuivant = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth() + 1,
    1
  );

  const [nombreLogements, echeances] = await Promise.all([
    prisma.unit.count({
      where: { ownerId: user.id },
    }),
    prisma.rentCharge.findMany({
      where: {
        lease: {
          unit: { ownerId: user.id },
          tenant: { ownerId: user.id },
        },
      },
      include: {
        allocations: {
          select: { amount: true },
        },
        lease: {
          include: {
            tenant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            unit: {
              select: {
                id: true,
                reference: true,
                city: true,
                property: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const echeancesCalculees = echeances.map((echeance) => {
    const montantPaye = echeance.allocations.reduce(
      (total, allocation) => total + allocation.amount,
      0
    );

    return {
      ...echeance,
      montantPaye,
      resteDu: Math.max(0, echeance.amount - montantPaye),
    };
  });

  // Les loyers attendus correspondent aux échéances du mois courant.
  const echeancesDuMois = echeancesCalculees.filter(
    (echeance) =>
      echeance.dueDate >= debutMois &&
      echeance.dueDate < debutMoisSuivant
  );

  const loyersAttendus = echeancesDuMois.reduce(
    (total, echeance) => total + echeance.amount,
    0
  );

  const loyersEncaisses = echeancesDuMois.reduce(
    (total, echeance) => total + echeance.montantPaye,
    0
  );

  // Seules les échéances déjà arrivées à échéance sont comptées ici.
  const echeancesEnRetard = echeancesCalculees.filter(
    (echeance) =>
      echeance.dueDate <= maintenant && echeance.resteDu > 0
  );

  const impayesCumules = echeancesEnRetard.reduce(
    (total, echeance) => total + echeance.resteDu,
    0
  );

  // Regroupement des dettes par locataire et logement.
  const groupesImpayes = new Map<
    string,
    {
      tenantId: string;
      locataire: string;
      logement: string;
      dette: number;
      periodes: Set<string>;
      plusAncienneEcheance: Date;
    }
  >();

  for (const echeance of echeancesEnRetard) {
    const tenant = echeance.lease.tenant;
    const unit = echeance.lease.unit;
    const cle = `${tenant.id}-${unit.id}`;

    let groupe = groupesImpayes.get(cle);

    if (!groupe) {
      groupe = {
        tenantId: tenant.id,
        locataire: `${tenant.firstName} ${tenant.lastName}`,
        logement: `${unit.reference}${unit.city ? ` — ${unit.city}` : ""}`,
        dette: 0,
        periodes: new Set<string>(),
        plusAncienneEcheance: echeance.dueDate,
      };

      groupesImpayes.set(cle, groupe);
    }

    groupe.dette += echeance.resteDu;
    groupe.periodes.add(echeance.period);

    if (echeance.dueDate < groupe.plusAncienneEcheance) {
      groupe.plusAncienneEcheance = echeance.dueDate;
    }
  }

  const lignesImpayes = Array.from(groupesImpayes.values()).sort(
    (a, b) => b.dette - a.dette
  );

  const pourcentageEncaisse =
    loyersAttendus > 0
      ? Math.round((loyersEncaisses / loyersAttendus) * 1000) / 10
      : 0;

  const stats = [
    {
      label: "Loyers attendus",
      value: euros(loyersAttendus),
      note: nomPeriode(maintenant),
    },
    {
      label: "Loyers encaissés",
      value: euros(loyersEncaisses),
      note: `${pourcentageEncaisse.toLocaleString("fr-FR")} % encaissés`,
    },
    {
      label: "Impayés cumulés",
      value: euros(impayesCumules),
      note: "Échéances arrivées à échéance",
      alert: impayesCumules > 0,
    },
    {
      label: "Logements",
      value: String(nombreLogements),
      note: "Dans votre patrimoine",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="w-full border-r border-slate-200 bg-white p-5 md:min-h-screen md:w-64">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <Image
            src="/logo-localy.png"
            alt="Logo Localy"
            width={48}
            height={48}
            priority
            className="h-12 w-12 rounded-xl object-contain"
          />
          <span>
            <span className="block text-xl font-bold">Localy</span>
            <span className="text-xs text-slate-500">Gestion locative</span>
          </span>
        </Link>

        <nav className="flex flex-wrap gap-2 md:flex-col">
          {menu.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2.5 text-sm ${
                index === 0
                  ? "bg-emerald-50 font-semibold text-emerald-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-10 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold">Votre patrimoine</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Gérez vos logements et suivez vos loyers au même endroit.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Gestion locative</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Vue d’ensemble
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Retrouvez la situation réelle de vos loyers.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/biens"
              className="rounded-lg bg-emerald-900 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800"
            >
              + Ajouter un bien
            </Link>
            <LogoutButton />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p
                className={`mt-3 text-2xl font-bold ${
                  stat.alert ? "text-red-600" : "text-slate-900"
                }`}
              >
                {stat.value}
              </p>
              <p className="mt-2 text-xs text-slate-500">{stat.note}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Suivi des impayés</h2>
              <p className="mt-1 text-sm text-slate-500">
                Situation calculée à partir des échéances et des paiements.
              </p>
            </div>

            <Link
              href="/impayes"
              className="text-sm font-medium text-emerald-800 hover:underline"
            >
              Voir les impayés →
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Locataire</th>
                  <th className="pb-3 pr-4 font-medium">Logement</th>
                  <th className="pb-3 pr-4 font-medium">Retard</th>
                  <th className="pb-3 text-right font-medium">Dette</th>
                </tr>
              </thead>

              <tbody>
                {lignesImpayes.map((ligne) => (
                  <tr
                    key={`${ligne.tenantId}-${ligne.logement}`}
                    className="border-b border-slate-100"
                  >
                    <td className="py-4 pr-4 font-medium">
                      {ligne.locataire}
                    </td>
                    <td className="py-4 pr-4">{ligne.logement}</td>
                    <td className="py-4 pr-4">
                      {ligne.periodes.size}{" "}
                      {ligne.periodes.size > 1 ? "mois" : "mois"}
                    </td>
                    <td className="py-4 text-right font-semibold text-red-600">
                      {euros(ligne.dette)}
                    </td>
                  </tr>
                ))}

                {lignesImpayes.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-slate-500"
                    >
                      Aucun impayé à ce jour.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          Localy · La gestion locative en toute sérénité.
        </p>
      </main>
    </div>
  );
}
