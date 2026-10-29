
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const typesAutorises = [
  "APARTMENT",
  "STUDIO",
  "HOUSE",
  "BUILDING",
];

async function getUtilisateurConnecte() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

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
    const biens = await prisma.property.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(biens);
  } catch (error) {
    console.error("Erreur lors du chargement des biens :", error);

    return NextResponse.json(
      { error: "Impossible de charger les biens." },
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

    const { name, type, address, city, postalCode } =
      body as Record<string, unknown>;

    if (
      typeof name !== "string" || !name.trim() ||
      name.trim().length > 150 ||
      typeof address !== "string" || !address.trim() ||
      address.trim().length > 250 ||
      typeof city !== "string" || !city.trim() ||
      city.trim().length > 100 ||
      typeof type !== "string" ||
      !typesAutorises.includes(type) ||
      (postalCode !== undefined &&
        postalCode !== null &&
        typeof postalCode !== "string")
    ) {
      return NextResponse.json(
        { error: "Veuillez vérifier les informations du bien." },
        { status: 400 }
      );
    }

    const nomUtilisateur =
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : user.email!;

    const profil = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email!,
        name: nomUtilisateur,
      },
      create: {
        id: user.id,
        email: user.email!,
        name: nomUtilisateur,
      },
    });

    const bien = await prisma.property.create({
      data: {
        name: name.trim(),
        type,
        address: address.trim(),
        city: city.trim(),
        postalCode:
          typeof postalCode === "string" && postalCode.trim()
            ? postalCode.trim()
            : null,
        ownerId: profil.id,
      },
    });

    return NextResponse.json(bien, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Le format des données est invalide." },
        { status: 400 }
      );
    }

    console.error("Erreur lors de l'ajout du bien :", error);

    return NextResponse.json(
      { error: "Impossible d'ajouter le bien." },
      { status: 500 }
    );
  }
}
