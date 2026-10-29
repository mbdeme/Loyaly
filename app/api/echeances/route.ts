
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  calculerLoyerProrata,
  clePeriode,
  dateExigibilite,
  debutDuMois,
} from "@/lib/localy-rent";

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
    const echeances = await prisma.rentCharge.findMany({
      where: {
        lease: {
          unit: { ownerId: user.id },
          tenant: { ownerId: user.id },
        },
      },
      include: {
        lease: {
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
                city: true,
                property: { select: { name: true } },
              },
            },
          },
        },
        allocations: { select: { amount: true } },
      },
      orderBy: [{ dueDate: "desc" }, { period: "desc" }],
    });

    const maintenant = new Date();

    const resultat = echeances.map((echeance) => {
      const montantAffecte = echeance.allocations.reduce(
        (total, allocation) => total + allocation.amount,
        0
      );

      const resteDu = Math.max(0, echeance.amount - montantAffecte);

      let statutPaiement: "A_VENIR" | "IMPAYE" | "PARTIEL" | "PAYE";

      if (resteDu === 0) {
        statutPaiement = "PAYE";
      } else if (echeance.dueDate.getTime() > maintenant.getTime()) {
        statutPaiement = "A_VENIR";
      } else if (montantAffecte > 0) {
        statutPaiement = "PARTIEL";
      } else {
        statutPaiement = "IMPAYE";
      }

      const { allocations, ...echeanceSansAllocations } = echeance;

      return {
        ...echeanceSansAllocations,
        montantAffecte,
        montantPaye: montantAffecte,
        resteDu,
        statutPaiement,
      };
    });

    return NextResponse.json(resultat);
  } catch (error) {
    console.error("Erreur lors du chargement des échéances :", error);

    return NextResponse.json(
      { error: "Impossible de charger les échéances." },
      { status: 500 }
    );
  }
}

export async function POST() {
  const user = await getUtilisateurConnecte();

  if (!user) {
    return NextResponse.json(
      { error: "Non autorisé." },
      { status: 401 }
    );
  }

  try {
    const maintenant = new Date();
    const moisCourant = debutDuMois(maintenant);
    const debutMoisSuivant = new Date(
      Date.UTC(
        maintenant.getUTCFullYear(),
        maintenant.getUTCMonth() + 1,
        1
      )
    );

    const baux = await prisma.lease.findMany({
      where: {
        startDate: { lt: debutMoisSuivant },
        unit: { ownerId: user.id },
        tenant: { ownerId: user.id },
      },
      select: {
        id: true,
        tenantId: true,
        startDate: true,
        endDate: true,
        monthlyRent: true,
        dueDayOfMonth: true,
      },
    });

    let nombreCree = 0;

    await prisma.$transaction(async (tx) => {
      for (const bail of baux) {
        const debut = debutDuMois(bail.startDate);

        const finEffective =
  bail.endDate && bail.endDate < debutMoisSuivant
    ? bail.endDate
    : maintenant;

        const fin = debutDuMois(finEffective);

        for (
          let date = new Date(debut);
          date <= fin;
          date = new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
          )
        ) {
          const periode = clePeriode(date);

          const montant = calculerLoyerProrata(
            bail.monthlyRent,
            bail.startDate,
            bail.endDate && bail.endDate < maintenant
              ? bail.endDate
              : bail.endDate,
            date
          );

          if (montant <= 0) continue;

          const echeance = await tx.rentCharge.createMany({
            data: [
              {
                leaseId: bail.id,
                period: periode,
                amount: montant,
                dueDate: dateExigibilite(
                  date.getUTCFullYear(),
                  date.getUTCMonth(),
                  bail.dueDayOfMonth
                ),
              },
            ],
            skipDuplicates: true,
          });

          nombreCree += echeance.count;
        }
      }

      // Appliquer les crédits disponibles aux échéances déjà exigibles.
      // Les crédits sont traités dans l'ordre chronologique des paiements.
      const locataireIds = [...new Set(baux.map((bail) => bail.tenantId))];

      for (const tenantId of locataireIds) {
        const paiements = await tx.payment.findMany({
          where: {
            tenantId,
            tenant: { ownerId: user.id },
          },
          include: {
            allocations: { select: { amount: true } },
          },
          orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
        });

        const echeances = await tx.rentCharge.findMany({
          where: {
            lease: {
              tenantId,
              tenant: { ownerId: user.id },
              unit: { ownerId: user.id },
            },
            dueDate: { lte: maintenant },
          },
          include: {
            allocations: { select: { amount: true } },
          },
          orderBy: [{ dueDate: "asc" }, { period: "asc" }],
        });

        const restes = new Map(
          echeances.map((e) => [
            e.id,
            Math.max(
              0,
              e.amount -
                e.allocations.reduce((s, a) => s + a.amount, 0)
            ),
          ])
        );

        for (const paiement of paiements) {
          let credit =
            paiement.amount -
            paiement.allocations.reduce((s, a) => s + a.amount, 0);

          if (credit <= 0) continue;

          for (const echeance of echeances) {
            if (credit <= 0) break;

            const reste = restes.get(echeance.id) ?? 0;
            if (reste <= 0) continue;

            const montant = Math.min(credit, reste);

            await tx.paymentAllocation.create({
              data: {
                paymentId: paiement.id,
                rentChargeId: echeance.id,
                amount: montant,
              },
            });

            restes.set(echeance.id, reste - montant);
            credit -= montant;
          }
        }
      }
    });

    const echeances = await prisma.rentCharge.findMany({
      where: {
        lease: {
          unit: { ownerId: user.id },
          tenant: { ownerId: user.id },
        },
        dueDate: { lte: maintenant },
      },
      include: {
        allocations: { select: { amount: true } },
      },
    });

    const totalDu = echeances.reduce((s, e) => s + e.amount, 0);

    const totalAffecte = echeances.reduce(
      (s, e) =>
        s + e.allocations.reduce((a, allocation) => a + allocation.amount, 0),
      0
    );

    return NextResponse.json({
      message: "Génération des échéances terminée.",
      nombreCree,
      nombreEcheances: echeances.length,
      totalDu,
      totalAffecte,
      totalImpaye: Math.max(0, totalDu - totalAffecte),
    });
  } catch (error) {
    console.error("Erreur lors de la génération des échéances :", error);

    return NextResponse.json(
      { error: "Impossible de générer les échéances." },
      { status: 500 }
    );
  }
}
