<template>
  <div
    class="terrarium"
    :class="[`terrarium--${size}`, { 'terrarium--has-plant': hasPlant, 'terrarium--highlight': highlight }]"
    :aria-hidden="true"
  >
    <!-- 拱形玻璃罩 + 顶部小星 -->
    <span class="terrarium__dome">
      <span class="terrarium__dome-shine" />
      <span class="terrarium__dome-star" />
    </span>
    <!-- 罩内植物：未传植物时空着 -->
    <span v-if="hasPlant" class="terrarium__plant">
      <FocusPlant :species-id="speciesId" :stage="effectiveStage" />
    </span>
    <!-- 木质底座 -->
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
  // 'empty' = 只有底座（小，无罩）；'small' = 幼苗温室；'medium' = 成长温室；'large' = 盛放温室；'standard' = 年格标准
  size: { type: String, default: 'small' },
  // 植物信息；为空时不渲染植物
  speciesId: { type: String, default: 'daisy' },
  stage: { type: String, default: 'seed' },
  // 当前选中：罩内变绿色，底座变绿，表示"高亮卡"
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
.terrarium {
  position: relative;
  display: inline-grid;
  grid-template-rows: 1fr auto;
  justify-items: center;
  align-items: end;
  width: 100%;
  height: 100%;
  isolation: isolate;
  /* 默认浅米色背景，模拟"玻璃罩底色"；罩子通过 ::before 绘制 */
  color: #8a7e5e;
}

/* ========== 玻璃罩 ========== */
.terrarium__dome {
  position: relative;
  align-self: end;
  display: block;
  width: var(--terrarium-width, 60px);
  height: var(--terrarium-height, 78px);
  border-top-left-radius: 999px;
  border-top-right-radius: 999px;
  border: 1.4px dashed color-mix(in srgb, #b9c89e 70%, transparent);
  border-bottom: 0;
  background:
    linear-gradient(180deg,
      color-mix(in srgb, #f1ecda 78%, transparent) 0%,
      color-mix(in srgb, #ebe3ca 92%, transparent) 100%);
  box-shadow:
    inset 0 6px 10px -6px rgba(255, 255, 255, .85),
    inset 0 -2px 4px -2px rgba(0, 0, 0, .04);
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
  border: 1px dashed color-mix(in srgb, #c5d3a8 70%, transparent);
  border-bottom: 0;
  opacity: .7;
  pointer-events: none;
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
/* 罩顶小星：3 像素十字 */
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

/* 罩内植物：从底部伸入罩内（被罩的边框包住） */
.terrarium__plant {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  width: 70%;
  height: 78%;
  display: grid;
  place-items: end center;
  z-index: 0;
}
.terrarium__plant :deep(.focus-plant) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* ========== 底座 ========== */
.terrarium__base {
  position: relative;
  display: block;
  width: var(--terrarium-base-width, 64px);
  height: 11px;
  margin-top: -2px;
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

/* ========== 尺寸变体 ========== */
/* 年格标准温室（standard）：所有月都展示完整罩子，没数据时罩内空着 */
.terrarium--standard {
  --terrarium-width: 64px;
  --terrarium-height: 88px;
  --terrarium-base-width: 64px;
}
.terrarium--standard .terrarium__plant { bottom: 14px; height: 80%; }

/* 基础花田位（空）：保留与小罩相同的高度结构，罩/植物透明但占位，让底座 y 与小罩底座对齐 */
.terrarium--empty {
  --terrarium-width: 50px;
  --terrarium-height: 62px;
  --terrarium-base-width: 50px;
}
.terrarium--empty .terrarium__dome { visibility: hidden; }
.terrarium--empty .terrarium__plant { visibility: hidden; }

/* 幼苗温室（小罩）：stages 1-2（sprout / leaves） */
.terrarium--small {
  --terrarium-width: 50px;
  --terrarium-height: 62px;
  --terrarium-base-width: 56px;
}
.terrarium--small .terrarium__plant { bottom: 12px; height: 70%; }

/* 成长温室（中罩）：stages 3-4（bud / opening） */
.terrarium--medium {
  --terrarium-width: 64px;
  --terrarium-height: 84px;
  --terrarium-base-width: 70px;
}
.terrarium--medium .terrarium__plant { bottom: 14px; height: 80%; }

/* 盛放温室（大罩）：stage 5（bloom） */
.terrarium--large {
  --terrarium-width: 78px;
  --terrarium-height: 108px;
  --terrarium-base-width: 84px;
}
.terrarium--large .terrarium__plant { bottom: 16px; height: 86%; }

/* ========== 高亮卡（active）：罩内变绿、底座变绿、边线变实绿 ========== */
.terrarium--highlight .terrarium__dome {
  border-color: color-mix(in srgb, #6f9a5a 70%, transparent);
  background:
    linear-gradient(180deg,
      color-mix(in srgb, #c7d9b2 70%, transparent) 0%,
      color-mix(in srgb, #b5cda0 80%, transparent) 100%);
  box-shadow:
    inset 0 6px 10px -6px rgba(255, 255, 255, .85),
    inset 0 -2px 4px -2px rgba(0, 0, 0, .04),
    0 0 0 2px color-mix(in srgb, #6f9a5a 28%, transparent);
}
.terrarium--highlight .terrarium__dome-star {
  background:
    radial-gradient(circle at 50% 50%, #6f9a5a 0 1.5px, transparent 2px),
    radial-gradient(circle at 50% 50%, #6f9a5a 0 1.5px, transparent 2px);
}
.terrarium--highlight .terrarium__base-disk {
  background:
    linear-gradient(180deg, #95b87a 0%, #82a86a 60%, #6f9559 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .35),
    inset 0 -1px 0 rgba(0, 0, 0, .1);
}
.terrarium--highlight .terrarium__leaf { color: #4f7842; }
</style>
