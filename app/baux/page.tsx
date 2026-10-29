import { getCurrentUser } from "@/lib/supabase/auth";
import BauxClient from "./BauxClient";

export default async function BauxPage() {
  await getCurrentUser();

  return <BauxClient />;
}