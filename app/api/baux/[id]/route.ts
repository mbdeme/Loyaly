
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function getUtilisateurConnecte() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) return null;
  return user;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUtilisateurConnecte();

  if (!user) {
    return NextResponse.json(
      { error: "Non autorisé." },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;

    const bail = await prisma.lease.findFirst({
      where: {
        id,
        unit: { ownerId: user.id },
        tenant: { ownerId: user.id },
      },
      include: {
        charges: {
          include: {
            allocations: true,
          },
        },
      },
    });

    if (!bail) {
      return NextResponse.json(
        { error: "Bail introuvable." },
        { status: 404 }
      );
    }

    const aDesPaiements = bail.charges.some(
      (charge) => charge.allocations.length > 0
    );

    if (aDesPaiements) {
      return NextResponse.json(
        {
          error:
            "Ce bail possède des échéances avec des paiements. Pour préserver l'historique comptable, il ne peut pas être supprimé.",
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.rentCharge.deleteMany({
        where: { leaseId: id },
      });

      await tx.lease.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      message: "Bail supprimé avec succès.",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du bail :", error);

    return NextResponse.json(
      { error: "Impossible de supprimer ce bail." },
      { status: 500 }
    );
  }
}
