"use client";
import { sampleDraft } from "@/entities/day/sample-draft";
import { ConfirmSheet } from "@/features/log-meal/ui/confirm-sheet";

export function ConfirmPreview() {
  return (
    <main className="min-h-dvh bg-ground">
      <ConfirmSheet draft={sampleDraft("2026-10-20T19:10:00-04:00")} saving={false} error={null} onCancel={() => {}} onConfirm={() => {}} />
    </main>
  );
}
