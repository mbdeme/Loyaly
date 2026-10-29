
"use client";

import { useCallback, useEffect, useState } from "react";

type Bien = {
  id: string;
  name: string;
};

type Logement = {
  id: string;
  reference: string;
  type: string;
  floor: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  monthlyRent: number;
  propertyId: string | null;
  property: Bien | null;
};

const types = [
  { value: "APARTMENT", label: "Appartement" },
  { value: "STUDIO", label: "Studio" },
  { value: "HOUSE", label: "Maison" },
  { value: "BUILDING", label: "Immeuble" },
];

const formaterMontant = (montant: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(montant);

export default function LogementsPage() {
  const [logements, setLogements] = useState<Logement[]>([]);
  const [biens, setBiens] = useState<Bien[]>([]);
  const [reference, setReference] = useState("");
  const [type, setType] = useState("APARTMENT");
  const [floor, setFloor] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [message, setMessage] = useState("");
  const [messageErreur, setMessageErreur] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const chargerDonnees = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setMessageErreur(false);

    try {
      const options = { signal: AbortSignal.timeout(15000) };

      const [reponseLogements, reponseBiens] = await Promise.all([
        fetch("/api/logements", options),
        fetch("/api/biens", options),
      ]);

      if (!reponseLogements.ok || !reponseBiens.ok) {
        throw new Error(
          "Impossible de charger les données. Vérifiez votre connexion."
        );
      }

      const [donneesLogements, donneesBiens] = await Promise.all([
        reponseLogements.json(),
        reponseBiens.json(),
      ]);

      setLogements(donneesLogements);
      setBiens(donneesBiens);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Erreur de connexion. Réessayez."
      );
      setMessageErreur(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void chargerDonnees();
  }, [chargerDonnees]);

  async function ajouterLogement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageErreur(false);

    try {
      const response = await fetch("/api/logements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: reference.trim(),
          type,
          floor: floor.trim(),
          address: address.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          monthlyRent: Number(monthlyRent),
          propertyId: propertyId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'ajouter le logement.");
      }

      setLogements((anciens) => [data, ...anciens]);
      setReference("");
      setType("APARTMENT");
      setFloor("");
      setAddress("");
      setCity("");
      setPostalCode("");
      setMonthlyRent("");
      setPropertyId("");
      setMessage("Logement ajouté avec succès.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Erreur de connexion. Réessayez."
      );
      setMessageErreur(true);
    } finally {
      setSaving(false);
    }
  }

  const totalLoyers = logements.reduce(
    (total, logement) => total + Number(logement.monthlyRent || 0),
    0
  );

  const nombreTypes = new Set(logements.map((logement) => logement.type)).size;
  const nombreRattaches = logements.filter(
    (logement) => logement.propertyId || logement.property
  ).length;

  const classeChamp =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

  const classeLabel =
    "mb-2 block text-sm font-medium text-gray-700";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* En-tête */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium tracking-wide text-emerald-800">
              GESTION LOCATIVE
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Mes logements
            </h1>
            <p className="mt-2 text-gray-600">
              Gérez vos logements, leurs loyers et leur rattachement à un bien.
            </p>
          </div>

          <a
            href="#ajouter-logement"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <span className="mr-2 text-lg">+</span>
            Ajouter un logement
          </a>
        </header>

        {/* Message de confirmation ou d'erreur */}
        {message && (
          <div
            role={messageErreur ? "alert" : "status"}
            className={`rounded-xl border p-4 text-sm ${
              messageErreur
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {message}
            {messageErreur && (
              <button
                type="button"
                onClick={() => void chargerDonnees()}
                className="ml-3 font-semibold underline"
              >
                Réessayer
              </button>
            )}
          </div>
        )}

        {/* Indicateurs */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Logements enregistrés
                </p>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {loading ? "—" : logements.length}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-800">
                ⌂
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Ensemble de vos unités locatives
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Loyers mensuels cumulés
                </p>
                <p className="mt-3 text-2xl font-bold text-gray-900">
                  {loading ? "—" : formaterMontant(totalLoyers)}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl font-semibold text-emerald-800">
                €
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Somme des loyers renseignés
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Logements rattachés à un bien
                </p>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {loading ? "—" : nombreRattaches}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl text-gray-700">
                ▦
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              {loading ? "Chargement..." : `${biens.length} bien${biens.length > 1 ? "s" : ""} disponible${biens.length > 1 ? "s" : ""}`}
            </p>
          </article>
        </section>

        {/* Formulaire */}
        <section
          id="ajouter-logement"
          className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="border-b border-gray-100 pb-5">
            <h2 className="text-xl font-semibold text-gray-900">
              Ajouter un logement
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Renseignez les caractéristiques et le loyer du logement.
            </p>
          </div>

          <form
            onSubmit={ajouterLogement}
            className="mt-6 grid gap-5 sm:grid-cols-2"
          >
            <div>
              <label htmlFor="reference" className={classeLabel}>
                Référence ou nom *
              </label>
              <input
                id="reference"
                required
                maxLength={100}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex. Appartement A1"
                className={classeChamp}
              />
            </div>

            <div>
              <label htmlFor="type" className={classeLabel}>
                Type de logement *
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={classeChamp}
              >
                {types.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="propertyId" className={classeLabel}>
                Bien parent
                <span className="ml-2 font-normal text-gray-400">
                  (facultatif)
                </span>
              </label>
              <select
                id="propertyId"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className={classeChamp}
              >
                <option value="">
                  Aucun bien parent — logement indépendant
                </option>
                {biens.map((bien) => (
                  <option key={bien.id} value={bien.id}>
                    {bien.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="floor" className={classeLabel}>
                Étage
                <span className="ml-2 font-normal text-gray-400">
                  (facultatif)
                </span>
              </label>
              <input
                id="floor"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="Ex. 2e étage"
                className={classeChamp}
              />
            </div>

            <div>
              <label htmlFor="monthlyRent" className={classeLabel}>
                Loyer mensuel (€) *
              </label>
              <input
                id="monthlyRent"
                type="number"
                min="0"
                step="1"
                required
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="Ex. 750"
                className={classeChamp}
              />
              <p className="mt-2 text-xs text-gray-500">
                Saisissez le montant en euros entiers.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="address" className={classeLabel}>
                Adresse
                <span className="ml-2 font-normal text-gray-400">
                  (facultative si héritée du bien)
                </span>
              </label>
              <input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Numéro et nom de rue"
                className={classeChamp}
              />
            </div>

            <div>
              <label htmlFor="city" className={classeLabel}>
                Ville
              </label>
              <input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex. Melun"
                className={classeChamp}
              />
            </div>

            <div>
              <label htmlFor="postalCode" className={classeLabel}>
                Code postal
              </label>
              <input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Ex. 77000"
                className={classeChamp}
              />
            </div>

            <div className="border-t border-gray-100 pt-5 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Enregistrement..." : "Ajouter le logement"}
              </button>
            </div>
          </form>
        </section>

        {/* Liste des logements */}
        <section>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Logements enregistrés
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Retrouvez les informations principales de chaque logement.
              </p>
            </div>
            {!loading && (
              <span className="inline-flex w-fit rounded-full bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700">
                {logements.length} logement{logements.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-800" />
              <p className="mt-4 text-sm text-gray-500">
                Chargement des logements...
              </p>
            </div>
          ) : logements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-800">
                ⌂
              </span>
              <h3 className="mt-4 font-semibold text-gray-900">
                Aucun logement enregistré
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Ajoutez votre premier logement à l'aide du formulaire.
              </p>
              <a
                href="#ajouter-logement"
                className="mt-5 inline-flex rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Ajouter un logement
              </a>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {logements.map((logement) => (
                <article
                  key={logement.id}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-800">
                        {logement.type === "HOUSE"
                          ? "⌂"
                          : logement.type === "STUDIO"
                            ? "▣"
                            : "▦"}
                      </span>
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-gray-900">
                          {logement.reference}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {types.find((option) => option.value === logement.type)
                            ?.label ?? logement.type}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                    {logement.property && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-emerald-800">▦</span>
                        <div>
                          <p className="text-xs text-gray-500">Bien parent</p>
                          <p className="font-medium text-gray-800">
                            {logement.property.name}
                          </p>
                        </div>
                      </div>
                    )}

                    {logement.floor && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-gray-400">↕</span>
                        <div>
                          <p className="text-xs text-gray-500">Étage</p>
                          <p className="text-gray-800">{logement.floor}</p>
                        </div>
                      </div>
                    )}

                    {(logement.address ||
                      logement.postalCode ||
                      logement.city) && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-gray-400">⌖</span>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Adresse</p>
                          <p className="break-words text-gray-700">
                            {[
                              logement.address,
                              logement.postalCode,
                              logement.city,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">
                      Loyer mensuel
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-900">
                      {formaterMontant(logement.monthlyRent)}
                      <span className="ml-1 text-sm font-medium text-gray-500">
                        /mois
                      </span>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
