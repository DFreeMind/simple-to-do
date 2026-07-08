import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
PKG_VERSION = json.loads((ROOT.parent / "package.json").read_text(encoding="utf-8"))["version"]
NSIS_DIR = ROOT / "nsis"
ICON_PATH = ROOT / "icons" / "icon.png"

HEADER_SIZE = (150, 57)
SIDEBAR_SIZE = (164, 314)


def font(name, size):
    for path in [
        Path("C:/Windows/Fonts") / name,
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/NotoSansSC-VF.ttf"),
        Path("C:/Windows/Fonts/simhei.ttf"),
    ]:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


FONT_TITLE = font("msyhbd.ttc", 17)
FONT_BODY = font("msyh.ttc", 10)
FONT_SMALL = font("msyh.ttc", 9)
FONT_SIDEBAR_TITLE = font("msyhbd.ttc", 20)
FONT_SIDEBAR_BODY = font("msyh.ttc", 11)


def rounded_rectangle(draw, box, radius, fill, outline=None, width=1):
    x0, y0, x1, y1 = box
    draw.rectangle((x0 + radius, y0, x1 - radius, y1), fill=fill)
    draw.rectangle((x0, y0 + radius, x1, y1 - radius), fill=fill)
    draw.pieslice((x0, y0, x0 + radius * 2, y0 + radius * 2), 180, 270, fill=fill)
    draw.pieslice((x1 - radius * 2, y0, x1, y0 + radius * 2), 270, 360, fill=fill)
    draw.pieslice((x1 - radius * 2, y1 - radius * 2, x1, y1), 0, 90, fill=fill)
    draw.pieslice((x0, y1 - radius * 2, x0 + radius * 2, y1), 90, 180, fill=fill)
    if outline:
        for i in range(width):
            draw.arc((x0 + i, y0 + i, x0 + radius * 2 - i, y0 + radius * 2 - i), 180, 270, fill=outline)
            draw.arc((x1 - radius * 2 + i, y0 + i, x1 - i, y0 + radius * 2 - i), 270, 360, fill=outline)
            draw.arc((x1 - radius * 2 + i, y1 - radius * 2 + i, x1 - i, y1 - i), 0, 90, fill=outline)
            draw.arc((x0 + i, y1 - radius * 2 + i, x0 + radius * 2 - i, y1 - i), 90, 180, fill=outline)
            draw.line((x0 + radius, y0 + i, x1 - radius, y0 + i), fill=outline)
            draw.line((x0 + radius, y1 - i, x1 - radius, y1 - i), fill=outline)
            draw.line((x0 + i, y0 + radius, x0 + i, y1 - radius), fill=outline)
            draw.line((x1 - i, y0 + radius, x1 - i, y1 - radius), fill=outline)


def paste_icon(canvas, box):
    icon = Image.open(ICON_PATH).convert("RGBA")
    icon.thumbnail((box[2] - box[0], box[3] - box[1]), Image.Resampling.LANCZOS)
    x = box[0] + ((box[2] - box[0]) - icon.width) // 2
    y = box[1] + ((box[3] - box[1]) - icon.height) // 2
    canvas.alpha_composite(icon, (x, y))


def vertical_gradient(size, top, bottom):
    image = Image.new("RGBA", size, top)
    pixels = image.load()
    for y in range(size[1]):
        t = y / max(1, size[1] - 1)
        color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(4))
        for x in range(size[0]):
            pixels[x, y] = color
    return image


def draw_header():
    image = Image.new("RGBA", HEADER_SIZE, (248, 252, 251, 255))
    draw = ImageDraw.Draw(image)

    draw.rectangle((0, 0, HEADER_SIZE[0], 2), fill=(95, 185, 174, 255))
    rounded_rectangle(draw, (7, 8, 42, 43), 11, (230, 246, 244, 255), (151, 211, 204, 255))
    paste_icon(image, (12, 13, 37, 38))

    draw.text((49, 9), "易简清单", fill=(28, 52, 50, 255), font=FONT_TITLE)
    draw.text((50, 31), "本地优先 · 轻量待办", fill=(98, 122, 119, 255), font=FONT_SMALL)
    draw.line((0, 56, 150, 56), fill=(220, 234, 232, 255))

    image.convert("RGB").save(NSIS_DIR / "header.bmp")


def draw_sidebar():
    image = vertical_gradient(SIDEBAR_SIZE, (105, 194, 183, 255), (33, 118, 111, 255))
    draw = ImageDraw.Draw(image)

    # Subtle product-card motif.
    rounded_rectangle(draw, (24, 42, 140, 158), 22, (246, 253, 252, 255))
    rounded_rectangle(draw, (36, 54, 128, 146), 18, (226, 246, 243, 255))
    paste_icon(image, (49, 66, 115, 132))

    for y, opacity in [(184, 62), (206, 48), (228, 38)]:
        draw.rounded_rectangle((30, y, 134, y + 8), radius=4, fill=(255, 255, 255, opacity))
        draw.ellipse((34, y + 18, 42, y + 26), fill=(255, 255, 255, opacity + 35))
        draw.rounded_rectangle((50, y + 19, 124, y + 24), radius=3, fill=(255, 255, 255, opacity))

    title = "易简清单"
    subtitle = "本地优先"
    version = PKG_VERSION
    title_box = draw.textbbox((0, 0), title, font=FONT_SIDEBAR_TITLE)
    subtitle_box = draw.textbbox((0, 0), subtitle, font=FONT_SIDEBAR_BODY)
    version_box = draw.textbbox((0, 0), version, font=FONT_SMALL)
    draw.text(((164 - (title_box[2] - title_box[0])) / 2, 172), title, fill=(255, 255, 255, 255), font=FONT_SIDEBAR_TITLE)
    draw.text(((164 - (subtitle_box[2] - subtitle_box[0])) / 2, 198), subtitle, fill=(215, 244, 240, 255), font=FONT_SIDEBAR_BODY)
    draw.text(((164 - (version_box[2] - version_box[0])) / 2, 281), version, fill=(190, 229, 224, 255), font=FONT_SMALL)
    draw.line((32, 266, 132, 266), fill=(178, 225, 220, 170))

    image.convert("RGB").save(NSIS_DIR / "sidebar.bmp")


if __name__ == "__main__":
    draw_header()
    draw_sidebar()
