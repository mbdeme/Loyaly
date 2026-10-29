
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const methodesAutorisees = [
  "VIREMENT",
  "CHEQUE",
  "ESPECES",
  "PRELEVEMENT",
  "CARTE",
  "AUTRE",
];

async function getUtilisateurConnecte() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) return null;
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
    const paiements = await prisma.payment.findMany({
      where: {
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
        allocations: {
          include: {
            rentCharge: {
              include: {
                lease: {
                  include: {
                    unit: {
                      select: {
                        id: true,
                        reference: true,
                        city: true,
                        property: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    });

    const resultat = paiements.map((paiement) => {
      const montantAffecte = paiement.allocations.reduce(
        (total, allocation) => total + allocation.amount,
        0
      );

      return {
        ...paiement,
        montantAffecte,
        creditDisponible: Math.max(0, paiement.amount - montantAffecte),
      };
    });

    return NextResponse.json(resultat);
  } catch (error) {
    console.error("Erreur lors du chargement des paiements :", error);

    return NextResponse.json(
      { error: "Impossible de charger les paiements." },
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
      amount,
      paymentDate,
      method,
      reference,
      note,
    } = body as Record<string, unknown>;

    if (
      typeof tenantId !== "string" ||
      !tenantId.trim() ||
      typeof amount !== "number" ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      (paymentDate !== undefined &&
        (typeof paymentDate !== "string" ||
          Number.isNaN(Date.parse(paymentDate)))) ||
      (method !== undefined &&
        method !== null &&
        (typeof method !== "string" ||
          !methodesAutorisees.includes(method))) ||
      (reference !== undefined &&
        reference !== null &&
        typeof reference !== "string") ||
      (note !== undefined && note !== null && typeof note !== "string")
    ) {
      return NextResponse.json(
        { error: "Vérifiez le locataire, le montant et les informations du paiement." },
        { status: 400 }
      );
    }

    const locataire = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        ownerId: user.id,
      },
      select: { id: true },
    });

    if (!locataire) {
      return NextResponse.json(
        { error: "Ce locataire n'existe pas ou ne vous appartient pas." },
        { status: 404 }
      );
    }

    const datePaiement =
      typeof paymentDate === "string"
        ? new Date(paymentDate)
        : new Date();

    const resultat = await prisma.$transaction(async (tx) => {
      const echeances = await tx.rentCharge.findMany({
        where: {
          dueDate: { lte: datePaiement },
          lease: {
            tenantId,
            tenant: { ownerId: user.id },
            unit: { ownerId: user.id },
          },
        },
        include: {
          allocations: { select: { amount: true } },
        },
        orderBy: [{ dueDate: "asc" }, { period: "asc" }],
      });

      const restes = echeances
        .map((echeance) => ({
          echeance,
          reste: Math.max(
            0,
            echeance.amount -
              echeance.allocations.reduce(
                (total, allocation) => total + allocation.amount,
                0
              )
          ),
        }))
        .filter((item) => item.reste > 0);

      const paiement = await tx.payment.create({
        data: {
          tenantId,
          amount,
          paymentDate: datePaiement,
          method: typeof method === "string" ? method : null,
          reference:
            typeof reference === "string" && reference.trim()
              ? reference.trim()
              : null,
          note:
            typeof note === "string" && note.trim()
              ? note.trim()
              : null,
        },
      });

      let montantRestant = amount;

      const allocations: {
        paymentId: string;
        rentChargeId: string;
        amount: number;
      }[] = [];

      for (const item of restes) {
        if (montantRestant <= 0) break;

        const montantAffecte = Math.min(
          item.reste,
          montantRestant
        );

        allocations.push({
          paymentId: paiement.id,
          rentChargeId: item.echeance.id,
          amount: montantAffecte,
        });

        montantRestant -= montantAffecte;
      }

      if (allocations.length > 0) {
        await tx.paymentAllocation.createMany({
          data: allocations,
        });
      }

      return {
        paiement,
        allocations,
        montantAffecte: amount - montantRestant,
        creditDisponible: montantRestant,
      };
    });

    return NextResponse.json(resultat, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Le format des données est invalide." },
        { status: 400 }
      );
    }

    console.error("Erreur lors de l'enregistrement du paiement :", error);

    return NextResponse.json(
      { error: "Impossible d'enregistrer le paiement." },
      { status: 500 }
    );
  }
}
