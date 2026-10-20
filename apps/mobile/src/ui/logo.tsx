import { SvgXml } from "react-native-svg";
import { useUniwind } from "uniwind";
import { ICON_SVG, LOCKUP_SVG } from "./brand-svg";

const white = (svg: string) => svg.replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="#FFFFFF"');
const ratio = (svg: string) => {
  const [, , w, h] = /viewBox="([^"]+)"/.exec(svg)![1].split(" ").map(Number);
  return w / h;
};

/** The Nutivo lockup; white on dark backgrounds. */
export function Logo({ height = 32, kind = "lockup" }: { height?: number; kind?: "lockup" | "icon" }) {
  const { theme } = useUniwind();
  const svg = kind === "lockup" ? LOCKUP_SVG : ICON_SVG;
  return <SvgXml xml={theme === "dark" ? white(svg) : svg} height={height} width={height * ratio(svg)} accessibilityLabel="Nutivo" />;
}
