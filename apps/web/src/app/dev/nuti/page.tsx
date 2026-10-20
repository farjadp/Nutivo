import { notFound } from "next/navigation";
import { NutiSheet } from "./sheet";

export const metadata = { title: "نوتی · Nutivo" };

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <NutiSheet />;
}
