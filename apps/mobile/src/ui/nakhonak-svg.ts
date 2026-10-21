import type { NakhonakMood } from "@nutivo/core";

/**
 * ناخنک, drawn on the same 120 grid and ink as نوتی, in layers so each part can move on its own:
 * cape (sways), body + face (breathes, droops when he loses), eyes (blink), hand (wags while telling).
 * A small عیار: felt cap, curled mustache, purple tunic, cape with an amber lining. No horns, no tail.
 */

const INK = "#20252B";
const PURPLE = "#66023C";
const PURPLE_DARK = "#3E0124";
const FACE = "#F6D3B8";
const AMBER = "#D97706";
const MOUTH = "#8E2A3F";
const BLUSH = "#F2949A";
const POMEGRANATE = "#B3263B";

const wrap = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${inner}</svg>`;

export const NAKHONAK_CAPE = wrap(
  `<path d="M33 66C20 84 16 102 20 116h80c4-14 0-32-13-50z" fill="${AMBER}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M36 66C26 84 24 100 27 113h66c3-13 1-29-9-47z" fill="${PURPLE_DARK}"/>`,
);

const BODY =
  // tunic
  `<path d="M60 44c22 0 34 18 33 40-1 18-14 30-33 30S28 102 27 84c-1-22 11-40 33-40z" fill="${PURPLE}" stroke="${INK}" stroke-width="2.5"/>` +
  // amber sash with a knot
  `<path d="M31 94q29 10 58 0" stroke="${AMBER}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
  `<circle cx="77" cy="97" r="3.2" fill="${AMBER}" stroke="${INK}" stroke-width="1.5"/>` +
  // face
  `<ellipse cx="60" cy="69" rx="24" ry="21" fill="${FACE}" stroke="${INK}" stroke-width="2.5"/>` +
  // felt cap (کلاه نمدی) with a tassel
  `<path d="M34 58c-1-20 12-30 26-30s27 10 26 30q-26-9-52 0z" fill="${PURPLE_DARK}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` +
  `<path d="M38 55q22-7 44 0" stroke="${AMBER}" stroke-width="2.2" stroke-linecap="round" fill="none"/>` +
  `<path d="M60 28q8-6 12 2" stroke="${INK}" stroke-width="2" stroke-linecap="round" fill="none"/>` +
  `<circle cx="72" cy="31" r="3.2" fill="${AMBER}" stroke="${INK}" stroke-width="1.5"/>`;

const CURL = `<path d="M60 77q-7 5-15 2-4-2-2-6M60 77q7 5 15 2 4-2 2-6" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
const DROOP = `<path d="M60 77q-7 3-12 9-2 3 1 4M60 77q7 3 12 9 2 3-1 4" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
const blush = `<ellipse cx="42" cy="75" rx="4.5" ry="2.6" fill="${BLUSH}" opacity="0.6"/><ellipse cx="78" cy="75" rx="4.5" ry="2.6" fill="${BLUSH}" opacity="0.6"/>`;
const line = (d: string, w = 2.6) => `<path d="${d}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
const eye = (cx: number, cy = 67, look = 0) =>
  `<ellipse cx="${cx + look}" cy="${cy}" rx="3.4" ry="4.2" fill="${INK}"/><circle cx="${cx + look + 1.2}" cy="${cy - 1.7}" r="1.2" fill="#fff"/>`;

/** Eyes on their own layer so they can blink. Closed-eye moods draw them here too. */
const EYES: Record<NakhonakMood, string> = {
  sly: eye(51, 67, 1.5) + eye(70, 67, 1.5),
  telling: eye(50) + eye(70),
  smug: line("M45 68q5-5 10 0") + line("M65 68q5-5 10 0"),
  beaten: line("M46 64l6 3-6 3") + line("M74 64l-6 3 6 3"),
  gentle: line("M45 66q5 3 10 0") + line("M65 66q5 3 10 0"),
  truce: line("M45 66q5 3 10 0") + line("M65 66q5 3 10 0"),
};

/** Brows, mustache and mouth. */
const FACE_PARTS: Record<NakhonakMood, string> = {
  sly: line("M44 60l10 1") + line("M66 59q5-5 11-2") + CURL + line("M54 85q7 3 13-2", 2.4),
  telling: line("M44 60q5-3 10-1") + line("M66 57q5-6 11-3") + CURL + `<ellipse cx="60" cy="85.5" rx="3.4" ry="3" fill="${MOUTH}" stroke="${INK}" stroke-width="1.8"/>`,
  smug:
    line("M44 59l10 2") + line("M76 59l-10 2") + CURL +
    `<path d="M51 83q9 8 18 0z" fill="${MOUTH}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  beaten: line("M44 61l10-3") + line("M76 61l-10-3") + DROOP + line("M54 88.5q3-2 6 0t6 0", 2.2),
  gentle: line("M45 59q5-2 10 0") + line("M65 59q5-2 10 0") + CURL + line("M54 84q6 4 12 0", 2.4) + blush,
  truce: line("M45 59q5-2 10 0") + line("M65 59q5-2 10 0") + CURL + line("M53 83q7 5 14 0", 2.4) + blush,
};

/** The storyteller's hand: raised finger for sly/telling, a pomegranate for a truce. Null when it stays down. */
/** The storyteller's hand: a rolled scroll (طومار) while telling, a pomegranate for a truce. Null when it stays down. */
const HAND: Partial<Record<NakhonakMood, string>> = {
  telling:
    `<path d="M86 90q8-3 10-12" stroke="${PURPLE}" stroke-width="7" stroke-linecap="round" fill="none"/>` +
    `<rect x="90" y="54" width="14" height="24" rx="2" fill="#FFF8EC" stroke="${INK}" stroke-width="2"/>` +
    `<rect x="87" y="51" width="20" height="5" rx="2.5" fill="${AMBER}" stroke="${INK}" stroke-width="1.8"/>` +
    `<rect x="87" y="76" width="20" height="5" rx="2.5" fill="${AMBER}" stroke="${INK}" stroke-width="1.8"/>` +
    `<path d="M93 61h8M93 65h6M93 69h8" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity="0.5"/>` +
    `<circle cx="96" cy="79" r="5" fill="${FACE}" stroke="${INK}" stroke-width="2"/>`,
  truce:
    `<path d="M86 90q8-2 11-10" stroke="${PURPLE}" stroke-width="7" stroke-linecap="round" fill="none"/>` +
    `<circle cx="99" cy="76" r="9" fill="${POMEGRANATE}" stroke="${INK}" stroke-width="2.2"/>` +
    `<path d="M95 67l2 3 2-4 2 4 2-3" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" fill="${POMEGRANATE}"/>` +
    `<circle cx="96" cy="74" r="1.6" fill="#fff" opacity="0.5"/>`,
};

export function nakhonakLayers(mood: NakhonakMood): { cape: string; body: string; eyes: string; face: string; hand: string | null } {
  const hand = HAND[mood];
  return { cape: NAKHONAK_CAPE, body: wrap(BODY), eyes: wrap(EYES[mood]), face: wrap(FACE_PARTS[mood]), hand: hand ? wrap(hand) : null };
}

/** All layers flattened into one image (static uses, previews). */
export function nakhonakSvg(mood: NakhonakMood): string {
  const strip = (s: string) => s.replace(/^<svg[^>]*>|<\/svg>$/g, "");
  const l = nakhonakLayers(mood);
  return wrap([l.cape, l.body, l.eyes, l.face, l.hand ?? ""].map(strip).join(""));
}
