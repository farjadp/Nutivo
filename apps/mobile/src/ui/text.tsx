import { Text as RNText, type TextProps } from "react-native";

const FACE = /\bfont-(strong|heavy)\b/;
const COLOR = /\btext-(ink|ink-2|green|green-ink|purple|purple-ink|carbs|fat|fat-ink|success|error|on-green|ground|surface|mint|night|on-night)\b/;

/** Persian text in IRANYekanX. Pass font-strong / font-heavy for bold faces and any brand text colour to replace the default ink. */
export function Text({ className = "", ...props }: TextProps & { className?: string }) {
  const face = FACE.test(className) ? "" : "font-body";
  const color = COLOR.test(className) ? "" : "text-ink";
  return <RNText {...props} className={`${face} ${color} ${className}`} />;
}
