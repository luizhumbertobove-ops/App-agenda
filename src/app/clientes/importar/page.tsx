export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { ImportarClient } from "./importar-client";

export default async function ImportarPage() {
  await cookies();
  return <ImportarClient />;
}
