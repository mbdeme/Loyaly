
"use client";

import { useCallback, useEffect, useState } from "react";

type Bien = {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  postalCode: string | null;
};

const types = [
  { value: "APARTMENT", label: "Appartement" },
  { value: "STUDIO", label: "Studio" },
  { value: "HOUSE", label: "Maison" },
  { value: "BUILDING", label: "Immeuble" },
];

const classeChamp =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

const classeLabel =
  "mb-2 block text-sm font-medium text-gray-700";

export default function BiensClient() {
  const [biens, setBiens] = useState<Bien[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("APARTMENT");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageErreur, setMessageErreur] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const chargerBiens = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setMessageErreur(false);

    try {
      const response = await fetch("/api/biens", {
        signal: AbortSignal.timeout(15000),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Impossible de charger les biens."
        );
      }

      setBiens(data);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Erreur de connexion. Réessayez."
      );
      setMessageErreur(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void chargerBiens();
  }, [chargerBiens]);

  async function ajouterBien(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setMessageErreur(false);

    try {
      const response = await fetch("/api/biens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          address: address.trim(),
          city: city.trim(),
          postalCode: postalCode.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'ajouter le bien.");
      }

      setBiens((anciens) => [data, ...anciens]);
      setName("");
      setAddress("");
      setCity("");
      setPostalCode("");
      setType("APARTMENT");
      setMessage("Bien ajouté avec succès.");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Erreur de connexion. Réessayez."
      );
      setMessageErreur(true);
    } finally {
      setSaving(false);
    }
  }

  const nombreVilles = new Set(
    biens.map((bien) => bien.city.trim().toLowerCase()).filter(Boolean)
  ).size;

  const classeType = (valeur: string) => {
    switch (valeur) {
      case "BUILDING":
        return "bg-violet-50 text-violet-800";
      case "HOUSE":
        return "bg-amber-50 text-amber-800";
      case "STUDIO":
        return "bg-sky-50 text-sky-800";
      default:
        return "bg-emerald-50 text-emerald-800";
    }
  };

  const symboleType = (valeur: string) => {
    switch (valeur) {
      case "BUILDING":
        return "▦";
      case "HOUSE":
        return "⌂";
      case "STUDIO":
        return "▣";
      default:
        return "⌂";
    }
  };

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
              Mes biens
            </h1>
            <p className="mt-2 text-gray-600">
              Centralisez vos appartements, studios, maisons et immeubles.
            </p>
          </div>

          <a
            href="#ajouter-bien"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <span className="mr-2 text-lg">+</span>
            Ajouter un bien
          </a>
        </header>

        {/* Messages */}
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
                onClick={() => void chargerBiens()}
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
                  Total des biens
                </p>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {loading ? "—" : biens.length}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-800">
                ▦
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Biens enregistrés dans Localy
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Types de biens
                </p>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {loading ? "—" : new Set(biens.map((bien) => bien.type)).size}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-xl text-sky-800">
                ◈
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Catégories représentées dans votre patrimoine
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Villes couvertes
                </p>
                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {loading ? "—" : nombreVilles}
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-800">
                ⌖
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Villes renseignées pour vos biens
            </p>
          </article>
        </section>

        {/* Formulaire */}
        <section
          id="ajouter-bien"
          className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="border-b border-gray-100 pb-5">
            <h2 className="text-xl font-semibold text-gray-900">
              Ajouter un bien
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Renseignez les caractéristiques et la localisation du bien.
            </p>
          </div>

          <form
            onSubmit={ajouterBien}
            className="mt-6 grid gap-5 sm:grid-cols-2"
          >
            <div>
              <label htmlFor="name" className={classeLabel}>
                Nom du bien *
              </label>
              <input
                id="name"
                required
                maxLength={150}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Résidence du centre"
                className={classeChamp}
              />
            </div>

            <div>
              <label htmlFor="type" className={classeLabel}>
                Type de bien *
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
              <label htmlFor="address" className={classeLabel}>
                Adresse *
              </label>
              <input
                id="address"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Numéro et nom de rue"
                className={classeChamp}
              />
            </div>

            <div>
              <label htmlFor="city" className={classeLabel}>
                Ville *
              </label>
              <input
                id="city"
                required
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
                {saving ? "Enregistrement..." : "Ajouter le bien"}
              </button>
            </div>
          </form>
        </section>

        {/* Liste des biens */}
        <section>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Mes biens enregistrés
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Retrouvez les biens et leurs adresses.
              </p>
            </div>

            {!loading && (
              <span className="inline-flex w-fit rounded-full bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700">
                {biens.length} bien{biens.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-800" />
              <p className="mt-4 text-sm text-gray-500">
                Chargement des biens...
              </p>
            </div>
          ) : biens.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-800">
                ▦
              </span>
              <h3 className="mt-4 font-semibold text-gray-900">
                Aucun bien enregistré
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Ajoutez votre premier bien à l'aide du formulaire.
              </p>
              <a
                href="#ajouter-bien"
                className="mt-5 inline-flex rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Ajouter un bien
              </a>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {biens.map((bien) => (
                <article
                  key={bien.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-800">
                      {symboleType(bien.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold text-gray-900">
                        {bien.name}
                      </h3>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classeType(bien.type)}`}
                      >
                        {types.find((option) => option.value === bien.type)
                          ?.label ?? bien.type}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-gray-400">⌖</span>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Adresse</p>
                        <p className="mt-1 break-words text-sm text-gray-800">
                          {bien.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-gray-400">⌂</span>
                      <div>
                        <p className="text-xs text-gray-500">Localisation</p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {bien.postalCode ? `${bien.postalCode} ` : ""}
                          {bien.city}
                        </p>
                      </div>
                    </div>
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
