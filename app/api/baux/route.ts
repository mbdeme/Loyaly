import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const statutsAutorises = ["ACTIVE", "ENDED", "TERMINATED"];

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
    const baux = await prisma.lease.findMany({
      where: {
        unit: { ownerId: user.id },
        tenant: { ownerId: user.id },
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        unit: {
          select: {
            id: true,
            reference: true,
            address: true,
            city: true,
            property: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(baux);
  } catch (error) {
    console.error("Erreur lors du chargement des baux :", error);

    return NextResponse.json(
      { error: "Impossible de charger les baux." },
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
      tenantId,
      unitId,
      startDate,
      endDate,
      monthlyRent,
      status,
    } = body as Record<string, unknown>;

    if (
      typeof tenantId !== "string" ||
      !tenantId.trim() ||
      typeof unitId !== "string" ||
      !unitId.trim() ||
      typeof startDate !== "string" ||
      Number.isNaN(Date.parse(startDate)) ||
      (endDate !== undefined &&
        endDate !== null &&
        (typeof endDate !== "string" ||
          Number.isNaN(Date.parse(endDate)))) ||
      typeof monthlyRent !== "number" ||
      !Number.isSafeInteger(monthlyRent) ||
      monthlyRent < 0 ||
      (status !== undefined &&
        (typeof status !== "string" ||
          !statutsAutorises.includes(status)))
    ) {
      return NextResponse.json(
        { error: "Veuillez vérifier les informations du bail." },
        { status: 400 }
      );
    }

    const debut = new Date(startDate);
    const fin =
      typeof endDate === "string" && endDate
        ? new Date(endDate)
        : null;

    if (
      fin &&
      fin.getTime() < debut.getTime()
    ) {
      return NextResponse.json(
        { error: "La date de fin doit être postérieure à la date de début." },
        { status: 400 }
      );
    }

    const [locataire, logement] = await Promise.all([
      prisma.tenant.findFirst({
        where: {
          id: tenantId,
          ownerId: user.id,
        },
        select: { id: true },
      }),
      prisma.unit.findFirst({
        where: {
          id: unitId,
          ownerId: user.id,
        },
        select: {
          id: true,
          monthlyRent: true,
        },
      }),
    ]);

    if (!locataire) {
      return NextResponse.json(
        { error: "Le locataire sélectionné n'existe pas ou ne vous appartient pas." },
        { status: 403 }
      );
    }

    if (!logement) {
      return NextResponse.json(
        { error: "Le logement sélectionné n'existe pas ou ne vous appartient pas." },
        { status: 403 }
      );
    }

    const statut = typeof status === "string" ? status : "ACTIVE";

    if (statut === "ACTIVE") {
      const bailExistant = await prisma.lease.findFirst({
        where: {
          unitId,
          status: "ACTIVE",
          OR: [
            { endDate: null },
            { endDate: { gte: debut } },
          ],
          startDate: { lte: fin ?? new Date("9999-12-31T23:59:59.999Z") },
        },
        select: { id: true },
      });

      if (bailExistant) {
        return NextResponse.json(
          { error: "Ce logement possède déjà un bail actif sur cette période." },
          { status: 409 }
        );
      }
    }

    const emailUtilisateur = user.email;

if (!emailUtilisateur) {
  return NextResponse.json(
    { error: "L'adresse e-mail du compte est manquante." },
    { status: 401 }
  );
}

const nomUtilisateur =
  typeof user.user_metadata?.name === "string"
    ? user.user_metadata.name
    : emailUtilisateur;

await prisma.user.upsert({
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

    const bail = await prisma.lease.create({
      data: {
        tenantId,
        unitId,
        startDate: debut,
        endDate: fin,
        monthlyRent,
        status: statut,
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        unit: {
          select: {
            id: true,
            reference: true,
            address: true,
            city: true,
            property: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(bail, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Le format des données est invalide." },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la création du bail :", error);

    return NextResponse.json(
      { error: "Impossible de créer le bail." },
      { status: 500 }
    );
  }
}