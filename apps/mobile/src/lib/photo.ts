import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

export interface PickedPhoto {
  uri: string;
  base64: string;
  mediaType: "image/jpeg";
}

export type PickResult = { ok: true; photo: PickedPhoto } | { ok: false; reason: "cancelled" | "denied" | "failed" };

/** Camera or gallery → JPEG at most 1280px wide (enough for Claude vision, well under the 8 MB limit). */
export async function pickPhoto(from: "camera" | "library"): Promise<PickResult> {
  try {
    // The system photo picker needs no library permission; only the camera asks.
    if (from === "camera" && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return { ok: false, reason: "denied" };
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsEditing: false };
    const res = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return { ok: false, reason: "cancelled" };
    const asset = res.assets[0];
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (asset.width > 1280) ctx.resize({ width: 1280 });
    const image = await ctx.renderAsync();
    const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
    if (!out.base64) return { ok: false, reason: "failed" };
    return { ok: true, photo: { uri: out.uri, base64: out.base64, mediaType: "image/jpeg" } };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
