
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);

  async function connecter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setChargement(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: motDePasse,
      });

      if (error) {
        setMessage("Connexion impossible. Vérifiez vos identifiants et la confirmation de votre e-mail.");
        return;
      }

      const response = await fetch("/api/profile", {
  method: "POST",
});

if (!response.ok) {
  setMessage(
    "Connexion réussie, mais impossible de préparer votre profil. Réessayez."
  );
  return;
}

window.location.href = "/";
    } catch {
      setMessage("Une erreur est survenue. Réessayez.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <form
        onSubmit={connecter}
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Connexion à Loyaly
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Retrouvez la gestion de vos biens.
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
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        
        <div className="text-right">
            <a
                 href="/mot-de-passe-oublie"
                    className="text-sm font-medium text-blue-700 underline">
                    Mot de passe oublié ?
            </a>
        </div>

        <button
          type="submit"
          disabled={chargement}
          className="w-full rounded-lg bg-blue-700 px-4 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {chargement ? "Connexion..." : "Se connecter"}
        </button>

        {message && (
          <p role="alert" className="text-sm text-red-700">
            {message}
          </p>
        )}

        <p className="text-center text-sm text-gray-600">
          Pas encore de compte ?{" "}
          <a href="/inscription" className="font-medium text-blue-700 underline">
            Créer un compte
          </a>
        </p>
      </form>
    </main>
  );
}
