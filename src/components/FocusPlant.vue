<template>
  <Motion.svg
    class="focus-plant"
    :class="[`focus-plant--${speciesId}`, `focus-plant--${stage}`, `focus-plant--${variant}`, `focus-plant--motion-${motion}`]"
    viewBox="0 44 160 136"
    role="img"
    :aria-label="ariaLabel"
    :initial="false"
    :animate="animationTarget"
    :transition="animationTransition"
    :while-hover="hoverTarget"
    :while-press="pressTarget"
  >
    <defs>
      <linearGradient :id="`${uid}-stem`" x1="0" x2="1">
        <stop offset="0" :stop-color="palette.stemDark" />
        <stop offset="1" :stop-color="palette.stem" />
      </linearGradient>
      <linearGradient :id="`${uid}-petal`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="palette.petalLight" />
        <stop offset="1" :stop-color="palette.petal" />
      </linearGradient>
      <linearGradient :id="`${uid}-leaf`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" :stop-color="palette.leafLight" />
        <stop offset=".58" :stop-color="palette.leaf" />
        <stop offset="1" :stop-color="palette.leafDark" />
      </linearGradient>
      <filter :id="`${uid}-shadow`" x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#315f4f" flood-opacity=".16" />
      </filter>
    </defs>

    <g class="focus-plant__ground">
      <ellipse cx="80" cy="166" :rx="groundWidth + 8" ry="12" :fill="groundPalette.glow" opacity=".3" />
      <path :d="groundPath" :fill="groundPalette.dark" />
      <path :d="groundTopPath" :fill="groundPalette.soil" />
      <path d="M53 157c8-4 17-6 27-6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".16" />
      <g v-if="collectionId === 'morning'" opacity=".72">
        <circle cx="30" cy="151" r="2.2" :fill="palette.center" />
        <path d="M30 151v9m-5-6c3 0 5 2 5 5m5-8c-3 1-5 3-5 6" fill="none" :stroke="palette.leaf" stroke-width="1.8" stroke-linecap="round" />
      </g>
      <g v-else-if="collectionId === 'breeze'" fill="none" :stroke="palette.leafLight" stroke-width="2" stroke-linecap="round" opacity=".72">
        <path d="M28 161c0-9 3-14 7-18m-7 18c-3-7-7-10-11-12m113 12c0-8-3-13-7-17m7 17c3-6 6-9 10-11" />
      </g>
      <g v-else opacity=".58">
        <ellipse cx="28" cy="162" rx="6" ry="3" :fill="palette.petalLight" />
        <ellipse cx="133" cy="160" rx="4.5" ry="2.5" :fill="palette.petal" />
        <circle cx="141" cy="151" r="1.8" :fill="palette.center" />
      </g>
    </g>

    <g v-if="stageIndex === 0" class="focus-plant__seed">
      <ellipse cx="80" cy="150" rx="6" ry="10" fill="#92704c" transform="rotate(22 80 150)" />
      <path d="M80 143c-2 5-2 10 0 15" fill="none" stroke="#d5bd91" stroke-width="1.5" stroke-linecap="round" />
    </g>

    <g v-else :filter="`url(#${uid}-shadow)`">
      <path
        :d="`M80 150 C${stageIndex >= 3 ? 77 : 80} 124, ${stageIndex >= 3 ? 84 : 80} ${stemTop + 20}, 80 ${stemTop}`"
        fill="none"
        :stroke="`url(#${uid}-stem)`"
        :stroke-width="speciesId === 'sunflower' ? 6 : speciesId === 'tulip' ? 5 : 4"
        stroke-linecap="round"
      />

      <g v-if="stageIndex >= 2" class="focus-plant__architecture" fill="none" :stroke="`url(#${uid}-stem)`" stroke-linecap="round">
        <template v-if="speciesId === 'daisy'">
          <path v-if="stageIndex >= 4" d="M78 144C68 117 61 94 55 76" stroke-width="3.2" />
          <path v-if="stageIndex === 5" d="M82 145c12-27 21-43 31-58" stroke-width="3" />
        </template>
        <template v-else-if="speciesId === 'cosmos'">
          <path d="M79 145C70 119 60 91 58 67" stroke-width="2.5" />
          <path v-if="stageIndex >= 3" d="M82 142c9-28 22-50 20-68" stroke-width="2.4" />
          <path v-if="stageIndex === 5" d="M78 122C70 112 64 104 80 96" stroke-width="2" />
        </template>
        <template v-else-if="speciesId === 'poppy'">
          <path v-if="stageIndex >= 3" d="M77 146C62 120 58 91 65 67" stroke-width="2.8" />
          <path v-if="stageIndex === 5" d="M84 142c17-25 24-46 19-67" stroke-width="2.5" />
        </template>
        <template v-else-if="speciesId === 'lavender'">
          <path v-for="(path, index) in lavenderStems" :key="path" :d="path" :stroke-width="index === 2 ? 3 : 2.4" />
        </template>
        <template v-else-if="speciesId === 'hydrangea'">
          <path d="M78 147C66 125 61 99 61 77M82 147c10-23 18-45 21-68M79 126c-15-7-26-11-38-10M83 120c14-8 25-10 37-7" stroke-width="4" />
        </template>
        <template v-else-if="speciesId === 'lily'">
          <path v-if="stageIndex >= 3" d="M80 120c-13-16-22-30-31-42" stroke-width="2.6" />
          <path v-if="stageIndex === 5" d="M81 107c13-12 22-23 29-35" stroke-width="2.5" />
        </template>
        <template v-else-if="['camellia', 'peony'].includes(speciesId)">
          <path d="M79 148C65 127 58 106 56 83M81 143c13-20 22-39 24-59M70 126 43 106M91 121l28-18" :stroke-width="speciesId === 'peony' ? 4.5 : 4" />
        </template>
        <template v-else-if="speciesId === 'moonflower'">
          <path d="M80 148C54 122 48 88 66 62c12-18 37-20 47-4 8 13 1 30-13 37" stroke-width="3" />
          <path d="M63 67c-11 7-17 15-20 25m65-31c11 3 19 9 24 17" stroke-width="2" opacity=".8" />
        </template>
      </g>

      <g v-if="stageIndex === 1" class="focus-plant__cotyledons">
        <ellipse cx="68" cy="138" rx="13" ry="6" :fill="palette.leaf" transform="rotate(18 68 138)" />
        <ellipse cx="92" cy="137" rx="13" ry="6" :fill="palette.leafLight" transform="rotate(-18 92 137)" />
      </g>

      <g v-if="stageIndex >= 2 && speciesId === 'daisy'" class="focus-plant__leaves">
        <path d="M79 149C60 147 48 137 44 124c17-2 29 5 36 19Z" :fill="`url(#${uid}-leaf)`" />
        <path d="M82 148c18-4 30-14 33-27-18-1-29 8-34 22Z" :fill="palette.leafLight" />
        <path v-if="stageIndex >= 3" d="M70 139c-13-8-19-18-17-27 13 3 21 11 23 23Zm20-3c10-10 15-20 11-29-12 5-18 14-18 26Z" :fill="palette.leaf" />
      </g>

      <g v-else-if="stageIndex >= 2 && speciesId === 'tulip'" class="focus-plant__leaves">
        <path d="M77 151C56 132 54 100 67 77c8 25 10 50 10 74Z" :fill="palette.leaf" />
        <path d="M84 151c20-23 25-51 14-75-11 22-16 48-14 75Z" :fill="palette.leafLight" />
        <path v-if="stageIndex >= 3" d="M79 137c-13-20-14-39-7-55 7 18 9 35 7 55Z" :fill="palette.leafDark" opacity=".82" />
      </g>

      <g v-else-if="stageIndex >= 2 && speciesId === 'sunflower'" class="focus-plant__leaves">
        <path d="M78 128c-21-3-32-17-33-31 20 0 34 10 35 27Z" :fill="palette.leafDark" />
        <path d="M82 111c19-7 34-2 42 10-15 12-31 12-43-4Z" :fill="palette.leafLight" />
        <path v-if="stageIndex >= 3" d="M79 90c-17-4-27-14-27-25 17-1 28 8 29 21Z" :fill="palette.leaf" />
      </g>

      <g v-else-if="stageIndex >= 2 && speciesId === 'lavender'" class="focus-plant__leaves">
        <path v-for="offset in [0, 13, 26, 39]" :key="offset" :d="`M79 ${143 - offset}c-14-2-20-9-21-16 13 0 21 5 22 13Z`" :fill="palette.leafDark" />
        <path v-for="offset in [7, 20, 33]" :key="`r-${offset}`" :d="`M82 ${143 - offset}c13-4 21 0 25 7-10 7-19 6-25-2Z`" :fill="palette.leafLight" />
      </g>

      <g v-else-if="stageIndex >= 2 && speciesId === 'cosmos'" class="focus-plant__leaves" fill="none" :stroke="palette.leaf" stroke-width="2.2" stroke-linecap="round">
        <path d="M78 138 59 115m19 23-25-6m30-13 23-20m-23 20 26-4M65 122l-9-18m9 18-18-2m47-12 3-19m-3 19 17-10" />
        <path d="m56 104-8-8m8 8 2-12m39-3-7-10m7 10 9-8m-59 39-8-7m8 7 1-11m61 6 8-9m-8 9 11 1" opacity=".82" />
      </g>

      <g v-else-if="stageIndex >= 2 && speciesId === 'poppy'" class="focus-plant__leaves">
        <path d="M78 142c-19 0-31-7-36-19 9-1 13-6 20-9 7 6 14 13 18 23Z" :fill="palette.leafDark" />
        <path d="M82 123c17-9 31-8 40 2-7 4-10 10-18 13-9-1-17-5-23-10Z" :fill="palette.leafLight" />
        <path v-if="stageIndex >= 3" d="M75 105c-12-5-19-14-18-24 7 2 11-1 16-3 6 8 8 16 7 24Z" :fill="palette.leaf" />
      </g>

      <g v-else-if="stageIndex >= 2 && ['iris', 'lily'].includes(speciesId)" class="focus-plant__leaves">
        <path d="M77 151C58 128 59 96 70 70c7 30 9 55 7 81Z" :fill="palette.leafDark" />
        <path d="M84 151c20-28 24-55 15-80-12 24-17 51-15 80Z" :fill="palette.leafLight" />
        <path d="M80 142c-9-26-8-48-1-67 7 23 7 45 1 67Z" :fill="palette.leaf" />
      </g>

      <g v-else-if="stageIndex >= 2 && speciesId === 'hydrangea'" class="focus-plant__leaves">
        <path d="M76 145c-26 3-42-7-46-24 23-7 40 0 49 18Z" :fill="palette.leafDark" />
        <path d="M84 143c25 2 41-9 44-27-23-5-39 3-47 21Z" :fill="palette.leafLight" />
        <path d="M64 121c-19-3-29-13-29-26 18-3 31 5 35 20Zm33-3c18-6 31-1 38 11-14 11-29 10-39-4Z" :fill="palette.leaf" />
        <path d="M47 124 68 139m48-18-27 18" fill="none" stroke="#fff" stroke-width="1.3" opacity=".28" />
      </g>

      <g v-else-if="stageIndex >= 2 && speciesId === 'camellia'" class="focus-plant__leaves">
        <path d="M78 136c-22 1-34-8-38-20 19-7 34-1 40 14Z" :fill="palette.leafDark" />
        <path d="M82 120c19-9 35-5 43 7-15 13-32 13-44-1Z" :fill="palette.leafLight" />
        <path v-if="stageIndex >= 3" d="M66 106c-17-2-27-11-28-22 16-3 28 5 30 18Zm29 0c16-6 29-2 36 8-12 11-26 11-37-2Z" :fill="`url(#${uid}-leaf)`" />
        <path d="M49 118c8 1 17 6 26 13m39-7c-9-1-18 1-29 5" fill="none" stroke="#fff" stroke-width="1.4" opacity=".26" />
      </g>

      <g v-else-if="stageIndex >= 2 && speciesId === 'peony'" class="focus-plant__leaves">
        <path d="M78 143c-26 2-42-7-48-23 10 0 14-7 21-11 6 4 12 3 18 1 6 8 9 17 10 28Z" :fill="palette.leafDark" />
        <path d="M83 141c24 0 40-11 43-28-9 2-15-4-23-6-5 6-11 7-18 6-4 9-5 17-4 24Z" :fill="palette.leafLight" />
        <path v-if="stageIndex >= 3" d="M67 113c-17-5-27-16-27-29 8 3 14-1 20-4 3 7 9 10 15 12-1 8-3 14-8 21Zm29-4c15-8 27-7 36 2-6 3-8 9-13 13-7-1-14-4-20-9Z" :fill="palette.leaf" />
      </g>

      <g v-else-if="stageIndex >= 2 && speciesId === 'moonflower'" class="focus-plant__leaves">
        <path d="M77 137c-23 1-38-13-35-30 15-8 31-1 38 16 6-18 22-27 38-22 7 15-5 31-35 35Z" :fill="`url(#${uid}-leaf)`" />
        <path d="M65 92c-15-4-23-14-20-25 11-5 23 0 28 12 6-12 17-17 28-13 3 12-5 22-25 27Z" :fill="palette.leafLight" />
        <path d="M43 108c14 5 25 13 34 24m-31-65c11 4 20 10 27 18" fill="none" stroke="#fff" stroke-width="1.4" opacity=".28" />
      </g>

      <g v-else-if="stageIndex >= 2" class="focus-plant__leaves">
        <path d="M78 132c-18 0-29-9-32-20 17-4 30 2 34 16Z" :fill="palette.leafDark" />
        <path d="M82 113c17-6 30-1 36 9-14 9-28 8-37-3Z" :fill="palette.leafLight" />
        <path v-if="stageIndex >= 3" d="M79 94c-14-2-22-9-24-18 14-2 24 4 26 14Z" :fill="palette.leaf" />
      </g>

      <g v-if="stageIndex === 3" class="focus-plant__bud">
        <ellipse cx="80" :cy="stemTop - 4" :rx="speciesId === 'sunflower' ? 15 : 10" :ry="speciesId === 'sunflower' ? 13 : 16" :fill="palette.bud" />
        <path :d="`M68 ${stemTop + 2}Q80 ${stemTop + 13} 92 ${stemTop + 2}`" fill="none" :stroke="palette.leafDark" stroke-width="5" stroke-linecap="round" />
      </g>

      <g v-else-if="stageIndex >= 4 && speciesId === 'daisy'" class="focus-plant__flower">
        <g v-for="(bloom, bloomIndex) in daisyBlooms" :key="bloomIndex" :transform="`translate(${bloom.x} ${bloom.y}) scale(${bloom.scale}) rotate(${bloom.rotate})`">
          <ellipse v-for="angle in [0, 45, 90, 135, 180, 225, 270, 315]" :key="angle" cy="-10" rx="5.2" :ry="stageIndex === 5 ? 13 : 9" :fill="`url(#${uid}-petal)`" :transform="`rotate(${angle})`" />
          <circle r="8.5" :fill="palette.center" />
          <circle r="4" fill="#f4cc63" opacity=".7" />
        </g>
      </g>

      <g v-else-if="stageIndex >= 4 && speciesId === 'tulip'" class="focus-plant__flower" transform="translate(80 45)">
        <path d="M0 23C-15 18-21 0-15-20-5-14-1-7 0 2 3-10 9-17 16-21 22-1 15 17 0 23Z" :fill="`url(#${uid}-petal)`" />
        <path v-if="stageIndex === 5" d="M0 21C-7 10-8-5 0-21 9-7 8 9 0 21Z" :fill="palette.petalLight" opacity=".76" />
        <path d="M-14-17C-8-7-5 7 0 20M15-18C8-7 5 8 0 20" fill="none" stroke="#fff" stroke-width="1.3" opacity=".24" />
      </g>

      <g v-else-if="stageIndex === 3 && speciesId === 'cosmos'" class="focus-plant__bud" transform="translate(80 67)">
        <!-- 花苞：绿色花托 + 粉色尖端 -->
        <ellipse cx="0" cy="0" rx="9" ry="11" :fill="palette.leaf" />
        <ellipse cx="0" cy="-4" rx="5" ry="7" :fill="palette.petal" />
        <ellipse cx="0" cy="-7" rx="3" ry="4" :fill="palette.petalLight" />
      </g>

      <g v-else-if="stageIndex >= 4 && speciesId === 'cosmos'" class="focus-plant__flower">
        <g v-for="(bloom, bloomIndex) in cosmosBlooms" :key="bloomIndex" :transform="`translate(${bloom.x} ${bloom.y}) scale(${bloom.scale}) rotate(${bloom.rotate})`">
          <path v-for="angle in [0, 45, 90, 135, 180, 225, 270, 315]" :key="angle" d="M0 0C-7-7-8-20-3-27L0-23l3-4c5 7 4 20-3 27Z" :fill="bloomIndex % 2 ? palette.petalLight : `url(#${uid}-petal)`" :transform="`rotate(${angle}) scale(${stageIndex === 5 ? 1 : .76})`" />
          <circle r="6.5" :fill="palette.center" />
        </g>
      </g>

      <g v-else-if="stageIndex >= 4 && speciesId === 'sunflower'" class="focus-plant__flower" :transform="`translate(80 ${stemTop - 2}) rotate(-4)`">
        <g v-for="angle in petalAngles" :key="angle" :transform="`rotate(${angle})`">
          <path d="M0-9C-7-19-6-33 0-39c7 7 7 21 0 30Z" :fill="`url(#${uid}-petal)`" />
        </g>
        <g v-if="stageIndex === 5" opacity=".9">
          <ellipse v-for="angle in [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345]" :key="angle" cy="-21" rx="4" ry="11" :fill="palette.petalLight" :transform="`rotate(${angle})`" />
        </g>
        <circle r="17" :fill="palette.center" />
        <circle r="12" fill="#765328" />
        <circle v-for="angle in [0, 60, 120, 180, 240, 300]" :key="`seed-${angle}`" cy="-6" r="1.7" fill="#c69c53" :transform="`rotate(${angle})`" />
      </g>

      <g v-else-if="stageIndex >= 4 && speciesId === 'lavender'" class="focus-plant__flower">
        <g v-for="(point, index) in lavenderPoints" :key="index" :transform="`translate(${point[0]} ${point[1]})`">
          <path d="M0 4c-8-2-9-9-3-12 1-7 9-7 11-1 7 1 7 9 1 11-2 7-9 7-11 2Z" :fill="index % 2 ? palette.petalLight : palette.petal" />
        </g>
      </g>

      <g v-else-if="stageIndex >= 4 && speciesId === 'poppy'" class="focus-plant__flower">
        <g v-for="(bloom, bloomIndex) in poppyBlooms" :key="bloomIndex" :transform="`translate(${bloom.x} ${bloom.y}) scale(${bloom.scale}) rotate(${bloom.rotate})`">
          <path d="M0 0C-24-2-30-21-13-29 1-27 5-16 0 0Z" :fill="`url(#${uid}-petal)`" />
          <path d="M0 0C24-2 30-21 13-29-1-27-5-16 0 0Z" :fill="palette.petalLight" />
          <path d="M0 0C-16 14-27 3-21-11-12-18-4-10 0 0Zm0 0c16 14 27 3 21-11C12-18 4-10 0 0Z" :fill="palette.petal" opacity=".92" />
          <circle r="7" :fill="palette.center" />
          <circle r="3.5" fill="#3d3935" />
        </g>
      </g>

      <g v-else-if="stageIndex >= 4 && speciesId === 'iris'" class="focus-plant__flower" transform="translate(80 49)">
        <path d="M0 5C-12-7-11-24-2-32 3-20 5-9 0 5Zm0 0C12-7 12-23 3-32-3-18-4-7 0 5Z" :fill="palette.petalLight" />
        <path d="M0 2C-20-1-27 10-28 24-13 21-3 15 0 2Zm0 0C20-1 27 10 28 24 13 21 3 15 0 2Z" :fill="palette.petal" />
        <path v-if="stageIndex === 5" d="M0 0c-9 3-13 12-12 22 8-3 12-10 12-22Zm0 0c9 3 13 12 12 22-8-3-12-10-12-22Z" :fill="palette.petalLight" opacity=".8" />
        <circle r="4.5" :fill="palette.center" />
      </g>

      <g v-else-if="stageIndex >= 4 && speciesId === 'lily'" class="focus-plant__flower">
        <g v-for="(bloom, bloomIndex) in lilyBlooms" :key="bloomIndex" :transform="`translate(${bloom.x} ${bloom.y}) scale(${bloom.scale}) rotate(${bloom.rotate})`">
          <path v-for="angle in [0, 60, 120, 180, 240, 300]" :key="angle" d="M0 1C-8-11-7-30 0-39 8-29 8-11 0 1Z" :fill="`url(#${uid}-petal)`" :transform="`rotate(${angle}) scale(${stageIndex === 5 ? 1 : .76})`" />
          <g v-if="stageIndex === 5" stroke="#d9a05f" stroke-width="1.5" stroke-linecap="round">
            <path v-for="angle in [0, 72, 144, 216, 288]" :key="`s-${angle}`" d="M0 0v-18" :transform="`rotate(${angle})`" />
          </g>
          <circle r="5" :fill="palette.center" />
        </g>
      </g>

      <g v-else-if="stageIndex >= 4 && speciesId === 'hydrangea'" class="focus-plant__flower" :transform="`translate(80 ${stemTop + 4})`">
        <g v-for="(point, index) in hydrangeaPoints" :key="index" :transform="`translate(${point[0]} ${point[1]})`">
          <circle cx="-4.5" cy="0" r="5" :fill="index % 3 ? palette.petal : palette.petalLight" />
          <circle cx="4.5" cy="0" r="5" :fill="index % 3 ? palette.petalLight : palette.petal" />
          <circle cx="0" cy="-4.5" r="5" :fill="index % 2 ? palette.petal : palette.petalLight" />
          <circle cx="0" cy="4.5" r="5" :fill="index % 2 ? palette.petalLight : palette.petal" />
          <circle r="2.2" :fill="palette.center" opacity=".9" />
        </g>
        <g v-if="stageIndex === 5" transform="translate(-25 24) scale(.58)">
          <g v-for="(point, index) in hydrangeaPoints.slice(0, 7)" :key="`side-${index}`" :transform="`translate(${point[0]} ${point[1]})`">
            <circle cx="-4.5" r="5" :fill="index % 2 ? palette.petalLight : palette.petal" />
            <circle cx="4.5" r="5" :fill="index % 2 ? palette.petal : palette.petalLight" />
            <circle cy="-4.5" r="5" :fill="palette.petalLight" />
            <circle cy="4.5" r="5" :fill="palette.petal" />
            <circle r="2.2" :fill="palette.center" />
          </g>
        </g>
      </g>

      <g v-else-if="stageIndex >= 4 && ['camellia', 'peony'].includes(speciesId)" class="focus-plant__flower">
        <g v-for="(bloom, bloomIndex) in shrubBlooms" :key="bloomIndex" :transform="`translate(${bloom.x} ${bloom.y}) scale(${bloom.scale}) rotate(${bloom.rotate})`">
          <g v-for="(ring, ringIndex) in flowerRings" :key="ringIndex">
            <ellipse
              v-for="angle in ring.angles"
              :key="angle"
              :cy="-ring.offset"
              :rx="ring.rx"
              :ry="ring.ry"
              :fill="ringIndex % 2 ? palette.petalLight : `url(#${uid}-petal)`"
              :opacity="ring.opacity"
              :transform="`rotate(${angle})`"
            />
          </g>
          <circle r="6" :fill="palette.center" />
        </g>
      </g>

      <g v-else-if="stageIndex >= 4 && speciesId === 'moonflower'" class="focus-plant__flower">
        <g v-for="(bloom, bloomIndex) in moonflowerBlooms" :key="bloomIndex" :transform="`translate(${bloom.x} ${bloom.y}) scale(${bloom.scale}) rotate(${bloom.rotate})`">
          <circle r="31" fill="#aeb3ff" opacity=".14" class="focus-plant__moon-glow" />
          <path v-for="angle in [0, 72, 144, 216, 288]" :key="angle" d="M0 0C-11-9-13-25 0-34 13-25 11-9 0 0Z" :fill="`url(#${uid}-petal)`" :transform="`rotate(${angle}) scale(${stageIndex === 5 ? 1 : .78})`" />
          <circle r="7" :fill="palette.center" />
        </g>
      </g>

      <g v-else-if="stageIndex >= 4" class="focus-plant__flower" :transform="`translate(80 ${stemTop - 2})`">
        <g v-for="angle in petalAngles" :key="angle" :transform="`rotate(${angle})`">
          <ellipse
            cy="-13"
            :rx="speciesId === 'sunflower' ? 6 : speciesId === 'hydrangea' ? 7 : 5"
            :ry="speciesId === 'sunflower' ? 14 : speciesId === 'hydrangea' ? 9 : 15"
            :fill="`url(#${uid}-petal)`"
          />
        </g>
        <circle :r="speciesId === 'sunflower' ? 14 : 8" :fill="palette.center" />
        <circle v-if="speciesId === 'sunflower'" r="8" fill="#765328" opacity=".9" />
      </g>
    </g>
  </Motion.svg>
