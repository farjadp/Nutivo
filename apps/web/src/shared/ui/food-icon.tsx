import { FOOD_ICONS, foodIconName, type FoodIconDef, type FoodIconName, type IconLookup } from "@nutivo/core";

interface Props {
  /** Icon name, or a food to look the icon up for. */
  name?: FoodIconName;
  food?: IconLookup;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Accessible label; defaults to the icon's Persian name. Pass "" to hide from screen readers. */
  label?: string;
}

/** Brand food icon: 24-grid outline, stroke 1.75, currentColor. */
export function FoodIcon({ name, food, size = 24, strokeWidth = 1.75, className, label }: Props) {
  const key: FoodIconName = name ?? (food ? foodIconName(food) : "dish");
  const def: FoodIconDef = FOOD_ICONS[key];
  const aria = label ?? def.fa;
  const shapes = def.els.map((el, i) => {
    if ("p" in el) return <path key={i} d={el.p} />;
    if ("c" in el) return <circle key={i} cx={el.c[0]} cy={el.c[1]} r={el.c[2]} {...(el.f ? { fill: "currentColor", stroke: "none" } : {})} />;
    if ("e" in el) {
      const [cx, cy, rx, ry, rot = 0] = el.e;
      return <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} />;
    }
    const [x, y, w, h, rx = 0] = el.r;
    return <rect key={i} x={x} y={y} width={w} height={h} rx={rx} />;
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={aria ? "img" : undefined}
      aria-label={aria || undefined}
      aria-hidden={aria ? undefined : true}
    >
      {def.rot ? <g transform={`rotate(${def.rot} 12 12)`}>{shapes}</g> : shapes}
    </svg>
  );
}

const TILE = { sm: { box: "size-9", icon: 20 }, md: { box: "size-10", icon: 24 }, lg: { box: "size-14", icon: 32 } } as const;

/** Icon in the brand's mint tile, used in meal lists and the confirm sheet. Dashed when the amount is estimated. */
export function FoodIconTile({ food, name, size = "md", estimated = false }: { food?: IconLookup; name?: FoodIconName; size?: keyof typeof TILE; estimated?: boolean }) {
  const t = TILE[size];
  return (
    <span className={`grid shrink-0 place-items-center rounded-[12px] text-green-ink ${t.box} ${estimated ? "border border-dashed border-green/60 bg-surface" : "bg-mint"}`}>
      <FoodIcon food={food} name={name} size={t.icon} label="" />
    </span>
  );
}
