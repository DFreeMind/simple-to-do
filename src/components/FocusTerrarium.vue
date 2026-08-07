<template>
  <div
    class="terrarium"
    :class="[`terrarium--${size}`, { 'terrarium--has-plant': hasPlant, 'terrarium--highlight': highlight }]"
    :aria-hidden="true"
  >
    <!-- 玻璃罩（拱形） -->
    <span class="terrarium__dome">
      <span class="terrarium__dome-shine" />
      <span class="terrarium__dome-star" />
    </span>
    <!-- 罩内植物 -->
    <span v-if="hasPlant" class="terrarium__plant">
      <FocusPlant :species-id="speciesId" :stage="effectiveStage" />
    </span>
    <!-- 木质底座 + 两侧小叶 -->
    <span class="terrarium__base">
      <span class="terrarium__base-disk" />
      <span class="terrarium__leaf terrarium__leaf--left"><Leaf :size="11" /></span>
      <span class="terrarium__leaf terrarium__leaf--right"><Leaf :size="11" /></span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Leaf } from 'lucide-vue-next'
import FocusPlant from './FocusPlant.vue'

const props = defineProps({
  // 'empty' = 基础花田位（仅底座，无罩）；'small' = 幼苗温室；'medium' = 成长温室；'large' = 盛放温室；'standard' = 年格标准温室
  size: { type: String, default: 'small' },
  speciesId: { type: String, default: 'daisy' },
  stage: { type: String, default: 'seed' },
  highlight: { type: Boolean, default: false }
})

// 年格"standard"罩子统一用 opening 预览，避免 bloom 撑破罩子
const effectiveStage = computed(() => {
  if (props.size === 'standard' && props.stage && props.stage !== 'seed') {
    return 'opening'
  }
  return props.stage
})

const hasPlant = computed(() => Boolean(props.speciesId) && props.stage && props.stage !== 'seed')
</script>

<style scoped>
/* 温室固定尺寸，不随父容器拉伸；父容器用 flex/grid 居中即可 */
.terrarium {
  position: relative;
  display: block;
  width: var(--terrarium-total-width, 60px);
  height: var(--terrarium-total-height, 73px);
  isolation: isolate;
  color: #8a7e5e;
  /* 关键：裁掉超出罩子的植物 SVG 内容 */
  overflow: hidden;
  border-radius: 8px;
  /* 抑制 SVG 自身的焦点黑框 */
  outline: none;
}
.terrarium:focus,
.terrarium:focus-visible,
.terrarium *:focus,
.terrarium *:focus-visible { outline: none; }

