
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Locataire = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

const classesChamp =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";

export default function LocatairesClient() {
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppressionId, setSuppressionId] = useState<string | null>(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const chargerLocataires = useCallback(async () => {
    setChargement(true);
    setErreur("");

    try {
      const response = await fetch("/api/locataires", {
        signal: AbortSignal.timeout(15000),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de charger les locataires."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("La réponse du serveur est invalide.");
      }

      setLocataires(data);
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void chargerLocataires();
  }, [chargerLocataires]);

  const locatairesFiltres = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase("fr");

    if (!terme) return locataires;

    return locataires.filter((locataire) =>
      [
        locataire.firstName,
        locataire.lastName,
        locataire.email ?? "",
        locataire.phone ?? "",
      ].some((valeur) =>
        valeur.toLocaleLowerCase("fr").includes(terme)
      )
    );
  }, [locataires, recherche]);

  function reinitialiserFormulaire() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setEditingId(null);
    setFormulaireOuvert(false);
    setErreur("");
  }

  function ouvrirAjout() {
    reinitialiserFormulaire();
    setFormulaireOuvert(true);
  }

  function modifierLocataire(locataire: Locataire) {
    setEditingId(locataire.id);
    setFirstName(locataire.firstName);
    setLastName(locataire.lastName);
    setEmail(locataire.email ?? "");
    setPhone(locataire.phone ?? "");
    setErreur("");
    setFormulaireOuvert(true);
  }

  async function enregistrerLocataire(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErreur("");

    if (!firstName.trim() || !lastName.trim()) {
      setErreur("Le prénom et le nom sont obligatoires.");
      return;
    }

    setEnregistrement(true);

    try {
      const response = await fetch(
        editingId
          ? `/api/locataires/${editingId}`
          : "/api/locataires",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            phone: phone.trim(),
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible d'enregistrer le locataire."
        );
      }

      if (editingId) {
        setLocataires((precedents) =>
          precedents.map((locataire) =>
            locataire.id === editingId ? data : locataire
          )
        );
      } else {
        setLocataires((precedents) => [data, ...precedents]);
      }

      reinitialiserFormulaire();
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimerLocataire(locataire: Locataire) {
    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer ${locataire.firstName} ${locataire.lastName} ?`
    );

    if (!confirmation) return;

    setErreur("");
    setSuppressionId(locataire.id);

    try {
      const response = await fetch(
        `/api/locataires/${locataire.id}`,
        {
          method: "DELETE",
          signal: AbortSignal.timeout(15000),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de supprimer le locataire."
        );
      }

      setLocataires((precedents) =>
        precedents.filter((item) => item.id !== locataire.id)
      );

      if (editingId === locataire.id) {
        reinitialiserFormulaire();
      }
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de la suppression."
      );
    } finally {
      setSuppressionId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* En-tête */}
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-700">
              Gestion locative
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-gray-950">
              Locataires
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Retrouvez et gérez les coordonnées de vos locataires.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (formulaireOuvert) {
                reinitialiserFormulaire();
              } else {
                ouvrirAjout();
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-700/20"
          >
            <span className="text-lg leading-none">
              {formulaireOuvert ? "×" : "+"}
            </span>
            {formulaireOuvert
              ? "Fermer le formulaire"
              : "Ajouter un locataire"}
          </button>
        </header>

        {/* Erreurs */}
        {erreur && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{erreur}</p>

            {!chargement && (
              <button
                type="button"
                onClick={() => void chargerLocataires()}
                className="shrink-0 font-semibold underline underline-offset-4"
              >
                Réessayer
              </button>
            )}
          </div>
        )}

        {/* Indicateurs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">
                Total des locataires
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                👥
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold tracking-tight text-gray-950">
              {chargement ? "—" : locataires.length}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Locataires enregistrés
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">
                Coordonnées e-mail
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">
                ✉️
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold tracking-tight text-gray-950">
              {chargement
                ? "—"
                : locataires.filter((l) => Boolean(l.email?.trim())).length}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Avec une adresse e-mail renseignée
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">
                Numéros de téléphone
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-xl">
                📞
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold tracking-tight text-gray-950">
              {chargement
                ? "—"
                : locataires.filter((l) => Boolean(l.phone?.trim())).length}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Avec un téléphone renseigné
            </p>
          </div>
        </section>

        {/* Formulaire */}
        {formulaireOuvert && (
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
              <h2 className="text-lg font-semibold text-gray-950">
                {editingId
                  ? "Modifier le locataire"
                  : "Nouveau locataire"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Les champs marqués d’un astérisque sont obligatoires.
              </p>
            </div>

            <form
              onSubmit={enregistrerLocataire}
              className="space-y-6 p-5 sm:p-6"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Prénom *
                  </label>
                  <input
                    id="firstName"
                    required
                    maxLength={100}
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) =>
                      setFirstName(event.target.value)
                    }
                    className={classesChamp}
                    placeholder="Ex. : Amadou"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Nom *
                  </label>
                  <input
                    id="lastName"
                    required
                    maxLength={100}
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) =>
                      setLastName(event.target.value)
                    }
                    className={classesChamp}
                    placeholder="Ex. : Diallo"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={classesChamp}
                    placeholder="exemple@domaine.fr"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Téléphone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    maxLength={30}
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={classesChamp}
                    placeholder="Ex. : 06 12 34 56 78"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={enregistrement}
                  onClick={reinitialiserFormulaire}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={enregistrement}
                  className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enregistrement
                    ? "Enregistrement..."
                    : editingId
                      ? "Enregistrer les modifications"
                      : "Enregistrer le locataire"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Liste des locataires */}
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">
                Liste des locataires
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {chargement
                  ? "Chargement des données..."
                  : `${locatairesFiltres.length} résultat${locatairesFiltres.length > 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 4 4" />
                </svg>
              </span>

              <input
                type="search"
                aria-label="Rechercher un locataire"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Rechercher un locataire..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
              />
            </div>
          </div>

          {chargement ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-gray-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-700" />
              Chargement des locataires...
            </div>
          ) : locatairesFiltres.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                {recherche ? "🔎" : "👥"}
              </div>

              <h3 className="mt-4 font-semibold text-gray-900">
                {recherche
                  ? "Aucun résultat"
                  : "Aucun locataire pour le moment"}
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                {recherche
                  ? "Essayez avec un autre nom, une adresse e-mail ou un numéro de téléphone."
                  : "Ajoutez votre premier locataire pour commencer à gérer votre parc locatif."}
              </p>

              {!recherche && (
                <button
                  type="button"
                  onClick={ouvrirAjout}
                  className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  + Ajouter un locataire
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Locataire</th>
                    <th className="px-6 py-4 font-semibold">E-mail</th>
                    <th className="px-6 py-4 font-semibold">Téléphone</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {locatairesFiltres.map((locataire) => (
                    <tr
                      key={locataire.id}
                      className="transition hover:bg-gray-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-800">
                            {`${locataire.firstName.charAt(0)}${locataire.lastName.charAt(0)}`.toLocaleUpperCase("fr")}
                          </div>

                          <div>
                            <p className="font-semibold text-gray-900">
                              {locataire.firstName} {locataire.lastName}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              Locataire
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {locataire.email ? (
                          <a
                            href={`mailto:${locataire.email}`}
                            className="transition hover:text-emerald-700"
                          >
                            {locataire.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">Non renseigné</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {locataire.phone ? (
                          <a
                            href={`tel:${locataire.phone}`}
                            className="transition hover:text-emerald-700"
                          >
                            {locataire.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">Non renseigné</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={suppressionId !== null || enregistrement}
                            onClick={() => modifierLocataire(locataire)}
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
                          >
                            Modifier
                          </button>

                          <button
                            type="button"
                            disabled={suppressionId !== null || enregistrement}
                            onClick={() => void supprimerLocataire(locataire)}
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {suppressionId === locataire.id
                              ? "Suppression..."
                              : "Supprimer"}
                          </button>
                        </div>
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
