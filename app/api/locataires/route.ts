
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function getUtilisateurConnecte() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  return user;
}

export async function GET() {
  const user = await getUtilisateurConnecte();

  if (!user) {
    return NextResponse.json(
      { error: "Non autorisé." },
      { status: 401 }
    );
  }

  try {
    const locataires = await prisma.tenant.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(locataires);
  } catch (error) {
    console.error("Erreur lors du chargement des locataires :", error);

    return NextResponse.json(
      { error: "Impossible de charger les locataires." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getUtilisateurConnecte();

  if (!user) {
    return NextResponse.json(
      { error: "Non autorisé." },
      { status: 401 }
    );
  }

  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Données invalides." },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, phone } =
      body as Record<string, unknown>;

    if (
      typeof firstName !== "string" ||
      !firstName.trim() ||
      firstName.trim().length > 100 ||
      typeof lastName !== "string" ||
      !lastName.trim() ||
      lastName.trim().length > 100 ||
      (email !== undefined &&
        email !== null &&
        typeof email !== "string") ||
      (phone !== undefined &&
        phone !== null &&
        typeof phone !== "string")
    ) {
      return NextResponse.json(
        { error: "Veuillez vérifier les informations du locataire." },
        { status: 400 }
      );
    }

    const emailNettoye =
      typeof email === "string" ? email.trim() : "";
    const telephoneNettoye =
      typeof phone === "string" ? phone.trim() : "";

    if (
      emailNettoye.length > 254 ||
      (emailNettoye !== "" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNettoye)) ||
      telephoneNettoye.length > 30
    ) {
      return NextResponse.json(
        { error: "L'adresse e-mail ou le téléphone est invalide." },
        { status: 400 }
      );
    }

   const emailUtilisateur = user.email;

if (!emailUtilisateur) {
  return NextResponse.json(
    { error: "L'adresse e-mail du compte est requise." },
    { status: 401 }
  );
}

const nomUtilisateur =
  typeof user.user_metadata?.name === "string"
    ? user.user_metadata.name
    : emailUtilisateur;

    const profil = await prisma.user.upsert({
  where: { id: user.id },
  update: {
    email: emailUtilisateur,
    name: nomUtilisateur,
  },
  create: {
    id: user.id,
    email: emailUtilisateur,
    name: nomUtilisateur,
  },
});

    const locataire = await prisma.tenant.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: emailNettoye || null,
        phone: telephoneNettoye || null,
        ownerId: profil.id,
      },
    });

    return NextResponse.json(locataire, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Le format des données est invalide." },
        { status: 400 }
      );
    }

    console.error("Erreur lors de l'ajout du locataire :", error);

    return NextResponse.json(
      { error: "Impossible d'ajouter le locataire." },
      { status: 500 }
    );
  }
}