/* ========== 玻璃罩 ========== */
.terrarium__dome {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: var(--terrarium-width, 50px);
  height: var(--terrarium-height, 62px);
  border-top-left-radius: 999px;
  border-top-right-radius: 999px;
  border: 1.2px dashed color-mix(in srgb, #b9c89e 75%, transparent);
  border-bottom: 0;
  background:
    linear-gradient(180deg,
      color-mix(in srgb, #f5efde 40%, transparent) 0%,
      color-mix(in srgb, #efe7cf 55%, transparent) 100%);
  box-shadow:
    inset 0 6px 10px -6px rgba(255, 255, 255, .75),
    inset 0 -2px 4px -2px rgba(0, 0, 0, .03);
  z-index: 1;
}
/* 内拱虚线（设计图里玻璃罩内部的虚线"内壁"） */
.terrarium__dome::after {
  content: '';
  position: absolute;
  top: 12%;
  left: 14%;
  right: 14%;
  bottom: 8%;
  border-top-left-radius: 999px;
  border-top-right-radius: 999px;
  border: .8px dashed color-mix(in srgb, #c5d3a8 55%, transparent);
  border-bottom: 0;
  opacity: .45;
  pointer-events: none;
  z-index: 1;
}
.terrarium__dome-shine {
  position: absolute;
  top: 18%;
  left: 22%;
  width: 12%;
  height: 28%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, .85), transparent);
  filter: blur(.5px);
  pointer-events: none;
}
/* 罩顶小十字星 */
.terrarium__dome-star {
  position: absolute;
  top: -4px;
  left: 50%;
  width: 6px;
  height: 6px;
  transform: translateX(-50%);
  pointer-events: none;
}
.terrarium__dome-star::before, .terrarium__dome-star::after {
  content: '';
  position: absolute;
  background: #9bb27b;
}
.terrarium__dome-star::before {
  top: 50%;
  left: 0;
  right: 0;
  height: 1.5px;
  transform: translateY(-50%);
}
.terrarium__dome-star::after {
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1.5px;
  transform: translateX(-50%);
}

/* ========== 罩内植物（绝对定位，flex 容器让 SVG 底对齐到罩底） ========== */
.terrarium__plant {
  position: absolute;
  left: 50%;
  bottom: var(--terrarium-base-height, 12px);
  transform: translateX(-50%);
  width: var(--terrarium-plant-width, 50px);
  height: var(--terrarium-plant-height, 50px);
  z-index: 3;
  display: flex;
  align-items: flex-end;     /* SVG 高度 auto 时底对齐 → 植物"坐"在底座上 */
  justify-content: center;
  overflow: hidden;          /* 截掉可能冒出去的茎叶 */
  pointer-events: none;
}
.terrarium__plant :deep(.focus-plant) {
  width: 100%;
  height: auto;              /* 保持 viewBox 比例，SVG 自动收缩 */
  display: block;
}

/* ========== 底座 ========== */
.terrarium__base {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: var(--terrarium-base-width, 56px);
  height: var(--terrarium-base-height, 11px);
  z-index: 2;
}
.terrarium__base-disk {
  position: absolute;
  inset: 0;
  border-radius: 50% / 60%;
  background:
    linear-gradient(180deg, #d4b885 0%, #c4a674 60%, #ad8c5d 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .35),
    inset 0 -1px 0 rgba(0, 0, 0, .12),
    0 2px 3px -1px rgba(0, 0, 0, .08);
}
/* 底座左右小绿叶 */
.terrarium__leaf {
  position: absolute;
  top: -2px;
  display: grid;
  place-items: center;
  width: 11px;
  height: 11px;
  color: #6f9a5a;
  opacity: .9;
}
.terrarium__leaf--left { left: -7px; transform: rotate(-25deg); }
.terrarium__leaf--right { right: -7px; transform: rotate(25deg) scaleX(-1); }

/* ========== 尺寸变体（固定像素值，不依赖父容器） ========== */
/* 基础花田位（empty）：保留"幽灵罩子"占位，让底座 y 与幼苗温室底座 y 对齐
   设计图里空格子也画了很淡的虚线罩子轮廓（表示"这里未来会长植物"），所以这里把罩子设为
   visibility: hidden → 淡虚线显示，不要直接 display:none，否则罩子几何信息丢失 */
.terrarium--empty {
  --terrarium-total-width: 62px;
  --terrarium-total-height: 88px;
  --terrarium-width: 56px;
  --terrarium-height: 76px;
  --terrarium-base-width: 62px;
  --terrarium-base-height: 12px;
  --terrarium-plant-width: 0px;
  --terrarium-plant-height: 0px;
}
.terrarium--empty .terrarium__dome {
  background:
    linear-gradient(180deg,
      color-mix(in srgb, #f5efde 22%, transparent) 0%,
      color-mix(in srgb, #efe7cf 30%, transparent) 100%);
  border-color: color-mix(in srgb, #b9c89e 35%, transparent);
}
.terrarium--empty .terrarium__dome::after { opacity: .2; }
.terrarium--empty .terrarium__dome-shine { opacity: .35; }
.terrarium--empty .terrarium__dome-star::before,
.terrarium--empty .terrarium__dome-star::after { opacity: .45; }
.terrarium--empty .terrarium__plant { display: none; }

/* 幼苗温室（small）：小罩，适合 sprout/leaves */
.terrarium--small {
  --terrarium-total-width: 62px;
  --terrarium-total-height: 88px;
  --terrarium-width: 56px;
  --terrarium-height: 76px;
  --terrarium-base-width: 62px;
  --terrarium-base-height: 12px;
  --terrarium-plant-width: 52px;
  --terrarium-plant-height: 68px;
}

/* 成长温室（medium）：中罩，适合 bud/opening */
.terrarium--medium {
  --terrarium-total-width: 74px;
  --terrarium-total-height: 108px;
  --terrarium-width: 68px;
  --terrarium-height: 96px;
  --terrarium-base-width: 74px;
  --terrarium-base-height: 12px;
  --terrarium-plant-width: 64px;
  --terrarium-plant-height: 86px;
}

/* 盛放温室（large）：大罩，适合 bloom */
.terrarium--large {
  --terrarium-total-width: 86px;
  --terrarium-total-height: 128px;
  --terrarium-width: 80px;
  --terrarium-height: 116px;
  --terrarium-base-width: 86px;
  --terrarium-base-height: 12px;
  --terrarium-plant-width: 76px;
  --terrarium-plant-height: 104px;
}

/* 年格标准温室（standard）：所有月展示的固定尺寸罩子 */
.terrarium--standard {
  --terrarium-total-width: 74px;
  --terrarium-total-height: 108px;
  --terrarium-width: 68px;
  --terrarium-height: 96px;
  --terrarium-base-width: 68px;
  --terrarium-base-height: 12px;
  --terrarium-plant-width: 64px;
  --terrarium-plant-height: 86px;
}

/* ========== 高亮卡（active）：罩内变绿、底座变绿、边线变实绿 ========== */
.terrarium--highlight .terrarium__dome {
  /* 边线：原 70% 太重（看起来发黑），降到 45% 让虚线与绿色背景融合 */
  border-color: color-mix(in srgb, #6f9a5a 45%, transparent);
  background:
    linear-gradient(180deg,
      color-mix(in srgb, #c7d9b2 70%, transparent) 0%,
      color-mix(in srgb, #b5cda0 80%, transparent) 100%);
  /* 取消 0 0 0 2px 的硬环（这就是用户看到的"黑边框"），只保留内部光泽 */
  box-shadow:
    inset 0 6px 10px -6px rgba(255, 255, 255, .85),
    inset 0 -2px 4px -2px rgba(0, 0, 0, .04);
}
.terrarium--highlight .terrarium__dome-star::before,
.terrarium--highlight .terrarium__dome-star::after { background: #6f9a5a; }
.terrarium--highlight .terrarium__base-disk {
  background:
    linear-gradient(180deg, #95b87a 0%, #82a86a 60%, #6f9559 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .35),
    inset 0 -1px 0 rgba(0, 0, 0, .1);
}
.terrarium--highlight .terrarium__leaf { color: #4f7842; }
</style>
