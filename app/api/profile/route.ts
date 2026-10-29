
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    return NextResponse.json(
      { error: "Vous devez être connecté." },
      { status: 401 }
    );
  }

  const name =
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : user.email;

  try {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name,
      },
      create: {
        id: user.id,
        email: user.email,
        name,
      },
    });

    return NextResponse.json({ success: true });
 } catch (error) {
    console.error("Erreur de synchronisation du profil :", error);

    return NextResponse.json(
      {
        error: "Impossible d'enregistrer le profil.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
