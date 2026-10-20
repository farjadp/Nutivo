"""
Vectorizes the Nutivo logo into flat two-colour SVGs (Deep Green + Imperial Purple, no emboss or gradient).
Source: docs/brand/nutivo-logo-hero.webp (1754×1196, the largest render the founder supplied).
Interim: replace with the designer's original vector files when they arrive.
Usage: python3 scripts/vectorize-logo.py <out_dir>
"""
import sys, cv2, numpy as np

SOURCE = "docs/brand/nutivo-logo-hero.webp"
GREEN, PURPLE = "#007F71", "#66023C"
SCALE = 3

def masks(crop):
    big = cv2.resize(crop, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_CUBIC)
    hsv = cv2.cvtColor(big, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    greenish = (h >= 40) & (h <= 122)
    # Cores: clearly coloured pixels. Shape: anything that is not the cream paper, so pale highlights
    # inside the logo (the pink sheen on the purple panel) stay inside the shape.
    g_core = ((s > 55) & (v < 235) & greenish).astype(np.uint8)
    p_core = ((s > 55) & (v < 235) & ~greenish).astype(np.uint8)
    # Paper and its shadows are warm cream/grey (hue ≈ 10–35); the logo's pale sheen keeps a pink or teal hue.
    logo_hue = greenish | (h >= 135) | (h <= 4)
    shape = ((((s > 18) & logo_hue) | (s > 55)) & (v < 250)).astype(np.uint8) * 255
    k = np.ones((5, 5), np.uint8)
    shape = cv2.morphologyEx(shape, cv2.MORPH_CLOSE, k, iterations=2)
    shape = cv2.morphologyEx(shape, cv2.MORPH_OPEN, k, iterations=1)
    shape = cv2.GaussianBlur(shape, (0, 0), SCALE * 0.9)
    _, shape = cv2.threshold(shape, 127, 255, cv2.THRESH_BINARY)
    # Each shape pixel takes the colour of the nearest core.
    dg = cv2.distanceTransform(1 - g_core, cv2.DIST_L2, 5)
    dp = cv2.distanceTransform(1 - p_core, cv2.DIST_L2, 5)
    inside = shape > 0
    out = []
    for m in (inside & (dg <= dp), inside & (dp < dg)):
        m = m.astype(np.uint8) * 255
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k, iterations=1)
        m = cv2.GaussianBlur(m, (0, 0), SCALE * 0.6)
        _, m = cv2.threshold(m, 127, 255, cv2.THRESH_BINARY)
        out.append(m)
    return out

def path_d(mask, min_area, keep=None, pts_out=None):
    contours, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    d = []
    for i, c in enumerate(contours):
        if abs(cv2.contourArea(c)) < min_area:
            continue
        if keep is not None:
            x, y, w, hh = cv2.boundingRect(c)
            if not keep(x / SCALE, y / SCALE, w / SCALE, hh / SCALE):
                continue
        c = cv2.approxPolyDP(c, 0.6 * SCALE / 2, True)
        if pts_out is not None:
            pts_out.extend((p[0][0] / SCALE, p[0][1] / SCALE) for p in c)
        pts = " ".join(f"{p[0][0] / SCALE:.2f},{p[0][1] / SCALE:.2f}" for p in c)
        d.append(f"M{pts}Z")
    return " ".join(d)

def svg(crop_box, keep=None, colors=(GREEN, PURPLE), pad=4):
    img = cv2.imread(SOURCE)
    x0, y0, x1, y1 = crop_box
    crop = img[y0:y1, x0:x1]
    g, p = masks(crop)
    w, h = x1 - x0, y1 - y0
    pts = []
    dg = path_d(g, 40 * SCALE * SCALE / 4, keep, pts)
    dp = path_d(p, 40 * SCALE * SCALE / 4, keep, pts)
    # tight viewBox from the shapes actually drawn
    xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
    bx0, by0, bx1, by1 = min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{bx0:.1f} {by0:.1f} {bx1 - bx0:.1f} {by1 - by0:.1f}">'
            f'<path fill="{colors[0]}" fill-rule="evenodd" d="{dg}"/><path fill="{colors[1]}" fill-rule="evenodd" d="{dp}"/></svg>')

if __name__ == "__main__":
    out = sys.argv[1]
    HERO = (240, 120, 1600, 1120)
    open(f"{out}/nutivo-lockup.svg", "w").write(svg(HERO))
    # icon only: the arch and its leaves sit in the middle column; the wordmark starts lower
    open(f"{out}/nutivo-icon.svg", "w").write(svg(HERO, keep=lambda x, y, w, h: 460 <= x + w / 2 <= 960 and y < 560))
    print("ok")
