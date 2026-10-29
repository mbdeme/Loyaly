
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ReinitialiserMotDePassePage() {
  const router = useRouter();

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [pret, setPret] = useState(false);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let actif = true;

    async function preparerSession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          if (actif) {
            setMessage(
              `Impossible de valider le lien : ${error.message}`
            );
          }
          return;
        }

        window.history.replaceState({}, "", url.pathname);
      }

      const { data, error } = await supabase.auth.getSession();

      if (!actif) return;

      if (error || !data.session) {
        setMessage(
          "Lien invalide ou expiré. Demandez un nouvel e-mail de réinitialisation et ouvrez son dernier lien."
        );
        return;
      }

      setPret(true);
    }

    preparerSession();

    return () => {
      actif = false;
    };
  }, []);

  async function reinitialiser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (motDePasse.length < 12) {
      setMessage("Le mot de passe doit contenir au moins 12 caractères.");
      return;
    }

    if (motDePasse !== confirmation) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setChargement(true);

    try {
      const supabase = createClient();

      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setMessage("Votre session de réinitialisation est absente ou expirée. Demandez un nouveau lien.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: motDePasse,
      });

      if (error) {
        setMessage(`Erreur Supabase : ${error.message}`);
        return;
      }

      setSucces(true);
      setMessage("Votre mot de passe a été modifié avec succès.");

      await supabase.auth.signOut();
    } catch {
      setMessage("Une erreur inattendue est survenue. Réessayez.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <form
        onSubmit={reinitialiser}
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Nouveau mot de passe
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Choisissez un nouveau mot de passe pour votre compte Loyaly.
          </p>
        </div>

        {!pret && !succes && (
          <p className="text-sm text-gray-600">
            Vérification du lien de réinitialisation...
          </p>
        )}

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Nouveau mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            disabled={!pret || chargement || succes}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            Au moins 12 caractères.
          </p>
        </div>

        <div>
          <label htmlFor="confirmation" className="mb-1 block text-sm font-medium">
            Confirmer le mot de passe
          </label>
          <input
            id="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            disabled={!pret || chargement || succes}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={!pret || chargement || succes}
          className="w-full rounded-lg bg-blue-700 px-4 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {chargement ? "Modification..." : "Enregistrer le nouveau mot de passe"}
        </button>

        {message && (
          <p
            role={succes ? "status" : "alert"}
            className={`text-sm ${succes ? "text-green-700" : "text-red-700"}`}
          >
            {message}
          </p>
        )}

        {succes && (
          <button
            type="button"
            onClick={() => router.replace("/connexion")}
            className="w-full text-center text-sm font-medium text-blue-700 underline"
          >
            Se connecter avec le nouveau mot de passe
          </button>
        )}
      </form>
    </main>
  );
}
