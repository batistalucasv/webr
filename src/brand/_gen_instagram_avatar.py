"""Gera avatares PNG 1080×1080 para o Instagram a partir da geometria de mark.svg."""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent
SIZE = 1080
# Escala pelo anel externo (r=19.5 no mark), não pelo viewBox inteiro.
# Assim o símbolo preenche o crop circular do Instagram.
RING_FRAC = 0.82
RING_DIAMETER = 39.0  # 2 * 19.5
SCALE = (SIZE * RING_FRAC) / RING_DIAMETER
OX = SIZE / 2 - 32 * SCALE
OY = SIZE / 2 - 32 * SCALE


def tx(x: float, y: float) -> tuple[float, float]:
    return (OX + x * SCALE, OY + y * SCALE)


def stroke_w(w: float) -> int:
    return max(3, round(w * SCALE))


def draw_mark(draw: ImageDraw.ImageDraw, teal: str, ink: str) -> None:
    draw.line([tx(32, 6), tx(32, 12.5)], fill=teal, width=stroke_w(2.5))
    draw.line([tx(32, 51.5), tx(32, 58)], fill=teal, width=stroke_w(2.5))

    r = 19.5 * SCALE
    cx, cy = tx(32, 32)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=teal, width=stroke_w(2.5))

    draw.line([tx(32, 12.5), tx(32, 51.5)], fill=ink, width=stroke_w(2.25))

    for cx0, cy0 in [(32, 22), (25.5, 30), (38.5, 30)]:
        rr = 8 * SCALE
        c = tx(cx0, cy0)
        draw.ellipse(
            [c[0] - rr, c[1] - rr, c[0] + rr, c[1] + rr],
            outline=ink,
            width=stroke_w(2.25),
        )

    draw.line([tx(20.2, 48.5), tx(32, 40.5)], fill=ink, width=stroke_w(2.25))
    draw.line([tx(43.8, 48.5), tx(32, 40.5)], fill=ink, width=stroke_w(2.25))


def make(bg: str, teal: str, ink: str, path: Path) -> None:
    img = Image.new("RGB", (SIZE, SIZE), bg)
    draw = ImageDraw.Draw(img)
    draw_mark(draw, teal, ink)
    img.save(path, "PNG", optimize=True)
    print(f"wrote {path} {img.size} scale={SCALE:.2f}")


def main() -> None:
    make("#096b72", "#e8f4f3", "#e8f4f3", OUT / "instagram-avatar.png")
    make("#eef6f4", "#096b72", "#3a4149", OUT / "instagram-avatar-on-light.png")


if __name__ == "__main__":
    main()
