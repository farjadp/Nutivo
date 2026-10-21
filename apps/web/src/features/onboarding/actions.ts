"use server";
import { suggestGoals } from "@nutivo/core";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  sex: z.enum(["male", "female"]),
  age: z.coerce.number().int().min(14).max(100),
  height_cm: z.coerce.number().min(120).max(230),
  weight_kg: z.coerce.number().min(35).max(300),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["lose", "maintain", "gain"]),
  timezone: z.string().min(1).max(64),
});
// Where to land after saving: only known in-app pages, never a URL taken from the form as is.
const ReturnTo = z.enum(["/today", "/me"]).catch("/today");

export type OnboardingState = { error?: string };

export async function saveProfileAction(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const { return_to, ...fields } = Object.fromEntries(form);
  const parsed = Schema.safeParse(fields);
  if (!parsed.success) return { error: "همه فیلدها را با عدد درست پر کن." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const p = parsed.data;
  const g = suggestGoals(p);
  const { error } = await supabase.from("profiles").upsert({
    id: auth.user.id,
    ...p,
    goal_kcal: g.kcal,
    goal_protein_g: g.protein_g,
    goal_carbs_g: g.carbs_g,
    goal_fat_g: g.fat_g,
  });
  if (error) return { error: "ذخیره پروفایل انجام نشد. دوباره امتحان کن." };
  redirect(ReturnTo.parse(return_to));
}
