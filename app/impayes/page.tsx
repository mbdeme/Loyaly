
import { getCurrentUser } from "@/lib/supabase/auth";
import ImpayesClient from "./ImpayesClient";

export default async function ImpayesPage() {
  await getCurrentUser();
  return <ImpayesClient />;
}
