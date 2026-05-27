#!/usr/bin/env python3
"""
Generates Whim app icon.
Sunset gradient: deep red-orange at top → vivid orange → warm amber at bottom.
Text: 'Whim' in white, Futura Bold, slightly tight spacing.
"""
from PIL import Image, ImageDraw, ImageFont
import os

# Sunset gradient — deep top, warm amber bottom
GRADIENT = [
    (210,  50,   5),   # #D23205  deep red-orange (top)
    (255,  90,  20),   # #FF5A14  vivid orange (mid)
    (255, 160,  50),   # #FFA032  warm amber (bottom)
]

WHITE = (255, 255, 255)

FONT_PATH  = '/System/Library/Fonts/Supplemental/Futura.ttc'
FONT_INDEX = 2  # Bold

def lerp_color(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def gradient_color(y, height):
    stops = GRADIENT
    n = len(stops) - 1
    t = y / height
    seg = min(int(t * n), n - 1)
    return lerp_color(stops[seg], stops[seg + 1], (t * n) - seg)

def draw_tight(draw, text, font, cx, cy, spacing=-6):
    """Draw text centred at (cx, cy) with mild letter spacing adjustment."""
    chars = list(text)
    widths, offsets = [], []
    for ch in chars:
        bb = draw.textbbox((0, 0), ch, font=font)
        widths.append(bb[2] - bb[0])
        offsets.append(bb)

    total_w = sum(widths) + spacing * (len(chars) - 1)
    x = cx - total_w / 2

    for ch, w, bb in zip(chars, widths, offsets):
        char_h = bb[3] - bb[1]
        draw.text((x - bb[0], cy - char_h / 2 - bb[1]), ch, font=font, fill=WHITE)
        x += w + spacing

def make_icon(path, size):
    img    = Image.new('RGB', (size, size))
    pixels = img.load()

    for y in range(size):
        color = gradient_color(y, size)
        for x in range(size):
            pixels[x, y] = color

    draw = ImageDraw.Draw(img)
    text = 'Whim'
    spacing = int(-6 * size / 1024)

    # Fit font to ~74% of icon width
    max_w = int(size * 0.74)
    for pt in range(size, 10, -1):
        font = ImageFont.truetype(FONT_PATH, pt, index=FONT_INDEX)
        total = sum(
            draw.textbbox((0, 0), ch, font=font)[2] -
            draw.textbbox((0, 0), ch, font=font)[0]
            for ch in text
        ) + spacing * (len(text) - 1)
        if total <= max_w:
            break

    draw_tight(draw, text, font, size // 2, size // 2, spacing=spacing)
    img.save(path)
    print(f'✓  {path}  ({size}×{size})')

os.makedirs('assets', exist_ok=True)
make_icon('assets/icon.png',          1024)
make_icon('assets/adaptive-icon.png', 1024)
print('\nDone! Open assets/icon.png to preview.')
