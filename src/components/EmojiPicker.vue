<template>
  <Teleport to="body">
    <section v-if="visible" ref="rootRef" class="emoji-picker-popover" :style="pickerStyle" @click.stop>
      <header class="emoji-picker-popover__header">
        <div>
          <strong>选择分组图标</strong>
        </div>
        <button type="button" title="关闭" aria-label="关闭 Emoji 选择器" @click="emit('update:visible', false)">×</button>
      </header>

      <div class="emoji-picker-popover__search">
        <div class="search-wrapper">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input v-model="searchQuery" type="search" placeholder="搜索图标或分类，如会议、猫、咖啡..." class="emoji-search-input" />
          <button v-if="searchQuery" class="search-clear" type="button" aria-label="清除搜索" @click="searchQuery = ''">×</button>
        </div>
      </div>

      <nav ref="tabRailRef" class="emoji-picker-popover__tabs" aria-label="表情分类" @wheel.prevent="handleTabWheel">
        <button
          v-for="category in tabCategories"
          :key="category.id"
          type="button"
          class="emoji-category-tab"
          :class="{ active: activeCategory === category.id && !searchQuery }"
          :title="category.label"
          @click="selectCategory(category.id)"
        >
          <span>{{ category.icon }}</span>
        </button>
      </nav>

      <div ref="contentRef" class="emoji-picker-popover__content" @scroll="syncActiveCategory">
        <template v-if="filteredCategories.length">
          <div v-for="category in filteredCategories" :key="category.id" :ref="element => setCategoryRef(category.id, element)" class="emoji-category">
            <div class="category-title">
              <span>{{ category.icon }}</span>
              <strong>{{ category.label }}</strong>
              <small>{{ category.emojis.length }} 个</small>
            </div>
            <div class="emoji-grid">
              <button
                v-for="emoji in category.emojis"
                :key="emoji"
                type="button"
                class="emoji-item"
                :class="{ 'is-selected': modelValue === emoji }"
                :title="emojiLabel(emoji)"
                :aria-label="emojiLabel(emoji)"
                @click="selectEmoji(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </template>
        <div v-else class="emoji-empty-state">
          <span>🔎</span>
          <strong>未找到匹配的分类</strong>
          <small>试试“会议”、“猫”或“咖啡”</small>
        </div>
      </div>

      <footer class="emoji-picker-popover__footer">
        <div v-if="modelValue" class="selected-preview">
          <span class="selected-preview__label">当前</span>
          <span class="selected-emoji">{{ modelValue }}</span>
          <button type="button" @click="clear">移除图标</button>
        </div>
        <span v-else class="hint-text">点击图标即可应用到分组</span>
      </footer>
    </section>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modelValue: { type: String, default: '' },
  anchorEl: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'update:visible'])

const PICKER_WIDTH = 390
const PICKER_HEIGHT = 470
const GAP = 8
const searchQuery = ref('')
const activeCategory = ref('devops')
const tabRailRef = ref(null)
const contentRef = ref(null)
const categoryRefs = ref({})
const recentEmojis = ref([])
const RECENT_EMOJIS_KEY = 'simple-to-do.recent-group-emojis'

