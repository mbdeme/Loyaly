
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);

  async function envoyerLien(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setChargement(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
});

     if (error) {
  console.error("Erreur Supabase réinitialisation :", error);
  setMessage(`Erreur : ${error.message}`);
  return;
}

      setMessage(
        "Si un compte correspond à cette adresse, un e-mail de réinitialisation sera envoyé. Vérifiez aussi vos courriers indésirables."
      );
    } catch {
      setMessage("Une erreur est survenue. Réessayez.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <form
        onSubmit={envoyerLien}
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Mot de passe oublié ?
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Saisissez l'adresse e-mail associée à votre compte Loyaly.
            Nous vous enverrons un lien pour choisir un nouveau mot de passe.
          </p>
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Adresse e-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="vous@exemple.fr"
          />
        </div>

        <button
          type="submit"
          disabled={chargement}
          className="w-full rounded-lg bg-blue-700 px-4 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {chargement ? "Envoi en cours..." : "Recevoir le lien"}
        </button>

        {message && (
          <p role="status" className="text-sm text-gray-700">
            {message}
          </p>
        )}

        <p className="text-center text-sm">
          <a href="/connexion" className="font-medium text-blue-700 underline">
            Retour à la connexion
          </a>
        </p>
      </form>
    </main>
  );
}
