
"use client";

import { useCallback, useEffect, useState } from "react";

type Locataire = {
  id: string;
  firstName: string;
  lastName: string;
};

type Logement = {
  id: string;
  reference: string;
  monthlyRent: number;
  address?: string | null;
  city?: string | null;
  property?: { id: string; name: string } | null;
};

type Bail = {
  id: string;
  startDate: string;
  endDate: string | null;
  monthlyRent: number;
  status: string;
  tenant: Locataire;
  unit: Logement;
};

const dateAujourdhui = () => {
  const date = new Date();
  const decalage = date.getTimezoneOffset();
  date.setMinutes(date.getMinutes() - decalage);
  return date.toISOString().slice(0, 10);
};

const formaterDate = (date: string | null) => {
  if (!date) return "Sans date de fin";

  const valeur = date.slice(0, 10);
  const [annee, mois, jour] = valeur.split("-");

  return `${jour}/${mois}/${annee}`;
};

const formaterMontant = (montant: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(montant / 100);

export default function BauxClient() {
  const [baux, setBaux] = useState<Bail[]>([]);
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [logements, setLogements] = useState<Logement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [suppressionId, setSuppressionId] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const [tenantId, setTenantId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");

  // La date est initialisée côté navigateur, après le montage.
  useEffect(() => {
    setStartDate(dateAujourdhui());
  }, []);

  const chargerDonnees = useCallback(async () => {
    setChargement(true);
    setErreur("");

    try {
      const options = {
        signal: AbortSignal.timeout(15000),
      };

      const [reponseBaux, reponseLocataires, reponseLogements] =
        await Promise.all([
          fetch("/api/baux", options),
          fetch("/api/locataires", options),
          fetch("/api/logements", options),
        ]);

      const reponses = [
        reponseBaux,
        reponseLocataires,
        reponseLogements,
      ];

      for (const reponse of reponses) {
        if (!reponse.ok) {
          const contenu = await reponse.json().catch(() => ({}));
          throw new Error(
            contenu.error || "Impossible de charger les données."
          );
        }
      }

      const [donneesBaux, donneesLocataires, donneesLogements] =
        await Promise.all(reponses.map((reponse) => reponse.json()));

      setBaux(donneesBaux);
      setLocataires(donneesLocataires);
      setLogements(donneesLogements);
    } catch (e) {
      setErreur(
        e instanceof Error
          ? e.message
          : "Une erreur est survenue lors du chargement."
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void chargerDonnees();
  }, [chargerDonnees]);

  useEffect(() => {
    const logement = logements.find((item) => item.id === unitId);

    if (logement) {
      setMonthlyRent(String(logement.monthlyRent / 100));
    }
  }, [unitId, logements]);

  async function ajouterBail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur("");
    setMessage("");

    if (!tenantId || !unitId || !startDate || !monthlyRent.trim()) {
      setErreur("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (endDate && endDate < startDate) {
      setErreur("La date de fin doit être postérieure à la date de début.");
      return;
    }

    const montant = Number(monthlyRent.replace(",", "."));

    if (!Number.isFinite(montant) || montant <= 0) {
      setErreur("Le montant du loyer doit être supérieur à zéro.");
      return;
    }

    const montantEnCentimes = Math.round(montant * 100);

    setEnvoi(true);

    try {
      const reponse = await fetch("/api/baux", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          unitId,
          startDate,
          endDate: endDate || null,
          monthlyRent: montantEnCentimes,
          status: "ACTIVE",
        }),
      });

      const donnees = await reponse.json();

      if (!reponse.ok) {
        throw new Error(donnees.error || "Impossible de créer le bail.");
      }

      setMessage("Le bail a été créé avec succès.");
      setTenantId("");
      setUnitId("");
      setStartDate(dateAujourdhui());
      setEndDate("");
      setMonthlyRent("");

      await chargerDonnees();
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Une erreur est survenue."
      );
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimerBail(bail: Bail) {
    const confirme = window.confirm(
      `Voulez-vous vraiment supprimer le bail de ${bail.tenant.firstName} ${bail.tenant.lastName} ?\n\nLa suppression est définitive si le bail ne possède pas d'affectations de paiement.`
    );

    if (!confirme) return;

    setErreur("");
    setMessage("");
    setSuppressionId(bail.id);

    try {
      const reponse = await fetch(`/api/baux/${bail.id}`, {
        method: "DELETE",
      });
      const donnees = await reponse.json().catch(() => ({}));

      if (!reponse.ok) {
        throw new Error(donnees.error || "Impossible de supprimer le bail.");
      }

      setMessage(donnees.message || "Bail supprimé avec succès.");
      await chargerDonnees();
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Une erreur est survenue lors de la suppression."
      );
    } finally {
      setSuppressionId(null);
    }
  }

  const bauxActifs = baux.filter((bail) => bail.status === "ACTIVE");

  const bauxTermines = baux.filter(
    (bail) => bail.status === "ENDED" || bail.status === "TERMINATED"
  );

  const totalLoyersMensuels = bauxActifs.reduce(
    (total, bail) => total + bail.monthlyRent,
    0
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* En-tête */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-800">
              GESTION LOCATIVE
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Mes baux
            </h1>
            <p className="mt-2 text-gray-600">
              Gérez les contrats de location et suivez vos engagements locatifs.
            </p>
          </div>

          <a
            href="#ajouter-bail"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <span className="mr-2 text-lg">+</span>
            Ajouter un bail
          </a>
        </header>

        {/* Messages */}
        {erreur && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <span className="font-bold">!</span>
            <div>
              <p className="font-semibold">Une erreur est survenue</p>
              <p className="mt-1">{erreur}</p>
            </div>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {message}
          </div>
        )}

        {/* Indicateurs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total des baux
                </p>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {chargement ? "—" : baux.length}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl">
                ▤
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Contrats enregistrés
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Baux actifs
                </p>
                <p className="mt-3 text-3xl font-bold text-emerald-800">
                  {chargement ? "—" : bauxActifs.length}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-800">
                ✓
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Contrats au statut actif
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Loyers mensuels des baux actifs
                </p>
                <p className="mt-3 text-2xl font-bold text-gray-900">
                  {chargement ? "—" : formaterMontant(totalLoyersMensuels)}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-800">
                €
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Somme des loyers mensuels contractuels
            </p>
          </article>
        </section>

        {/* Formulaire */}
        <section
          id="ajouter-bail"
          className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="border-b border-gray-100 pb-5">
            <h2 className="text-xl font-semibold text-gray-900">
              Ajouter un bail
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Renseignez les informations du contrat de location.
            </p>
          </div>

          {locataires.length === 0 || logements.length === 0 ? (
            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Pour créer un bail, ajoutez d'abord au moins un locataire et un
              logement.
            </p>
          ) : null}

          <form
            onSubmit={ajouterBail}
            className="mt-6 grid gap-5 sm:grid-cols-2"
          >
            <div>
              <label
                htmlFor="tenantId"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Locataire <span className="text-emerald-800">*</span>
              </label>
              <select
                id="tenantId"
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Choisir un locataire</option>
                {locataires.map((locataire) => (
                  <option key={locataire.id} value={locataire.id}>
                    {locataire.firstName} {locataire.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="unitId"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Logement <span className="text-emerald-800">*</span>
              </label>
              <select
                id="unitId"
                value={unitId}
                onChange={(event) => setUnitId(event.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Choisir un logement</option>
                {logements.map((logement) => (
                  <option key={logement.id} value={logement.id}>
                    {logement.reference}
                    {logement.property ? ` — ${logement.property.name}` : ""}
                    {logement.city ? ` (${logement.city})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="startDate"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Date de début <span className="text-emerald-800">*</span>
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Date de fin
                <span className="ml-2 font-normal text-gray-400">
                  (facultatif)
                </span>
              </label>
              <input
                id="endDate"
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="monthlyRent"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Loyer mensuel (€){" "}
                <span className="text-emerald-800">*</span>
              </label>
              <div className="relative">
                <input
                  id="monthlyRent"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monthlyRent}
                  onChange={(event) => setMonthlyRent(event.target.value)}
                  required
                  placeholder="Ex. : 750"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm text-gray-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  €
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Montant du loyer prévu au contrat.
              </p>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={
                  envoi ||
                  !startDate ||
                  locataires.length === 0 ||
                  logements.length === 0
                }
                className="w-full rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {envoi ? "Création en cours..." : "Créer le bail"}
              </button>
            </div>
          </form>
        </section>

        {/* Liste des baux */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Liste des baux
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Retrouvez les contrats et leurs informations principales.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700">
              {chargement ? "Chargement..." : `${baux.length} bail${baux.length > 1 ? "s" : ""}`}
            </span>
          </div>

          {chargement ? (
            <div className="flex items-center gap-3 px-6 py-12 text-sm text-gray-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-800" />
              Chargement des baux...
            </div>
          ) : baux.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-800">
                ▤
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">
                Aucun bail enregistré
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Créez votre premier bail à l'aide du formulaire ci-dessus.
              </p>
              <a
                href="#ajouter-bail"
                className="mt-5 inline-flex rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Ajouter un bail
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-4 font-semibold">Locataire</th>
                    <th className="px-6 py-4 font-semibold">Logement</th>
                    <th className="px-6 py-4 font-semibold">Début</th>
                    <th className="px-6 py-4 font-semibold">Fin</th>
                    <th className="px-6 py-4 font-semibold">Loyer mensuel</th>
                    <th className="px-6 py-4 font-semibold">Statut</th>
                    <th className="px-6 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {baux.map((bail) => (
                    <tr
                      key={bail.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-6 py-5">
                        <p className="font-semibold text-gray-900">
                          {bail.tenant.firstName} {bail.tenant.lastName}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          Contrat de location
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-medium text-gray-900">
                          {bail.unit.reference}
                        </p>
                        {bail.unit.property && (
                          <p className="mt-1 text-xs text-gray-500">
                            {bail.unit.property.name}
                          </p>
                        )}
                        {bail.unit.city && (
                          <p className="mt-1 text-xs text-gray-500">
                            {bail.unit.city}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-gray-600">
                        {formaterDate(bail.startDate)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-gray-600">
                        {formaterDate(bail.endDate)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 font-semibold text-gray-900">
                        {formaterMontant(bail.monthlyRent)}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            bail.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-800"
                              : bail.status === "ENDED"
                                ? "bg-gray-100 text-gray-600"
                                : bail.status === "TERMINATED"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              bail.status === "ACTIVE"
                                ? "bg-emerald-600"
                                : bail.status === "ENDED"
                                  ? "bg-gray-400"
                                  : bail.status === "TERMINATED"
                                    ? "bg-red-500"
                                    : "bg-amber-500"
                            }`}
                          />
                          {bail.status === "ACTIVE"
                            ? "Actif"
                            : bail.status === "ENDED"
                              ? "Terminé"
                              : bail.status === "TERMINATED"
                                ? "Résilié"
                                : bail.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => void supprimerBail(bail)}
                          disabled={suppressionId === bail.id}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {suppressionId === bail.id ? "Suppression..." : "Supprimer"}
                        </button>
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
