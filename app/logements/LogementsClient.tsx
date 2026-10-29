import { getCurrentUser } from "@/lib/supabase/auth";
import LogementsClient from "./LogementsClient";

export default async function LogementsPage() {
  await getCurrentUser();
  return <LogementsClient />;
}