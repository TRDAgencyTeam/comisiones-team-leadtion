import { redirect } from "next/navigation";

/** La raíz redirige al selector de módulos. */
export default function RootIndex() {
  redirect("/modulos");
}
