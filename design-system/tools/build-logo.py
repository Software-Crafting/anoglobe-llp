# Builds the logo, mark and favicon SVGs into assets/img/. The wordmark is outlined from Inter
# (SemiBold for Anoglobe, 450 for Bookkeeping) so the files render as images without font loading.
# Dev only. Needs fonttools: python3 -m venv .venv && .venv/bin/pip install fonttools brotli
# Run from design-system/: .venv/bin/python tools/build-logo.py assets/fonts/InterVariable.woff2 assets/img
import sys, math
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

font_path, out = sys.argv[1], sys.argv[2]
def text_path(text, weight, size, x0, baseline, tracking_em):
    f = TTFont(font_path)
    f = instantiateVariableFont(f, {"wght": weight, "opsz": 32})
    gs = f.getGlyphSet(); cmap = f.getBestCmap(); upem = f["head"].unitsPerEm
    hmtx = f["hmtx"]; scale = size / upem
    x = x0; paths = []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
        tpen = TransformPen(pen, (scale, 0, 0, -scale, x, baseline))
        gs[g].draw(tpen)
        paths.append(pen.getCommands())
        x += hmtx[g][0] * scale + tracking_em * size
    return " ".join(paths), x - tracking_em * size

def pt(theta, r=12, c=16):
    t = math.radians(theta); return c + r*math.cos(t), c + r*math.sin(t)
def f2(v): return ("%.2f" % v).rstrip("0").rstrip(".")

a1s, a1e, a2s = pt(180), pt(304), pt(326)
globe = (f"M{f2(a1s[0])} {f2(a1s[1])}A12 12 0 0 1 {f2(a1e[0])} {f2(a1e[1])}"
         f"M{f2(a2s[0])} {f2(a2s[1])}A12 12 0 1 1 {f2(a1s[0])} {f2(a1s[1])}"
         "M11 16A5 12 0 0 1 21 16"
         "M9.5 21.5H22.5")
ledger = "M4 16H30"
def mark(ink, accent, sw=2.5):
    return (f'<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="{sw}">'
            f'<path stroke="{ink}" d="{globe}"/><path stroke="{accent}" d="{ledger}"/></g>')

word, wend = text_path("Anoglobe", 600, 21, 40, 23.6, -0.02)
sub, send = text_path("Bookkeeping", 450, 21, wend + 6, 23.6, -0.01)
W = math.ceil(send + 1)
INK, ACC, MUTED = "#1e2a2c", "#0f766e", "#4f676b"
RINK, RACC, RMUTED = "#f9fafb", "#2dd4bf", "#c1cfd2"
def logo(ink, acc, muted, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 32" role="img" aria-labelledby="t">'
            f'<title id="t">{title}</title>{mark(ink, acc)}'
            f'<path fill="{ink}" d="{word}"/><path fill="{muted}" d="{sub}"/></svg>\n')
def markfile(ink, acc, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-labelledby="t">'
            f'<title id="t">{title}</title>{mark(ink, acc)}</svg>\n')
files = {
  "logo.svg": logo(INK, ACC, MUTED, "Anoglobe Bookkeeping"),
  "logo-reversed.svg": logo(RINK, RACC, RMUTED, "Anoglobe Bookkeeping"),
  "logo-mono.svg": logo("#0e1517", "#0e1517", "#0e1517", "Anoglobe Bookkeeping"),
  "logo-mono-reversed.svg": logo("#ffffff", "#ffffff", "#ffffff", "Anoglobe Bookkeeping"),
  "logo-mark.svg": markfile(INK, ACC, "Anoglobe"),
  "logo-mark-reversed.svg": markfile(RINK, RACC, "Anoglobe"),
  "logo-mark-mono.svg": markfile("#0e1517", "#0e1517", "Anoglobe"),
}
# Favicon: tile so it reads on any tab color; heavier strokes, no meridian for 16px clarity.
fav_globe = (f"M{f2(a1s[0])} {f2(a1s[1])}A12 12 0 0 1 {f2(a1e[0])} {f2(a1e[1])}"
             f"M{f2(a2s[0])} {f2(a2s[1])}A12 12 0 1 1 {f2(a1s[0])} {f2(a1s[1])}M10 22H22")
files["favicon.svg"] = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
  '<rect width="32" height="32" rx="8" fill="#1e2a2c"/>'
  '<g transform="translate(3.2 3.2) scale(0.8)" fill="none" stroke-linecap="round" stroke-width="3.25">'
  f'<path stroke="#f9fafb" d="{fav_globe}"/><path stroke="#2dd4bf" d="M4 16H28"/></g></svg>\n')
import os
for name, svg in files.items():
    open(os.path.join(out, name), "w").write(svg)
print("width", W)