const baseEmojiCategoriesRaw = [
  {
    id: 'devops', icon: '⚙️', shortLabel: 'DevOps', label: 'DevOps 与工程',
    keywords: ['devops', '开发', '工程', '部署', '运维', '云', '代码', 'ci', 'cd', 'docker', 'k8s'],
    emojis: ['⚙️', '🛠️', '🔧', '🔩', '🧰', '⚒️', '⛏️', '🪛', '💻', '🖥️', '⌨️', '🖱️', '🖨️', '📱', '🧑‍💻', '👨‍💻', '👩‍💻', '🐳', '☸️', '☁️', '🌐', '🛰️', '📡', '🚀', '🛸', '📦', '🗃️', '🗄️', '💾', '💿', '🔌', '🔋', '🔗', '⛓️', '🔀', '🌿', '🏗️', '🏭', '🧪', '🧬', '📈', '📊', '📉', '🔍', '🔎', '🛡️', '🔒', '🔐', '🔑', '🚨', '🐛', '🪲', '✅', '☑️', '♻️', '🧹', '🧯', '📟', '🧾', '📤', '📥', '🔄', '🔃', '⏱️', '⏲️', '📯']
  },
  {
    id: 'work', icon: '💼', shortLabel: '工作', label: '工作与规划',
    keywords: ['工作', '项目', '计划', '会议', '学习', '办公'],
    emojis: ['💼', '📁', '📂', '🗂️', '🗃️', '📝', '📋', '📌', '📍', '📅', '🗓️', '⏰', '⌛', '🎯', '📚', '📖', '📓', '📔', '✏️', '🖊️', '🖋️', '📎', '📐', '📏', '✂️', '📞', '☎️', '📧', '📨', '💬', '🗣️', '🤝', '🧠', '💡', '🏢', '🏠', '👥', '🧑‍🤝‍🧑', '🧑‍🏫', '🧑‍💼', '📢', '📣', '🔖', '📑', '🧾', '🗒️', '📇', '📬', '📮', '🕘', '🧮', '🪧']
  },
  {
    id: 'faces', icon: '😀', shortLabel: '表情', label: '表情与心情',
    keywords: ['表情', '心情', '笑脸', '情绪'],
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😛', '😜', '🤪', '😎', '🤓', '🧐', '🤔', '🫡', '🤗', '🤭', '🫢', '😌', '😴', '🥳', '😤', '😮', '😲', '🙄', '😬', '🤯', '🥺', '😭', '😡', '🤠']
  },
  {
    id: 'symbols', icon: '🔖', shortLabel: '符号', label: '符号与状态',
    keywords: ['符号', '状态', '标记', '重要', '安全'],
    emojis: ['🔖', '🏷️', '⭐', '🌟', '✨', '💫', '🔥', '💥', '💯', '❗', '❓', '‼️', '⁉️', '✅', '☑️', '🆕', '🆗', '🆙', '🔔', '🔕', '📣', '🚩', '🏁', '⚠️', '⛔', '🚫', '🔒', '🔓', '🛡️', '💎', '🎁', '🧷', '🪪']
  },
  {
    id: 'nature', icon: '🌿', shortLabel: '自然', label: '自然与天气',
    keywords: ['自然', '天气', '植物', '户外'],
    emojis: ['🌿', '🌱', '🪴', '🍀', '🌸', '🌺', '🌻', '🌹', '🌷', '🪻', '🌳', '🌲', '🌴', '🌵', '🍂', '🍁', '🌈', '☀️', '🌤️', '☁️', '🌧️', '⛈️', '❄️', '🌙', '⭐', '🌊', '🔥', '🌋', '🏕️', '🏞️', '🪨', '🐚']
  },
  {
    id: 'activities', icon: '🎨', shortLabel: '活动', label: '活动与兴趣',
    keywords: ['活动', '运动', '游戏', '娱乐', '音乐'],
    emojis: ['🎨', '🎮', '🕹️', '🎲', '🧩', '🎵', '🎸', '🎹', '🥁', '🎤', '🎧', '🎬', '🎭', '📷', '🎥', '⚽', '🏀', '🏈', '⚾', '🎾', '🏸', '🏃', '🚴', '🏊', '🧘', '🎯', '🏆', '🥇', '🎉', '🎊', '🎁']
  },
  {
    id: 'animals', icon: '🐶', shortLabel: '动物', label: '动物',
    keywords: ['动物', '宠物'],
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐧', '🦉', '🐝', '🦋', '🐳', '🐬', '🐟', '🐢', '🦄', '🐴', '🐔', '🦆', '🦅', '🐙', '🦖', '🦕', '🐞']
  },
  {
    id: 'food', icon: '🍜', shortLabel: '食物', label: '食物与生活',
    keywords: ['食物', '生活', '咖啡', '餐饮'],
    emojis: ['☕', '🍵', '🧋', '🥤', '🍎', '🍓', '🍉', '🍇', '🍊', '🍋', '🍌', '🥑', '🥦', '🍞', '🥐', '🍔', '🍕', '🍣', '🍜', '🍚', '🍛', '🍰', '🍪', '🍫', '🍺', '🍷', '🛒', '🏡']
  },
  {
    id: 'travel', icon: '✈️', shortLabel: '出行', label: '出行与地点',
    keywords: ['出行', '交通', '旅行', '地点'],
    emojis: ['✈️', '🚀', '🚗', '🚕', '🚌', '🚙', '🚓', '🚚', '🚆', '🚇', '🚲', '🛵', '🚢', '🗺️', '🧭', '🏖️', '🏔️', '🏙️', '🏠', '🏥', '🏫', '🏬', '🏨', '⛽', '🅿️']
  },
  {
    id: 'people', icon: '🧑', shortLabel: '人物', label: '人物与关系',
    keywords: ['人物', '关系', '团队', '家庭'],
    emojis: ['🧑', '👤', '👥', '🫂', '🤝', '🙋', '🙆', '💁', '🙇', '🧑‍🏫', '🧑‍⚕️', '🧑‍🔬', '🧑‍🎨', '🧑‍🚀', '👨‍👩‍👧', '👪', '👶', '🧒', '🧓', '👑', '🎓', '🧢', '👓', '💬']
  },
  {
    id: 'ideas', icon: '💡', shortLabel: '灵感', label: '灵感与收藏',
    keywords: ['灵感', '收藏', '阅读', '创意'],
    emojis: ['💡', '🧠', '🔮', '🪄', '🎨', '🖼️', '🧩', '🪴', '🕯️', '🪞', '📖', '📕', '📗', '📘', '📙', '🔖', '💭', '🗯️', '✍️', '🧵', '🪡', '🎀', '🪩', '🦄']
  },
  {
    id: 'flags', icon: '🚩', shortLabel: '旗帜', label: '旗帜与优先级',
    keywords: ['旗帜', '优先级', '国家', '标记'],
    emojis: ['🚩', '🏳️', '🏴', '🏁', '🎌', '🇨🇳', '🇺🇸', '🇯🇵', '🇬🇧', '🇫🇷', '🇩🇪', '🇰🇷', '🇸🇬', '🇦🇺', '🇨🇦', '🇮🇹', '🇪🇸', '🇧🇷', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣']
  },
  {
    id: 'health', icon: '💚', shortLabel: '健康', label: '健康与自我照顾',
    keywords: ['健康', '运动', '医疗', '睡眠', '健身', '饮食', '心理'],
    emojis: ['💚', '❤️', '💤', '🛌', '🧘', '🏋️', '🏃', '🚶', '🚴', '🥗', '💧', '🩺', '💊', '🩹', '🧴', '🪥', '🧼', '🛁', '🧖', '🧠', '🫀', '🦷', '👓', '😷']
  },
  {
    id: 'home', icon: '🏠', shortLabel: '居家', label: '居家与日常',
    keywords: ['居家', '家庭', '家务', '日常', '购物', '清洁'],
    emojis: ['🏠', '🛋️', '🛏️', '🚪', '🪑', '🪟', '🧺', '🧽', '🗑️', '🪠', '🚿', '🧸', '📺', '📻', '🪜', '🧱', '🧊', '🧦', '🧳', '🪤', '🪹', '🪴']
  },
  {
    id: 'finance', icon: '💰', shortLabel: '财务', label: '财务与消费',
    keywords: ['财务', '金钱', '账单', '预算', '理财', '消费', '工资'],
    emojis: ['💰', '💳', '💵', '💴', '💶', '💷', '🪙', '🏦', '💸', '💱', '💹', '💲', '🏧', '📒', '🧾', '🛍️', '💎', '🤲', '🪪', '🧮']
  },
  {
    id: 'communication', icon: '💬', shortLabel: '沟通', label: '沟通与社交',
    keywords: ['沟通', '消息', '电话', '邮件', '社交', '联系', '聊天'],
    emojis: ['💬', '🗨️', '🗯️', '📲', '📳', '📴', '📵', '📶', '📠', '🛜', '👋', '🙏', '🤲', '🫶', '🤙', '🫡', '🤳', '📸', '📝', '🗒️']
  }
]

function uniqueEmojiCategories(categories, excludedEmojis = new Set()) {
  const usedEmojis = new Set(excludedEmojis)
  return categories.map(category => ({
    ...category,
    emojis: category.emojis.filter(emoji => !usedEmojis.has(emoji) && usedEmojis.add(emoji))
  })).filter(category => category.emojis.length)
}

const baseEmojiCategories = uniqueEmojiCategories(baseEmojiCategoriesRaw)
const emojiMetadata = ref({})

const emojiCategories = computed(() => {
  const recentCategory = recentEmojis.value.length
    ? [{ id: 'recent', icon: '🕘', shortLabel: '最近', label: '最近使用', keywords: ['最近', '常用'], emojis: recentEmojis.value }]
    : []
  return [...recentCategory, ...uniqueEmojiCategories(baseEmojiCategories, new Set(recentEmojis.value))]
})

const tabCategories = computed(() => {
  const quickIds = ['recent', 'devops', 'work', 'faces', 'symbols', 'nature']
  return emojiCategories.value.filter(category => quickIds.includes(category.id))
})

const filteredCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return emojiCategories.value
  return emojiCategories.value
    .map(category => {
      const categoryMatches = `${category.label} ${category.shortLabel} ${category.keywords.join(' ')}`.toLowerCase().includes(query)
      const emojis = categoryMatches
        ? category.emojis
        : category.emojis.filter(emoji => emojiSearchText(emoji).includes(query))
      return { ...category, emojis }
    })
    .filter(category => category.emojis.length)
})

