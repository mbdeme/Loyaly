
import { getCurrentUser } from "@/lib/supabase/auth";
import BiensClient from "./BiensClient";

export default async function BiensPage() {
  await getCurrentUser();

  return <BiensClient />;
}
