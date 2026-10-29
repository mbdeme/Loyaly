
"use client";

import { useCallback, useEffect, useState } from "react";

type Echeance = {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  montantPaye: number;
  resteDu: number;
  statutPaiement: "PAYE" | "PARTIEL" | "IMPAYE";
  lease: {
    tenant: {
      id: string;
      firstName: string;
      lastName: string;
    };
    unit: {
      id: string;
      reference: string;
      city: string | null;
      property: { name: string } | null;
    };
  };
};

function euros(centimes: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(centimes / 100);
}

function dateFr(date: string) {
  return new Date(date).toLocaleDateString("fr-FR");
}

function debutDuJour(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function ImpayesClient() {
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const chargerEcheances = useCallback(async () => {
    setChargement(true);
    setErreur("");

    try {
      const reponse = await fetch("/api/echeances");
      const donnees = await reponse.json();

      if (!reponse.ok) {
        throw new Error(
          donnees.error || "Impossible de charger les échéances."
        );
      }

      setEcheances(donnees);
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Erreur lors du chargement."
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void chargerEcheances();
  }, [chargerEcheances]);

  const aujourdHui = debutDuJour(new Date());

  const impayes = echeances.filter(
    (echeance) =>
      new Date(echeance.dueDate) < aujourdHui && echeance.resteDu > 0
  );

  const totalImpayes = impayes.reduce(
    (total, echeance) => total + echeance.resteDu,
    0
  );

  const groupes = new Map<
    string,
    {
      locataire: string;
      logement: string;
      ville: string;
      dette: number;
      echeances: Echeance[];
      plusAncienne: string;
    }
  >();

  for (const echeance of impayes) {
    const tenant = echeance.lease.tenant;
    const unit = echeance.lease.unit;
    const cle = `${tenant.id}-${unit.id}`;

    let groupe = groupes.get(cle);

    if (!groupe) {
      groupe = {
        locataire: `${tenant.firstName} ${tenant.lastName}`,
        logement: unit.reference,
        ville: unit.city ?? "",
        dette: 0,
        echeances: [],
        plusAncienne: echeance.dueDate,
      };
      groupes.set(cle, groupe);
    }

    groupe.dette += echeance.resteDu;
    groupe.echeances.push(echeance);

    if (new Date(echeance.dueDate) < new Date(groupe.plusAncienne)) {
      groupe.plusAncienne = echeance.dueDate;
    }
  }

  const lignes = Array.from(groupes.entries())
    .map(([id, groupe]) => ({ id, ...groupe }))
    .sort((a, b) => b.dette - a.dette);

  if (chargement) {
    return <main className="p-6">Chargement des impayés...</main>;
  }

  return (
    <main className="min-w-0 space-y-8 p-5 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Gestion locative</p>
          <h1 className="mt-1 text-2xl font-bold">Impayés</h1>
          <p className="mt-2 text-sm text-slate-500">
            Retrouvez les loyers échus qui n'ont pas été réglés intégralement.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void chargerEcheances()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Actualiser
        </button>
      </header>

      {erreur && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {erreur}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total des impayés échus</p>
          <p className="mt-3 text-2xl font-bold text-red-600">
            {euros(totalImpayes)}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Locataires concernés</p>
          <p className="mt-3 text-2xl font-bold">{lignes.length}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold">Détail des dettes</h2>
        <p className="mt-1 text-sm text-slate-500">
          Les dettes sont regroupées par locataire et logement.
        </p>

        {lignes.length === 0 ? (
          <p className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
            Aucun impayé échu. Si des loyers devraient apparaître ici, vérifiez
            que les échéances ont été générées dans l'onglet Paiements.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3 font-medium">Locataire</th>
                  <th className="px-3 py-3 font-medium">Logement</th>
                  <th className="px-3 py-3 font-medium">Plus ancienne échéance</th>
                  <th className="px-3 py-3 font-medium">Mois concernés</th>
                  <th className="px-3 py-3 text-right font-medium">Dette restante</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((ligne) => (
                  <tr key={ligne.id} className="border-b border-slate-100">
                    <td className="px-3 py-4 font-medium">
                      {ligne.locataire}
                    </td>
                    <td className="px-3 py-4">
                      {ligne.logement}
                      {ligne.ville ? ` — ${ligne.ville}` : ""}
                    </td>
                    <td className="px-3 py-4">
                      {dateFr(ligne.plusAncienne)}
                    </td>
                    <td className="px-3 py-4">
                      {ligne.echeances.length}
                    </td>
                    <td className="px-3 py-4 text-right font-semibold text-red-600">
                      {euros(ligne.dette)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold">Échéances impayées</h2>

        {impayes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Aucune échéance en retard.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3 font-medium">Période</th>
                  <th className="px-3 py-3 font-medium">Locataire</th>
                  <th className="px-3 py-3 font-medium">Date d'échéance</th>
                  <th className="px-3 py-3 font-medium">Montant dû</th>
                  <th className="px-3 py-3 font-medium">Déjà payé</th>
                  <th className="px-3 py-3 text-right font-medium">Reste dû</th>
                </tr>
              </thead>
              <tbody>
                {impayes
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(a.dueDate).getTime() -
                      new Date(b.dueDate).getTime()
                  )
                  .map((echeance) => (
                    <tr key={echeance.id} className="border-b border-slate-100">
                      <td className="px-3 py-4">{echeance.period}</td>
                      <td className="px-3 py-4">
                        {echeance.lease.tenant.firstName}{" "}
                        {echeance.lease.tenant.lastName}
                      </td>
                      <td className="px-3 py-4">
                        {dateFr(echeance.dueDate)}
                      </td>
                      <td className="px-3 py-4">
                        {euros(echeance.amount)}
                      </td>
                      <td className="px-3 py-4 text-green-700">
                        {euros(echeance.montantPaye)}
                      </td>
                      <td className="px-3 py-4 text-right font-semibold text-red-600">
                        {euros(echeance.resteDu)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