const pickerStyle = computed(() => {
  if (!props.anchorEl) return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  const rect = props.anchorEl.getBoundingClientRect()
  const pad = 12
  let x = rect.left + rect.width / 2 - PICKER_WIDTH / 2
  let y = rect.bottom + GAP
  const spaceBelow = window.innerHeight - rect.bottom - GAP
  const spaceAbove = rect.top - GAP
  if (spaceBelow < PICKER_HEIGHT && spaceAbove >= PICKER_HEIGHT) y = rect.top - PICKER_HEIGHT - GAP
  else if (spaceBelow < PICKER_HEIGHT) y = Math.max(pad, window.innerHeight - PICKER_HEIGHT - pad)
  x = Math.max(pad, Math.min(x, window.innerWidth - PICKER_WIDTH - pad))
  return { left: `${x}px`, top: `${y}px` }
})

function selectCategory(id) {
  activeCategory.value = id
  searchQuery.value = ''
  nextTick(() => categoryRefs.value[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function handleTabWheel(event) {
  const rail = tabRailRef.value
  if (!rail) return
  rail.scrollLeft += event.deltaY || event.deltaX
}

function setCategoryRef(id, element) {
  if (element) categoryRefs.value[id] = element
}

function syncActiveCategory() {
  if (searchQuery.value || !contentRef.value) return
  const scrollTop = contentRef.value.scrollTop + 18
  const current = emojiCategories.value.reduce((matched, category) => {
    const element = categoryRefs.value[category.id]
    return element && element.offsetTop <= scrollTop ? category.id : matched
  }, emojiCategories.value[0]?.id || 'devops')
  activeCategory.value = current
}

const emojiLabels = {
  '⚙️': '设置与自动化', '🛠️': '开发工具', '🔧': '配置与修复', '🔩': '组件与依赖', '🧰': '工具箱', '⚒️': '工程构建', '⛏️': '构建工具', '🪛': '维护工具',
  '💻': '开发电脑', '🖥️': '服务器终端', '⌨️': '编程键盘', '🖱️': '鼠标操作', '🖨️': '打印服务', '🧑‍💻': '开发者', '👨‍💻': '开发者', '👩‍💻': '开发者',
  '🐳': '容器与 Docker', '☸️': 'Kubernetes 集群', '☁️': '云服务', '🌐': '网络与 Web', '🛰️': '云端基础设施', '📡': '网络监控', '🚀': '发布与部署',
  '📦': '构建产物', '🗃️': '数据归档', '🗄️': '数据库', '💾': '数据存储', '💿': '镜像与介质', '🔌': '服务集成', '🔋': '资源状态', '🔗': '链接与集成', '⛓️': '依赖链路', '🔀': '分支与合并', '🌿': 'Git 分支',
  '🏗️': '构建流水线', '🏭': '生产环境', '🧪': '测试', '🧬': '实验与研发', '📈': '性能增长', '📊': '数据看板', '📉': '异常趋势', '🔍': '排查问题', '🔎': '深度分析',
  '🛡️': '安全防护', '🔒': '权限控制', '🔐': '密钥与加密', '🔑': '访问密钥', '🚨': '告警事故', '🐛': '缺陷修复', '🪲': '问题追踪', '✅': '验证通过', '☑️': '待办完成', '♻️': '重构优化', '🧹': '清理维护', '🧯': '应急处理', '🔄': '持续集成', '🔃': '同步更新', '⏱️': '耗时监控', '📤': '发布上线', '📥': '拉取更新'
}

const emojiSearchKeywords = {
  '📅': '日历 日期 日程 会议', '🗓️': '日历 日期 周计划 月计划', '⏰': '闹钟 提醒 时间', '📝': '笔记 记录 写作', '📋': '清单 待办 检查', '🎯': '目标 计划', '📚': '学习 书籍 阅读', '📞': '电话 联系 客户', '📧': '邮件 邮箱', '💬': '消息 聊天 沟通',
  '🐶': '狗 狗狗 宠物', '🐱': '猫 猫咪 宠物', '🐼': '熊猫', '🐰': '兔子 宠物', '🐸': '青蛙', '🐧': '企鹅', '🦋': '蝴蝶', '🐳': '鲸鱼 海洋',
  '☕': '咖啡 饮品 休息', '🍵': '茶 喝茶 饮品', '🧋': '奶茶 饮品', '🍜': '面条 吃饭 餐饮', '🍔': '汉堡 快餐', '🍕': '披萨', '🍣': '寿司', '🍰': '蛋糕 甜品 生日', '🛒': '购物 买菜 超市',
  '✈️': '飞机 出差 旅行', '🚗': '汽车 开车 出行', '🚆': '火车 高铁 通勤', '🚲': '自行车 骑行', '🚢': '轮船 邮轮', '🗺️': '地图 地点 导航', '🏥': '医院 看病 医疗', '🏫': '学校 上学',
  '💤': '睡眠 睡觉 休息', '🏋️': '健身 力量训练', '🏃': '跑步 运动', '🧘': '冥想 瑜伽 放松', '💧': '喝水 饮水', '💊': '药物 吃药 医疗', '🩺': '医生 体检 医疗',
  '💰': '钱 金钱 财务 理财', '💳': '银行卡 信用卡 支付', '🧾': '账单 发票 报销', '🏦': '银行', '📈': '增长 投资 股票',
  '🏠': '家 居家 家庭', '🧹': '打扫 清洁 家务', '🧺': '洗衣 家务', '🗑️': '垃圾 清理', '🔑': '钥匙 门锁',
  '🎵': '音乐 听歌', '🎮': '游戏 娱乐', '🎬': '电影 追剧', '📷': '拍照 摄影', '⚽': '足球 运动', '🏀': '篮球 运动', '🎨': '绘画 艺术 创作',
  '🌿': '植物 自然 绿色', '🌸': '花朵 春天', '☀️': '太阳 晴天 天气', '🌧️': '下雨 雨天 天气', '🌙': '月亮 夜晚 睡眠', '🔥': '火焰 热门 紧急'
}

function normalizeEmoji(emoji) {
  return emoji.replace(/\uFE0F/g, '')
}

function emojiMetadataFor(emoji) {
  return emojiMetadata.value[emoji] || emojiMetadata.value[normalizeEmoji(emoji)]
}

function emojiSearchText(emoji) {
  const metadata = emojiMetadataFor(emoji)
  return `${emoji} ${emojiLabels[emoji] || ''} ${emojiSearchKeywords[emoji] || ''} ${metadata?.annotation || ''} ${(metadata?.tags || []).join(' ')}`.toLowerCase()
}

function emojiLabel(emoji) {
  return emojiMetadataFor(emoji)?.annotation || emojiLabels[emoji] || 'Emoji 图标'
}

async function loadEmojiMetadata() {
  const module = await import('emoji-picker-element-data/zh/cldr/data.json')
  const metadataByEmoji = Object.fromEntries(module.default.map(item => [item.emoji, item]))
  emojiMetadata.value = metadataByEmoji
}

function saveRecentEmojis() {
  try {
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(recentEmojis.value))
  } catch (_) {
    // 本地存储不可用时仍可正常选择图标。
  }
}

function rememberEmoji(emoji) {
  recentEmojis.value = [emoji, ...recentEmojis.value.filter(item => item !== emoji)].slice(0, 24)
  saveRecentEmojis()
}

onMounted(async () => {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_EMOJIS_KEY) || '[]')
    if (Array.isArray(saved)) recentEmojis.value = saved.filter(item => typeof item === 'string').slice(0, 24)
  } catch (_) {
    recentEmojis.value = []
  }
  try {
    await loadEmojiMetadata()
  } catch (_) {
    // 中文元数据加载失败时保留内置名称和搜索关键词。
  }
})

