"""Build complete potted-plant stages from generated 3x3 chroma atlases.

Atlas layout:
  empty pot | seed    | sprout
  leaves    | bud     | opening
  bloom     | empty   | empty

Each occupied cell remains a complete illustration: pot, soil and plant are
never separated. The builder only removes the chroma background, then uses the
empty-pot cell as the one canonical pot anchor for every stage of a species.
It refuses an atlas whose stage pots do not line up, rather than independently
rescaling each stage and introducing a visible jump during playback.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


STAGES = ("seed", "sprout", "leaves", "bud", "opening", "bloom")
STAGE_CELLS = (1, 2, 3, 4, 5, 6)
OUTPUT_WIDTH = 512
OUTPUT_HEIGHT = 640
TARGET_POT_WIDTH = 340
TARGET_BOTTOM = 628
CELL_PADDING = 42
POT_CENTER_TOLERANCE = 4
POT_WIDTH_TOLERANCE = 8
POT_BOTTOM_TOLERANCE = 5


def cell_bounds(length: int, index: int) -> tuple[int, int]:
    return round(length * index / 3), round(length * (index + 1) / 3)


def largest_component(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    visited = np.zeros_like(mask)
    best: list[tuple[int, int]] = []
    for start_y, start_x in np.argwhere(mask):
        if visited[start_y, start_x]:
            continue
        queue = deque([(int(start_y), int(start_x))])
        visited[start_y, start_x] = True
        component: list[tuple[int, int]] = []
        while queue:
            y, x = queue.popleft()
            component.append((y, x))
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ny, nx = y + dy, x + dx
                if (
                    0 <= ny < height
                    and 0 <= nx < width
                    and mask[ny, nx]
                    and not visited[ny, nx]
                ):
                    visited[ny, nx] = True
                    queue.append((ny, nx))
        if len(component) > len(best):
            best = component
    result = np.zeros_like(mask)
    if best:
        ys, xs = zip(*best)
        result[np.asarray(ys), np.asarray(xs)] = True
    return result


def extract_subject(atlas: Image.Image, index: int) -> Image.Image:
    column, row = index % 3, index // 3
    left, right = cell_bounds(atlas.width, column)
    top, bottom = cell_bounds(atlas.height, row)
    crop_left = max(0, left - CELL_PADDING)
    crop_top = max(0, top - CELL_PADDING)
    crop_right = min(atlas.width, right + CELL_PADDING)
    crop_bottom = min(atlas.height, bottom + CELL_PADDING)
    crop = atlas.crop((crop_left, crop_top, crop_right, crop_bottom))
    pixels = np.asarray(crop).copy()
    component = largest_component(pixels[:, :, 3] > 18)
    pixels[~component, 3] = 0
    pixels[~component, :3] = 0
    if not np.any(component):
        raise ValueError(f"Sprite cell {index} is empty")
    # Keep every cell in its original padded coordinate system. Cropping each
    # subject to its opaque bounds loses the pot anchor and makes the six
    # resulting transforms differ even when the source atlas was consistent.
    return Image.fromarray(pixels)


def lower_pot_geometry(image: Image.Image) -> tuple[float, int, int]:
    alpha = np.asarray(image.getchannel("A"))
    opaque = alpha > 40
    occupied_rows = np.flatnonzero(np.any(opaque, axis=1))
    if occupied_rows.size == 0:
        raise ValueError("Empty sprite subject")
    bottom = int(occupied_rows[-1])
    band_top = max(0, bottom - max(18, round(image.height * 0.2)))
    best_xs: np.ndarray | None = None
    for y in range(band_top, bottom + 1):
        xs = np.flatnonzero(opaque[y])
        if best_xs is None or xs.size > best_xs.size:
            best_xs = xs
    if best_xs is None or best_xs.size < 8:
        raise ValueError("Unable to locate flowerpot body")
    left, right = int(best_xs[0]), int(best_xs[-1])
    return (left + right) / 2, right - left + 1, bottom


def clean_hidden_rgb(image: Image.Image) -> Image.Image:
    pixels = np.asarray(image).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels)


def normalize_subject(
    image: Image.Image,
    pot_geometry: tuple[float, int, int],
) -> Image.Image:
    source_center, source_width, source_bottom = pot_geometry
    scale = TARGET_POT_WIDTH / source_width
    scale = min(scale, (TARGET_BOTTOM - 8) / max(1, image.height))
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    x = round(OUTPUT_WIDTH / 2 - source_center * scale)
    y = round(TARGET_BOTTOM - source_bottom * scale)
    output = Image.new("RGBA", (OUTPUT_WIDTH, OUTPUT_HEIGHT))
    output.alpha_composite(resized, (x, y))
    return clean_hidden_rgb(output)


def assert_stage_pots_match_reference(
    reference_geometry: tuple[float, int, int],
    stages: list[tuple[str, Image.Image]],
) -> None:
    reference_center, reference_width, reference_bottom = reference_geometry
    for stage_id, image in stages:
        center, width, bottom = lower_pot_geometry(image)
        if (
            abs(center - reference_center) > POT_CENTER_TOLERANCE
            or abs(width - reference_width) > POT_WIDTH_TOLERANCE
            or abs(bottom - reference_bottom) > POT_BOTTOM_TOLERANCE
        ):
            raise ValueError(
                f"{stage_id} 的花盆没有与空花盆对齐 "
                f"(center={center:.1f}/{reference_center:.1f}, "
                f"width={width}/{reference_width}, "
                f"bottom={bottom}/{reference_bottom})"
            )


def save_webp(image: Image.Image, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "WEBP", quality=94, method=6, exact=True)


def build_species(
    atlas_path: Path,
    species_id: str,
    stage_root: Path,
    preview_root: Path,
) -> None:
    atlas = Image.open(atlas_path).convert("RGBA")
    pot_reference = extract_subject(atlas, 0)
    pot_geometry = lower_pot_geometry(pot_reference)
    source_stages = [
        (stage_id, extract_subject(atlas, cell_index))
        for stage_id, cell_index in zip(STAGES, STAGE_CELLS, strict=True)
    ]
    assert_stage_pots_match_reference(pot_geometry, source_stages)
    stages: list[Image.Image] = []
    for stage_id, source_stage in source_stages:
        stage = normalize_subject(source_stage, pot_geometry)
        save_webp(stage, stage_root / species_id / f"{stage_id}.webp")
        stages.append(stage)
    save_webp(stages[-1], preview_root / f"{species_id}.webp")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas-dir", type=Path, required=True)
    parser.add_argument("--stage-root", type=Path, required=True)
    parser.add_argument("--preview-root", type=Path, required=True)
    args = parser.parse_args()

    atlas_paths = sorted(args.atlas_dir.glob("*.png"))
    if not atlas_paths:
        raise SystemExit("No PNG atlases found")
    for atlas_path in atlas_paths:
        build_species(
            atlas_path,
            atlas_path.stem,
            args.stage_root,
            args.preview_root,
        )
        print(f"built {atlas_path.stem}")


if __name__ == "__main__":
    main()
