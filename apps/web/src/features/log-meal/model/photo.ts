/** Downscale a camera photo to ≤1568px JPEG before upload (Claude's recommended size, ~300–600 KB). */
export async function preparePhoto(file: File, maxSide = 1568): Promise<File> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob ? new File([blob], "meal.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/** Local time with offset, e.g. 2026-10-20T13:05:00-04:00, so the model sees the user's clock. */
export function localISO(d = new Date()): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const local = new Date(d.getTime() + off * 60000).toISOString().slice(0, 19);
  return `${local}${sign}${pad(off / 60)}:${pad(off % 60)}`;
}
