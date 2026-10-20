import { notFound } from "next/navigation";
import { ConfirmPreview } from "./preview";

/** Development-only: renders the confirm sheet with a sample draft. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ConfirmPreview />;
}
