
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

    const locataire = await prisma.tenant.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
      include: {
        leases: {
          include: {
            charges: {
              include: {
                allocations: true,
              },
            },
          },
        },
        payments: {
          select: { id: true },
        },
      },
    });

    if (!locataire) {
      return NextResponse.json(
        { error: "Locataire introuvable." },
        { status: 404 }
      );
    }

    if (locataire.leases.length > 0 || locataire.payments.length > 0) {
      return NextResponse.json(
        {
          error:
            "Ce locataire possède encore un bail ou un historique de paiements. Supprimez d'abord les baux supprimables ou archivez le locataire pour conserver son historique.",
        },
        { status: 409 }
      );
    }

    await prisma.tenant.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Locataire supprimé avec succès.",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du locataire :", error);

    return NextResponse.json(
      { error: "Impossible de supprimer ce locataire." },
      { status: 500 }
    );
  }
}
