
import { getCurrentUser } from "@/lib/supabase/auth";
import LocatairesClient from "./LocatairesClient";

export default async function LocatairesPage() {
  await getCurrentUser();

  return <LocatairesClient />;
}