</template>

<script setup>
import { computed, useId } from 'vue'
import { motion as Motion, useReducedMotion } from 'motion-v'
import { FOCUS_GARDEN_SPECIES, FOCUS_GARDEN_STAGES } from '@/utils/focusGarden.mjs'

const props = defineProps({
  speciesId: { type: String, default: 'daisy' },
  stage: { type: String, default: 'seed' },
  label: { type: String, default: '' },
  variant: {
    type: String,
    default: 'thumbnail',
    validator: value => ['thumbnail', 'diorama', 'hero'].includes(value)
  },
  motion: {
    type: String,
    default: 'static',
    validator: value => ['static', 'idle', 'interactive'].includes(value)
  }
})

const uid = `plant-${useId().replace(/:/g, '')}`
const reducedMotion = useReducedMotion()
const stageIndex = computed(() => Math.max(0, FOCUS_GARDEN_STAGES.findIndex(item => item.id === props.stage)))
const stemTop = computed(() => [150, 132, 105, 60, 48, 44][stageIndex.value] || 150)
const species = computed(() => FOCUS_GARDEN_SPECIES.find(item => item.id === props.speciesId) || FOCUS_GARDEN_SPECIES[0])
const collectionId = computed(() => species.value.collectionId)
const ariaLabel = computed(() => props.label || `${species.value.name}，${FOCUS_GARDEN_STAGES[stageIndex.value]?.name || '种子'}阶段`)
const groundWidth = computed(() => (
  ['hydrangea', 'camellia', 'peony'].includes(props.speciesId) ? 58
    : ['cosmos', 'lavender', 'moonflower'].includes(props.speciesId) ? 52
      : 46
))
const groundPath = computed(() => {
  const left = 80 - groundWidth.value
  return `M${left} 164c10-17 27-22 ${groundWidth.value} -22s${groundWidth.value - 7} 7 ${groundWidth.value} 22c-15 9-${groundWidth.value * 2 - 15} 9-${groundWidth.value * 2} 0Z`
})
const groundTopPath = computed(() => {
  const left = 86 - groundWidth.value
  const right = 75 + groundWidth.value
  return `M${left} 159c13-10 27-14 43-14 19 0 34 5 ${right - 80} 14-22 6-${groundWidth.value * 2 - 17} 6-${groundWidth.value * 2 - 23} 0Z`
})
const groundPalette = computed(() => ({
  morning: { soil: '#a17a55', dark: '#765a43', glow: '#ead9a8' },
  breeze: { soil: '#8f765a', dark: '#675543', glow: '#b9d9c7' },
  twilight: { soil: '#817064', dark: '#5e504a', glow: '#c9c0dd' }
}[collectionId.value] || { soil: '#9a7959', dark: '#7d6248', glow: '#d7c4a7' }))
const lavenderStems = computed(() => (
  stageIndex.value === 5
    ? ['M80 148V48', 'M78 148 61 61', 'M80 148 72 42', 'M82 148 91 52', 'M83 148 106 66']
    : ['M80 148V61', 'M79 148 68 72', 'M82 148 94 74']
))
const daisyBlooms = computed(() => (
  stageIndex.value === 5
    ? [{ x: 80, y: 44, scale: 1, rotate: 0 }, { x: 55, y: 76, scale: .72, rotate: -9 }, { x: 113, y: 87, scale: .62, rotate: 10 }]
    : [{ x: 80, y: 48, scale: .82, rotate: 0 }]
))
// 初绽阶段 (stage 4) 与盛放 (stage 5) 都需要让花朵簇的视觉重心贴近 viewBox 中线。
// 之前第二朵花固定在 (49, 65) 偏左 31 单位，导致年格 / 月格里 8 月类花视觉上整体偏左。
// 调整：初绽改为主 + 左右对称的小三角；盛放把"飘到左下"的小花改回中线下方，让整簇更对称。
const cosmosBlooms = computed(() => (
  stageIndex.value === 5
    ? [{ x: 80, y: 44, scale: .74, rotate: 2 }, { x: 58, y: 62, scale: .64, rotate: -12 }, { x: 102, y: 70, scale: .6, rotate: 12 }, { x: 80, y: 96, scale: .38, rotate: -4 }]
    : [{ x: 80, y: 48, scale: .7, rotate: 0 }, { x: 60, y: 70, scale: .5, rotate: -10 }, { x: 100, y: 72, scale: .5, rotate: 10 }]
))
const poppyBlooms = computed(() => (
  stageIndex.value === 5
    ? [{ x: 80, y: 44, scale: .86, rotate: 3 }, { x: 65, y: 67, scale: .58, rotate: -12 }, { x: 103, y: 75, scale: .48, rotate: 15 }]
    : [{ x: 80, y: 48, scale: .76, rotate: 0 }]
))
const lilyBlooms = computed(() => (
  stageIndex.value === 5
    ? [{ x: 80, y: 45, scale: .72, rotate: 0 }, { x: 49, y: 78, scale: .52, rotate: -18 }, { x: 110, y: 72, scale: .48, rotate: 18 }]
    : [{ x: 80, y: 48, scale: .62, rotate: 0 }]
))
const shrubBlooms = computed(() => {
  const mainScale = props.speciesId === 'peony' ? .9 : .76
  return stageIndex.value === 5
    ? [{ x: 80, y: 48, scale: mainScale, rotate: 0 }, { x: 55, y: 83, scale: mainScale * .58, rotate: -10 }, { x: 106, y: 84, scale: mainScale * .54, rotate: 11 }]
    : [{ x: 80, y: 52, scale: mainScale * .78, rotate: 0 }]
})
const moonflowerBlooms = computed(() => (
  stageIndex.value === 5
    ? [{ x: 66, y: 62, scale: .68, rotate: -8 }, { x: 100, y: 95, scale: .55, rotate: 12 }, { x: 113, y: 58, scale: .44, rotate: 18 }]
    : [{ x: 66, y: 62, scale: .58, rotate: -8 }]
))
const petalAngles = computed(() => {
  const total = props.speciesId === 'sunflower'
    ? (stageIndex.value === 4 ? 8 : 14)
    : props.speciesId === 'cosmos'
      ? (stageIndex.value === 4 ? 5 : 8)
      : (stageIndex.value === 4 ? 5 : 10)
  return Array.from({ length: total }, (_, index) => Math.round((360 / total) * index))
})
const lavenderPoints = computed(() => {
  const points = stageIndex.value === 4
    ? [[80, 61], [72, 69], [88, 70], [78, 78], [86, 81]]
    : [[72, 42], [65, 50], [78, 51], [60, 60], [73, 61], [91, 52], [85, 61], [99, 63], [92, 70], [61, 62], [106, 72], [80, 48]]
  return points
})
const hydrangeaPoints = computed(() => {
  const full = [[-18, -8], [0, -17], [18, -8], [-25, 9], [-8, 4], [10, 3], [26, 10], [-16, 21], [2, 18], [19, 23]]
  return stageIndex.value === 4 ? full.slice(1, 7) : full
})
const flowerRings = computed(() => {
  const full = props.speciesId === 'peony'
    ? [
        { angles: [0, 45, 90, 135, 180, 225, 270, 315], offset: 16, rx: 9, ry: 18, opacity: 1 },
        { angles: [22, 82, 142, 202, 262, 322], offset: 11, rx: 8, ry: 14, opacity: .96 },
        { angles: [0, 90, 180, 270], offset: 7, rx: 7, ry: 10, opacity: .92 }
      ]
    : [
        { angles: [0, 60, 120, 180, 240, 300], offset: 14, rx: 9, ry: 16, opacity: 1 },
        { angles: [30, 102, 174, 246, 318], offset: 9, rx: 7, ry: 12, opacity: .95 }
      ]
  return stageIndex.value === 4 ? full.slice(0, 1) : full
})
const palettes = {
  daisy: { stem: '#5d9a67', stemDark: '#3f7850', leaf: '#72a76f', leafLight: '#92be82', leafDark: '#4f855c', bud: '#779765', petal: '#f6f2df', petalLight: '#fffdf5', center: '#e6b84f' },
  tulip: { stem: '#50885c', stemDark: '#376d49', leaf: '#5f9560', leafLight: '#82ad70', leafDark: '#42774f', bud: '#da827c', petal: '#df817d', petalLight: '#f3aaa0', center: '#bf675f' },
  cosmos: { stem: '#588d62', stemDark: '#3b7049', leaf: '#6c9f67', leafLight: '#91b57e', leafDark: '#4b8155', bud: '#c97794', petal: '#df87aa', petalLight: '#f4b8cf', center: '#e3b24d' },
  sunflower: { stem: '#568352', stemDark: '#3c683f', leaf: '#6c975b', leafLight: '#87ae69', leafDark: '#4e7d49', bud: '#6c8748', petal: '#e6ad36', petalLight: '#f2c653', center: '#8a6230' },
  poppy: { stem: '#65895e', stemDark: '#466d49', leaf: '#789c70', leafLight: '#9ab68a', leafDark: '#587e55', bud: '#a95f56', petal: '#dc665b', petalLight: '#f29282', center: '#4a4237' },
  lavender: { stem: '#618260', stemDark: '#456947', leaf: '#71936c', leafLight: '#91aa80', leafDark: '#567654', bud: '#796fa4', petal: '#8577b0', petalLight: '#a69bc8', center: '#6d639b' },
  iris: { stem: '#557e58', stemDark: '#3c6543', leaf: '#668f67', leafLight: '#8bab76', leafDark: '#4b7451', bud: '#6e69a5', petal: '#7472b7', petalLight: '#aaa5d8', center: '#efc45d' },
  hydrangea: { stem: '#567e5c', stemDark: '#3c6546', leaf: '#668e65', leafLight: '#8cac7d', leafDark: '#4c7653', bud: '#7595b9', petal: '#779fc5', petalLight: '#a7c3dc', center: '#eef1bd' },
  lily: { stem: '#5b855d', stemDark: '#3e6946', leaf: '#6e966c', leafLight: '#92b17e', leafDark: '#507951', bud: '#d68d78', petal: '#e9a189', petalLight: '#ffd2bd', center: '#d7a155' },
  camellia: { stem: '#547a55', stemDark: '#385f3e', leaf: '#547f58', leafLight: '#7ca06f', leafDark: '#3e6848', bud: '#b85d71', petal: '#c9667b', petalLight: '#ee9bad', center: '#e6bf67' },
  peony: { stem: '#5b8058', stemDark: '#3d6642', leaf: '#658c61', leafLight: '#88a876', leafDark: '#4a704b', bud: '#bf6688', petal: '#cf7598', petalLight: '#f1a9c1', center: '#e7bd6e' },
  moonflower: { stem: '#586f67', stemDark: '#3b5851', leaf: '#67847a', leafLight: '#91a99a', leafDark: '#4a6b61', bud: '#777ab3', petal: '#dfe1ff', petalLight: '#fffefe', center: '#d8cf8e' }
}
const palette = computed(() => palettes[props.speciesId] || palettes.daisy)
const motionDuration = computed(() => species.value.motionDuration || 4.2)
const animationTarget = computed(() => {
  if (reducedMotion.value || props.motion === 'static') return { rotate: 0, y: 0 }
  if (props.motion === 'idle') return { rotate: [-0.65, 0.65, -0.65], y: [0, -1.5, 0] }
  return { rotate: [-0.35, 0.35, -0.35], y: [0, -1, 0] }
})
const animationTransition = computed(() => (
  reducedMotion.value || props.motion === 'static'
    ? { duration: 0 }
    : { duration: motionDuration.value, repeat: Infinity, ease: 'easeInOut' }
))
const hoverTarget = computed(() => (
  !reducedMotion.value && props.motion === 'interactive'
    ? { y: -5, rotate: 1.2, scale: 1.035 }
    : undefined
))
const pressTarget = computed(() => (
  !reducedMotion.value && props.motion === 'interactive'
    ? { y: 1, rotate: -1, scale: 0.965 }
    : undefined
))
</script>

