
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id || !user.email) {
    return NextResponse.json(
      { error: "Non autorisé." },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
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
      (email !== undefined && email !== null && typeof email !== "string") ||
      (phone !== undefined && phone !== null && typeof phone !== "string")
    ) {
      return NextResponse.json(
        { error: "Veuillez vérifier les informations du locataire." },
        { status: 400 }
      );
    }

    const emailNettoye = typeof email === "string" ? email.trim() : "";
    const telephoneNettoye = typeof phone === "string" ? phone.trim() : "";

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

    const locataireExistant = await prisma.tenant.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
      select: { id: true },
    });

    if (!locataireExistant) {
      return NextResponse.json(
        { error: "Locataire introuvable." },
        { status: 404 }
      );
    }

    const locataire = await prisma.tenant.update({
      where: { id: locataireExistant.id },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: emailNettoye || null,
        phone: telephoneNettoye || null,
      },
    });

    return NextResponse.json(locataire);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Le format des données est invalide." },
        { status: 400 }
      );
    }

    console.error("Erreur lors de la modification du locataire :", error);

    return NextResponse.json(
      { error: "Impossible de modifier le locataire." },
      { status: 500 }
    );
  }
}
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id || !user.email) {
    return NextResponse.json(
      { error: "Non autorisé." },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;

    const locataire = await prisma.tenant.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
      select: {
        id: true,
        _count: {
          select: {
            leases: true,
          },
        },
      },
    });

    if (!locataire) {
      return NextResponse.json(
        { error: "Locataire introuvable." },
        { status: 404 }
      );
    }

    if (locataire._count.leases > 0) {
      return NextResponse.json(
        {
          error:
            "Ce locataire possède un ou plusieurs baux. Vous ne pouvez pas le supprimer afin de conserver l'historique des locations.",
        },
        { status: 409 }
      );
    }

    const resultat = await prisma.tenant.deleteMany({
      where: {
        id,
        ownerId: user.id,
        leases: {
          none: {},
        },
      },
    });

    if (resultat.count === 0) {
      return NextResponse.json(
        {
          error:
            "La suppression est impossible. Vérifiez que le locataire n'a pas de bail associé.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Locataire supprimé avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la suppression du locataire :",
      error
    );

    return NextResponse.json(
      { error: "Impossible de supprimer le locataire." },
      { status: 500 }
    );
  }
}