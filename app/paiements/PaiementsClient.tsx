
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

type Paiement = {
  id: string;
  amount: number;
  paymentDate: string;
  method: string | null;
  reference: string | null;
  note: string | null;
};

const methodes = [
  { value: "VIREMENT", label: "Virement bancaire" },
  { value: "PRELEVEMENT", label: "Prélèvement" },
  { value: "CHEQUE", label: "Chèque" },
  { value: "ESPECES", label: "Espèces" },
  { value: "CARTE", label: "Carte bancaire" },
  { value: "AUTRE", label: "Autre" },
];

const classesChamp =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";

function euros(centimes: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(centimes / 100);
}

function dateFr(date: string) {
  if (!date) return "—";

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) return "—";

  return valeur.toLocaleDateString("fr-FR");
}

function statutLabel(statut: Echeance["statutPaiement"]) {
  if (statut === "PAYE") return "Payé";
  if (statut === "PARTIEL") return "Partiel";
  return "Impayé";
}

function classesStatut(statut: Echeance["statutPaiement"]) {
  if (statut === "PAYE") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15";
  }

  if (statut === "PARTIEL") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/15";
  }

  return "bg-red-50 text-red-700 ring-1 ring-red-600/15";
}

export default function PaiementsClient() {
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);

  const [tenantId, setTenantId] = useState("");
  const [montant, setMontant] = useState("");
  const [datePaiement, setDatePaiement] = useState("");
  const [methode, setMethode] = useState("VIREMENT");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const [rechercheEcheances, setRechercheEcheances] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("TOUS");
  const [recherchePaiements, setRecherchePaiements] = useState("");

  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [generationEnCours, setGenerationEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const chargerDonnees = useCallback(async () => {
    setChargement(true);
    setErreur("");

    try {
      const [repEcheances, repPaiements] = await Promise.all([
        fetch("/api/echeances", {
          signal: AbortSignal.timeout(15000),
        }),
        fetch("/api/paiements", {
          signal: AbortSignal.timeout(15000),
        }),
      ]);

      const [donneesEcheances, donneesPaiements] = await Promise.all([
        repEcheances.json(),
        repPaiements.json(),
      ]);

      if (!repEcheances.ok) {
        throw new Error(
          donneesEcheances.error || "Impossible de charger les échéances."
        );
      }

      if (!repPaiements.ok) {
        throw new Error(
          donneesPaiements.error || "Impossible de charger les paiements."
        );
      }

      if (
        !Array.isArray(donneesEcheances) ||
        !Array.isArray(donneesPaiements)
      ) {
        throw new Error("Les données reçues du serveur sont invalides.");
      }

      setEcheances(donneesEcheances);
      setPaiements(donneesPaiements);
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Erreur de chargement."
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void chargerDonnees();
  }, [chargerDonnees]);

  const locataires = useMemo(() => {
    return Array.from(
      new Map(
        echeances.map((e) => [
          e.lease.tenant.id,
          {
            id: e.lease.tenant.id,
            firstName: e.lease.tenant.firstName,
            lastName: e.lease.tenant.lastName,
          },
        ])
      ).values()
    ).sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`,
        "fr"
      )
    );
  }, [echeances]);

  const echeancesLocataire = useMemo(
    () =>
      echeances
        .filter(
          (e) => e.lease.tenant.id === tenantId && e.resteDu > 0
        )
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() -
            new Date(b.dueDate).getTime()
        ),
    [echeances, tenantId]
  );

  const detteLocataire = echeancesLocataire.reduce(
    (total, e) => total + e.resteDu,
    0
  );

  const totalDu = echeances.reduce(
    (total, e) => total + e.amount,
    0
  );

  const totalPaye = echeances.reduce(
    (total, e) => total + e.montantPaye,
    0
  );

  const totalRestant = echeances.reduce(
    (total, e) => total + e.resteDu,
    0
  );

  const nombreEcheancesPayees = echeances.filter(
    (e) => e.statutPaiement === "PAYE"
  ).length;

  const echeancesFiltrees = useMemo(() => {
    const terme = rechercheEcheances.trim().toLocaleLowerCase("fr");

    return echeances.filter((e) => {
      const nomLocataire =
        `${e.lease.tenant.firstName} ${e.lease.tenant.lastName}`
          .toLocaleLowerCase("fr");

      const logement = e.lease.unit.reference.toLocaleLowerCase("fr");
      const ville = (e.lease.unit.city ?? "").toLocaleLowerCase("fr");
      const periode = e.period.toLocaleLowerCase("fr");

      const correspondRecherche =
        !terme ||
        nomLocataire.includes(terme) ||
        logement.includes(terme) ||
        ville.includes(terme) ||
        periode.includes(terme);

      const correspondStatut =
        filtreStatut === "TOUS" || e.statutPaiement === filtreStatut;

      return correspondRecherche && correspondStatut;
    });
  }, [echeances, rechercheEcheances, filtreStatut]);

  const paiementsFiltres = useMemo(() => {
    const terme = recherchePaiements.trim().toLocaleLowerCase("fr");

    return paiements.filter((p) => {
      if (!terme) return true;

      const mode =
        methodes.find((m) => m.value === p.method)?.label ??
        p.method ??
        "";

      return [p.reference ?? "", p.note ?? "", mode].some((valeur) =>
        valeur.toLocaleLowerCase("fr").includes(terme)
      );
    });
  }, [paiements, recherchePaiements]);

  async function genererEcheances() {
    setErreur("");
    setMessage("");
    setGenerationEnCours(true);

    try {
      const reponse = await fetch("/api/echeances", {
        method: "POST",
        signal: AbortSignal.timeout(30000),
      });

      const donnees = await reponse.json();

      if (!reponse.ok) {
        throw new Error(
          donnees.error || "Impossible de générer les échéances."
        );
      }

      setMessage(
        `${donnees.nombreCree ?? 0} nouvelle(s) échéance(s) créée(s).`
      );

      await chargerDonnees();
    } catch (e) {
      setErreur(
        e instanceof Error
          ? e.message
          : "Erreur lors de la génération des échéances."
      );
    } finally {
      setGenerationEnCours(false);
    }
  }

  async function enregistrerPaiement(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErreur("");
    setMessage("");

    const montantNombre = Number(montant.replace(",", "."));

    if (!tenantId || !montant.trim() || !datePaiement) {
      setErreur(
        "Veuillez renseigner le locataire, le montant et la date."
      );
      return;
    }

    if (!Number.isFinite(montantNombre) || montantNombre <= 0) {
      setErreur("Le montant doit être supérieur à zéro.");
      return;
    }

    const montantCentimes = Math.round(montantNombre * 100);

    if (montantCentimes > detteLocataire) {
      setErreur(
        `Le montant dépasse la dette restante de ce locataire (${euros(detteLocataire)}).`
      );
      return;
    }

    setEnvoi(true);

    try {
      const reponse = await fetch("/api/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          amount: montantCentimes,
          paymentDate: datePaiement,
          method: methode,
          reference: reference.trim() || null,
          note: note.trim() || null,
        }),
        signal: AbortSignal.timeout(20000),
      });

      const donnees = await reponse.json();

      if (!reponse.ok) {
        throw new Error(
          donnees.error || "Impossible d'enregistrer le paiement."
        );
      }

      setMessage(
        `Paiement de ${euros(montantCentimes)} enregistré. Réparti sur ${donnees.nombreEcheances} échéance(s), de la plus ancienne à la plus récente.`
      );

      setTenantId("");
      setMontant("");
      setReference("");
      setNote("");

      await chargerDonnees();
    } catch (e) {
      setErreur(
        e instanceof Error
          ? e.message
          : "Erreur lors de l'enregistrement."
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* En-tête */}
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-700">
              Gestion locative
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-gray-950">
              Paiements
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Suivez les loyers encaissés, enregistrez les versements et
              consultez les sommes restant dues.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void chargerDonnees()}
            disabled={chargement}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            <span aria-hidden="true">↻</span>
            Actualiser
          </button>
        </header>

        {/* Messages */}
        {erreur && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{erreur}</p>

            <button
              type="button"
              onClick={() => void chargerDonnees()}
              className="shrink-0 font-semibold underline underline-offset-4"
            >
              Réessayer
            </button>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <span className="font-bold" aria-hidden="true">
              ✓
            </span>
            <p>{message}</p>
          </div>
        )}

        {/* Indicateurs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">
                Loyers dus
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">
                €
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold tracking-tight text-gray-950">
              {chargement ? "—" : euros(totalDu)}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Montant total des échéances
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">
                Loyers encaissés
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                ✓
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold tracking-tight text-emerald-700">
              {chargement ? "—" : euros(totalPaye)}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Montant enregistré comme payé
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">
                Reste à payer
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-xl">
                !
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold tracking-tight text-red-700">
              {chargement ? "—" : euros(totalRestant)}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Solde restant sur les échéances
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">
                Échéances réglées
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-xl">
                ☑
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold tracking-tight text-gray-950">
              {chargement ? "—" : nombreEcheancesPayees}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Sur {chargement ? "—" : echeances.length} échéance(s)
            </p>
          </div>
        </section>

        {/* Enregistrement d'un paiement */}
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">
                  Enregistrer un paiement
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Les versements sont affectés automatiquement aux loyers
                  les plus anciens encore dus.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void genererEcheances()}
                disabled={generationEnCours || chargement}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generationEnCours
                  ? "Génération en cours..."
                  : "Générer les échéances"}
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {echeances.length === 0 && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                Aucune échéance n'est disponible. Vérifiez qu'un bail actif
                existe, puis générez les échéances de loyers.
              </div>
            )}

            <form
              onSubmit={enregistrerPaiement}
              className="grid gap-5 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <label
                  htmlFor="locataire"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Locataire *
                </label>

                <select
                  id="locataire"
                  value={tenantId}
                  onChange={(event) => setTenantId(event.target.value)}
                  required
                  className={classesChamp}
                >
                  <option value="">Sélectionner un locataire</option>
                  {locataires.map((locataire) => (
                    <option key={locataire.id} value={locataire.id}>
                      {locataire.firstName} {locataire.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {tenantId && (
                <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Dette restante du locataire
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-950">
                        {euros(detteLocataire)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        detteLocataire > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {detteLocataire > 0
                        ? "Solde à régler"
                        : "Aucune dette"}
                    </span>
                  </div>

                  {echeancesLocataire.length === 0 ? (
                    <p className="mt-3 text-sm text-emerald-700">
                      Aucune échéance impayée pour ce locataire.
                    </p>
                  ) : (
                    <>
                      <p className="mt-5 text-sm font-semibold text-gray-700">
                        Répartition prévisionnelle
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Du loyer le plus ancien au plus récent.
                      </p>

                      <div className="mt-3 space-y-2">
                        {echeancesLocataire.map((e) => (
                          <div
                            key={e.id}
                            className="flex flex-col justify-between gap-1 rounded-lg border border-gray-100 bg-white px-3 py-3 text-sm sm:flex-row sm:items-center"
                          >
                            <span className="text-gray-600">
                              {e.period} · {e.lease.unit.reference}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {euros(e.resteDu)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="montant"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Montant reçu (€) *
                </label>
                <input
                  id="montant"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={montant}
                  onChange={(event) => setMontant(event.target.value)}
                  required
                  placeholder="Ex. : 500"
                  className={classesChamp}
                />
              </div>

              <div>
                <label
                  htmlFor="datePaiement"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Date réelle du paiement *
                </label>
                <input
                  id="datePaiement"
                  type="date"
                  value={datePaiement}
                  onChange={(event) => setDatePaiement(event.target.value)}
                  required
                  className={classesChamp}
                />
              </div>

              <div>
                <label
                  htmlFor="methode"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Mode de paiement
                </label>
                <select
                  id="methode"
                  value={methode}
                  onChange={(event) => setMethode(event.target.value)}
                  className={classesChamp}
                >
                  {methodes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reference"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Référence
                  <span className="ml-1 font-normal text-gray-400">
                    (facultatif)
                  </span>
                </label>
                <input
                  id="reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  maxLength={150}
                  placeholder="Référence du virement"
                  className={classesChamp}
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="note"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Commentaire
                  <span className="ml-1 font-normal text-gray-400">
                    (facultatif)
                  </span>
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Ex. : versement pour régulariser les arriérés"
                  className={classesChamp}
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-gray-500">
                  Le montant ne peut pas dépasser la dette restante du locataire.
                </p>

                <button
                  type="submit"
                  disabled={
                    envoi ||
                    !tenantId ||
                    detteLocataire <= 0 ||
                    echeances.length === 0
                  }
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {envoi
                    ? "Enregistrement..."
                    : "Enregistrer et répartir le paiement"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Échéances de loyers */}
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">
                Échéances de loyers
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {chargement
                  ? "Chargement..."
                  : `${echeancesFiltrees.length} échéance(s) affichée(s) sur ${echeances.length}`}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="search"
                value={rechercheEcheances}
                onChange={(event) =>
                  setRechercheEcheances(event.target.value)
                }
                placeholder="Rechercher..."
                aria-label="Rechercher une échéance"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
              />

              <select
                value={filtreStatut}
                onChange={(event) => setFiltreStatut(event.target.value)}
                aria-label="Filtrer par statut"
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              >
                <option value="TOUS">Tous les statuts</option>
                <option value="PAYE">Payé</option>
                <option value="PARTIEL">Partiel</option>
                <option value="IMPAYE">Impayé</option>
              </select>
            </div>
          </div>

          {chargement ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Chargement des échéances...
            </div>
          ) : echeancesFiltrees.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-gray-900">
                Aucune échéance trouvée
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Modifiez les filtres ou générez les échéances de loyers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Période</th>
                    <th className="px-5 py-4 font-semibold">Locataire</th>
                    <th className="px-5 py-4 font-semibold">Logement</th>
                    <th className="px-5 py-4 font-semibold">Échéance</th>
                    <th className="px-5 py-4 text-right font-semibold">Dû</th>
                    <th className="px-5 py-4 text-right font-semibold">Payé</th>
                    <th className="px-5 py-4 text-right font-semibold">Reste</th>
                    <th className="px-5 py-4 font-semibold">Statut</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {echeancesFiltrees.map((e) => (
                    <tr
                      key={e.id}
                      className="transition hover:bg-gray-50/80"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                        {e.period}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {e.lease.tenant.firstName} {e.lease.tenant.lastName}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800">
                          {e.lease.unit.reference}
                        </p>
                        {e.lease.unit.city && (
                          <p className="mt-1 text-xs text-gray-400">
                            {e.lease.unit.city}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {dateFr(e.dueDate)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-gray-700">
                        {euros(e.amount)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-emerald-700">
                        {euros(e.montantPaye)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-gray-900">
                        {euros(e.resteDu)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${classesStatut(e.statutPaiement)}`}
                        >
                          {statutLabel(e.statutPaiement)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Historique des paiements */}
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">
                Historique des paiements
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {chargement
                  ? "Chargement..."
                  : `${paiementsFiltres.length} paiement(s) affiché(s) sur ${paiements.length}`}
              </p>
            </div>

            <input
              type="search"
              value={recherchePaiements}
              onChange={(event) =>
                setRecherchePaiements(event.target.value)
              }
              placeholder="Référence, mode..."
              aria-label="Rechercher dans l'historique des paiements"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 sm:max-w-xs"
            />
          </div>

          {chargement ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Chargement de l'historique...
            </div>
          ) : paiementsFiltres.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-gray-900">
                Aucun paiement trouvé
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Les paiements enregistrés apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Date</th>
                    <th className="px-5 py-4 font-semibold">Montant</th>
                    <th className="px-5 py-4 font-semibold">Mode</th>
                    <th className="px-5 py-4 font-semibold">Référence</th>
                    <th className="px-5 py-4 font-semibold">Commentaire</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {paiementsFiltres.map((p) => (
                    <tr
                      key={p.id}
                      className="transition hover:bg-gray-50/80"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {dateFr(p.paymentDate)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-emerald-700">
                        {euros(p.amount)}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {methodes.find((m) => m.value === p.method)?.label ??
                          p.method ??
                          "Non renseigné"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {p.reference || "—"}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-gray-500">
                        <span className="line-clamp-2">
                          {p.note || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