<style scoped>
.focus-plant {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  transform-box: fill-box;
  transform-origin: 50% 84%;
  will-change: transform;
}
.focus-plant--thumbnail { filter: saturate(.94); }
.focus-plant--diorama { filter: saturate(1.02) drop-shadow(0 10px 10px rgba(49, 95, 75, .10)); }
.focus-plant--hero { filter: saturate(1.06) drop-shadow(0 14px 16px rgba(49, 95, 75, .14)); }
.focus-plant--motion-interactive { cursor: pointer; }
.focus-plant__flower,
.focus-plant__leaves,
.focus-plant__bud,
.focus-plant__cotyledons {
  transform-box: fill-box;
  transform-origin: center bottom;
  animation: focus-plant-arrive 700ms cubic-bezier(.2, .72, .2, 1) both;
}
.focus-plant__flower { animation-name: focus-plant-bloom; animation-duration: 850ms; }
.focus-plant__moon-glow { animation: focus-plant-glow 2.8s ease-in-out infinite; }
@keyframes focus-plant-arrive { from { opacity: 0; transform: scale(.88) translateY(5px); } }
@keyframes focus-plant-bloom { from { opacity: 0; transform: scale(.64) rotate(-3deg); } }
@keyframes focus-plant-glow { 50% { opacity: .28; transform: scale(1.08); } }
@media (prefers-reduced-motion: reduce) {
  .focus-plant__flower,
  .focus-plant__leaves,
  .focus-plant__bud,
  .focus-plant__cotyledons,
  .focus-plant__moon-glow { animation: none; }
}
</style>
