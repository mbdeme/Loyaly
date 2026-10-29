
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function InscriptionPage() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);

  async function inscrire(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setChargement(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email,
        password: motDePasse,
        options: {
          data: {
            name: nom,
          },
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Inscription enregistrée. Consultez votre boîte mail pour confirmer votre adresse."
        );
      }
    } catch {
      setMessage("Impossible de contacter le service. Réessayez.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <form
        onSubmit={inscrire}
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Créer un compte Loyaly
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Gérez vos biens et vos locations simplement.
          </p>
        </div>

        <div>
          <label htmlFor="nom" className="mb-1 block text-sm font-medium">
            Nom complet
          </label>
          <input
            id="nom"
            type="text"
            autoComplete="name"
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
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
          <label
            htmlFor="motDePasse"
            className="mb-1 block text-sm font-medium"
          >
            Mot de passe (12 caractères minimum)
          </label>
          <input
            id="motDePasse"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={chargement}
          className="w-full rounded-lg bg-blue-700 px-4 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {chargement ? "Inscription..." : "Créer mon compte"}
        </button>

        {message && (
          <p role="status" aria-live="polite" className="text-sm text-gray-700">
            {message}
          </p>
        )}
      </form>
    </main>
  );
}
