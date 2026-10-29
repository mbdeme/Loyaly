import { getCurrentUser } from "@/lib/supabase/auth";
import PaiementsClient from "./PaiementsClient";

export default async function PaiementsPage() {
  await getCurrentUser();

  return <PaiementsClient />;
}