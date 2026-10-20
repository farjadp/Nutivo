"""
Vectorizes the Nutivo logo from the brand board (docs/brand/nutivo-logo-board.webp) into flat two-colour SVGs.
Interim: replace with the designer's original vector files when they arrive.
Usage: python3 scripts/vectorize-logo.py <out_dir>
"""
import sys, cv2, numpy as np

BOARD = "docs/brand/nutivo-logo-board.webp"
GREEN, PURPLE = "#007F71", "#66023C"
SCALE = 6

def masks(crop):
    big = cv2.resize(crop, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_CUBIC)
    hsv = cv2.cvtColor(big, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    logo = (s > 55) & (v < 235)
    # Every logo pixel goes to the nearer brand colour, so blended edges (the green-to-purple fade) leave no gaps.
    green = logo & (h >= 40) & (h <= 122)
    purple = logo & ~((h >= 40) & (h <= 122))
    out = []
    for m in (green, purple):
        m = m.astype(np.uint8) * 255
        k = np.ones((5, 5), np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k, iterations=2)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k, iterations=1)
        m = cv2.GaussianBlur(m, (0, 0), SCALE * 0.9)
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
    img = cv2.imread(BOARD)
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
    HERO = (130, 60, 790, 560)
    open(f"{out}/nutivo-lockup.svg", "w").write(svg(HERO))
    # icon only: the arch and its leaves sit in the middle column above the wordmark
    open(f"{out}/nutivo-icon.svg", "w").write(svg(HERO, keep=lambda x, y, w, h: 220 <= x + w / 2 <= 460 and y < 300))
    print("ok")
