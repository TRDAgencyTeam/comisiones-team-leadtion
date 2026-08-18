import { redirect } from "next/navigation";

/** La página principal del módulo es el Dashboard financiero. */
export default function MembresiasIndex() {
  redirect("/membresias/dashboard");
}