function selectEmoji(emoji) {
  rememberEmoji(emoji)
  emit('update:modelValue', emoji)
  emit('update:visible', false)
}

function clear() {
  emit('update:modelValue', '')
  emit('update:visible', false)
}
</script>

<style scoped>
.emoji-picker-popover { position: fixed; z-index: 2400; overflow: hidden; width: 390px; border: 1px solid #dce7e4; border-radius: 16px; background: #fff; box-shadow: 0 22px 64px rgba(15, 23, 42, .22), 0 0 0 1px rgba(255,255,255,.8); animation: emoji-pop .16s ease; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.emoji-picker-popover__header { display: flex; align-items: center; justify-content: space-between; min-height: 42px; padding: 8px 14px; border-bottom: 1px solid #edf2f0; }
.emoji-picker-popover__header div { display: grid; gap: 2px; }
.emoji-picker-popover__header strong { color: #17211f; font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
.emoji-picker-popover__header button { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 8px; background: #f4f7f6; color: #80908b; font-size: 19px; line-height: 1; transition: .15s ease; }
.emoji-picker-popover__header button:hover { background: #e8f3f0; color: #356f66; }
.emoji-picker-popover__search { padding: 8px 14px 7px; }
.search-wrapper { position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 10px; color: #91a09b; pointer-events: none; }
.emoji-search-input { width: 100%; height: 34px; padding: 0 32px 0 31px; border: 1px solid #dce7e4; border-radius: 9px; outline: 0; background: #f8fbfa; color: #17211f; font-size: 12px; transition: .15s ease; }
.emoji-search-input:focus { border-color: #42a895; background: #fff; box-shadow: 0 0 0 3px rgba(66,168,149,.13); }
.emoji-search-input::placeholder { color: #9aa8a3; }
.search-clear { position: absolute; right: 6px; display: grid; width: 22px; height: 22px; place-items: center; border-radius: 6px; background: transparent; color: #91a09b; font-size: 16px; }
.search-clear:hover { background: #e8f3f0; color: #356f66; }
.emoji-picker-popover__tabs { display: flex; gap: 5px; overflow-x: auto; padding: 0 12px 8px; border-bottom: 1px solid #edf2f0; scroll-behavior: smooth; scrollbar-width: none; cursor: ew-resize; }
.emoji-picker-popover__tabs::-webkit-scrollbar { display: none; }
.emoji-category-tab { display: grid; flex: 0 0 auto; width: 30px; height: 30px; place-items: center; padding: 0; border: 1px solid transparent; border-radius: 8px; background: transparent; color: #70807b; transition: .15s ease; }
.emoji-category-tab:hover { background: #f1f7f5; color: #356f66; }
.emoji-category-tab.active { border-color: #b7dfd6; background: #e5f4f0; color: #247c6b; box-shadow: inset 0 -2px 0 #2f9e7c; }
.emoji-category-tab span { font-size: 17px; line-height: 1; }
.emoji-picker-popover__content { height: 285px; overflow-y: auto; padding: 10px 13px; scroll-behavior: smooth; scrollbar-width: thin; scrollbar-color: #c9d7d2 transparent; }
.emoji-picker-popover__content::-webkit-scrollbar { width: 6px; }
.emoji-picker-popover__content::-webkit-scrollbar-thumb { border-radius: 4px; background: #c9d7d2; }
.emoji-category { margin-bottom: 10px; scroll-margin-top: 4px; }
.category-title { display: flex; align-items: center; gap: 6px; padding: 1px 3px 7px; color: #5c6c67; }
.category-title span { font-size: 15px; }
.category-title strong { font-size: 12px; font-weight: 700; }
.category-title small { margin-left: auto; color: #9aa8a3; font-size: 11px; }
.emoji-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 3px; }
.emoji-item { display: grid; width: 37px; height: 36px; place-items: center; border: 1px solid transparent; border-radius: 8px; background: transparent; font-size: 21px; line-height: 1; transition: transform .14s ease, background .14s ease, border-color .14s ease; }
.emoji-item:hover { border-color: #c4e3db; background: #eff8f5; transform: translateY(-1px) scale(1.08); }
.emoji-item:active { transform: scale(.94); }
.emoji-item.is-selected { border-color: #42a895; background: #dff3ed; box-shadow: inset 0 0 0 1px rgba(66,168,149,.18); }
.emoji-empty-state { display: grid; min-height: 180px; place-content: center; gap: 7px; color: #81908b; text-align: center; }
.emoji-empty-state > span { font-size: 28px; }
.emoji-empty-state strong { color: #52625d; font-size: 13px; }
.emoji-empty-state small { font-size: 12px; }
.emoji-picker-popover__footer { display: flex; align-items: center; min-height: 38px; padding: 6px 14px; border-top: 1px solid #edf2f0; background: #f9fbfa; }
.selected-preview { display: flex; align-items: center; gap: 8px; width: 100%; }
.selected-preview__label, .hint-text { color: #8b9994; font-size: 12px; }
.selected-emoji { font-size: 23px; line-height: 1; }
.selected-preview button { margin-left: auto; padding: 4px 8px; border-radius: 6px; background: transparent; color: #cf5d57; font-size: 12px; }
.selected-preview button:hover { background: #fff0ef; }
@keyframes emoji-pop { from { opacity: 0; transform: translateY(-4px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>
