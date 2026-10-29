
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
    const logements = await prisma.unit.findMany({
      where: { ownerId: user.id },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(logements);
  } catch (error) {
    console.error("Erreur lors du chargement des logements :", error);

    return NextResponse.json(
      { error: "Impossible de charger les logements." },
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

    const {
      reference,
      type,
      floor,
      address,
      city,
      postalCode,
      monthlyRent,
      propertyId,
    } = body as Record<string, unknown>;

    if (
      typeof reference !== "string" ||
      !reference.trim() ||
      reference.trim().length > 100 ||
      typeof type !== "string" ||
      !typesAutorises.includes(type) ||
      typeof monthlyRent !== "number" ||
      !Number.isSafeInteger(monthlyRent) ||
      monthlyRent < 0 ||
      (floor !== undefined && floor !== null && typeof floor !== "string") ||
      (address !== undefined && address !== null && typeof address !== "string") ||
      (city !== undefined && city !== null && typeof city !== "string") ||
      (postalCode !== undefined && postalCode !== null && typeof postalCode !== "string") ||
      (propertyId !== undefined && propertyId !== null && typeof propertyId !== "string")
    ) {
      return NextResponse.json(
        { error: "Veuillez vérifier les informations du logement." },
        { status: 400 }
      );
    }

    let property = null;

    if (typeof propertyId === "string" && propertyId.trim()) {
      property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          ownerId: user.id,
        },
        select: { id: true },
      });

      if (!property) {
        return NextResponse.json(
          { error: "Le bien sélectionné n'existe pas ou ne vous appartient pas." },
          { status: 403 }
        );
      }
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

    const logement = await prisma.unit.create({
      data: {
        reference: reference.trim(),
        type,
        floor: typeof floor === "string" && floor.trim() ? floor.trim() : null,
        address: typeof address === "string" && address.trim() ? address.trim() : null,
        city: typeof city === "string" && city.trim() ? city.trim() : null,
        postalCode: typeof postalCode === "string" && postalCode.trim() ? postalCode.trim() : null,
        monthlyRent,
        ownerId: profil.id,
        propertyId: property?.id ?? null,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(logement, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Le format des données est invalide." },
        { status: 400 }
      );
    }

    console.error("Erreur lors de l'ajout du logement :", error);

    return NextResponse.json(
      { error: "Impossible d'ajouter le logement. Vérifiez notamment que sa référence n'est pas déjà utilisée dans ce bien." },
      { status: 500 }
    );
  }
}
