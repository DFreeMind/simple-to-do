<template>
  <Teleport to="body">
    <div v-if="store.helpCenterOpen" class="help-center-layer" :style="themeStyle" role="dialog" aria-modal="true" aria-label="使用指南" @keydown.esc.stop="store.closeHelpCenter">
      <button class="help-center-scrim" type="button" aria-label="关闭使用指南" @click="store.closeHelpCenter"></button>
      <section ref="panelRef" class="help-center" tabindex="-1">
        <header class="help-center__header">
          <div class="help-center__brand">
            <span class="help-center__mark"><Compass :size="21" /></span>
            <div>
              <p class="eyebrow">易简清单</p>
              <h2>使用指南</h2>
            </div>
          </div>
          <button class="icon-btn" type="button" aria-label="关闭使用指南" title="关闭" @click="store.closeHelpCenter"><X :size="18" /></button>
        </header>

        <div class="help-center__layout">
          <nav class="help-center__nav" aria-label="指南目录">
            <label class="help-center__search">
              <Search :size="15" />
              <input v-model="query" type="search" placeholder="搜索指南" aria-label="搜索指南" />
            </label>
            <template v-for="group in groupedDocuments" :key="group.category">
              <p class="help-center__nav-label">{{ group.category }} <span>{{ group.documents.length }}</span></p>
              <button
                v-for="item in group.documents"
                :key="item.id"
                class="help-center__nav-item"
                :class="{ active: activeDocument.id === item.id }"
                type="button"
                @click="selectDocument(item.id)"
              >
                <component :is="item.icon" :size="16" />
                <span><strong>{{ item.title }}</strong><small>{{ query ? matchSummary(item) : item.summary }}</small></span>
              </button>
            </template>
            <p v-if="!filteredDocuments.length" class="help-center__empty">没有找到相关内容</p>
          </nav>

          <article ref="articleRef" class="help-center__article" @scroll.passive="syncActiveSection">
            <header class="help-center__article-head">
              <span class="help-center__article-icon"><component :is="activeDocument.icon" :size="22" /></span>
              <div>
                <p class="eyebrow">{{ activeDocument.category }}</p>
                <h1>{{ activeDocument.title }}</h1>
                <p>{{ activeDocument.summary }}</p>
              </div>
            </header>

            <section v-for="section in activeDocument.sections" :key="section.title" class="help-center__section">
              <h2>{{ section.title }}</h2>
              <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
              <figure v-if="section.image" class="help-center__figure">
                <button class="help-center__image-action" type="button" :aria-label="`查看大图：${section.image.alt}`" @click="openImage(section.image.src)">
                  <img :src="section.image.src" :alt="section.image.alt" loading="lazy" />
                  <span class="help-center__figure-zoom"><Maximize2 :size="14" /></span>
                </button>
                <figcaption><span>{{ section.image.caption || section.image.alt }}</span><button type="button" @click="openImage(section.image.src)"><Maximize2 :size="13" /> 查看大图</button></figcaption>
              </figure>
              <ol v-if="section.steps" class="help-center__steps">
                <li v-for="step in section.steps" :key="step">{{ step }}</li>
              </ol>
              <ul v-if="section.items" class="help-center__list">
                <li v-for="item in section.items" :key="item">{{ item }}</li>
              </ul>
              <aside v-if="section.tip" class="help-center__tip"><Sparkles :size="16" /><span>{{ section.tip }}</span></aside>
            </section>

            <footer class="help-center__article-foot">
              <span>适用版本 {{ appVersion }}</span>
              <span>内容会随应用版本持续更新</span>
            </footer>
          </article>

          <aside class="help-center__toc" aria-label="当前文章目录">
            <p>本文目录</p>
            <button v-for="section in activeDocument.sections" :key="section.title" :class="{ active: activeSectionTitle === section.title }" type="button" @click="scrollToSection(section.title)">{{ section.title }}</button>
          </aside>
        </div>
      </section>

      <Transition name="help-zoom-fade">
        <div v-if="lightboxVisible" class="help-zoom-overlay" @click.self="lightboxVisible = false" @keydown.esc="lightboxVisible = false" tabindex="0" ref="zoomOverlayRef">
          <div class="help-zoom-card">
            <button class="help-zoom-close" type="button" aria-label="关闭预览" @click="lightboxVisible = false"><X :size="18" /></button>
            <img :src="lightboxImage" alt="预览图片" />
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { BookOpenCheck, Calendar, Compass, Database, Keyboard, Maximize2, Rocket, Search, Settings, Sparkles, Timer, Wrench, X } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/task'

const store = useTaskStore()
const panelRef = ref(null)
const articleRef = ref(null)
const query = ref('')
const activeId = ref('quick-start')
const activeSectionTitle = ref('')
const appVersion = __APP_VERSION__
const lightboxVisible = ref(false)
const lightboxImage = ref('')
const zoomOverlayRef = ref(null)

function openImage(src) {
  lightboxImage.value = src
  lightboxVisible.value = true
  nextTick(() => zoomOverlayRef.value?.focus())
}

const themePalettes = {
  mint: { accent: '#2f8f86', accentStrong: '#1f6f68', accentSoft: '#e5f5f2', accentTint: '#f3fbf9' },
  blue: { accent: '#346fd8', accentStrong: '#2455ad', accentSoft: '#e6efff', accentTint: '#f4f8ff' },
  violet: { accent: '#6d5bd7', accentStrong: '#5442bd', accentSoft: '#eeeaff', accentTint: '#f8f6ff' },
  graphite: { accent: '#475569', accentStrong: '#334155', accentSoft: '#e9eef5', accentTint: '#f7f9fc' }
}
const themeStyle = computed(() => {
  const palette = themePalettes[store.settings.theme] || themePalettes.mint
  return {
    '--accent': palette.accent,
    '--accent-strong': palette.accentStrong,
    '--accent-soft': palette.accentSoft,
    '--accent-tint': palette.accentTint,
    '--surface': '#ffffff',
    '--surface-muted': '#f8faf9',
    '--border': '#e2e8e6',
    '--text': '#17211f',
    '--text-muted': '#687674',
    '--text-8-fallback': 'rgba(23, 33, 31, 0.08)',
    '--accent-20-border-fallback': `${palette.accent}33`
  }
})

const documents = [
  {
    id: 'quick-start', category: '快速开始', title: '三步开始使用', summary: '先收集，再安排，最后聚焦今天。', icon: Rocket,
    sections: [
      { title: '1. 先记录想法', paragraphs: ['想到要做的事时，直接在“收集箱”或“今日”输入任务标题。先记下来，比立刻分类更重要。'], image: { src: '/screenshots/today-view.webp', alt: '快速添加任务', caption: '在输入框中输入任务标题，支持智能解析日期和标签' }, tip: '输入“明天 9点 写周报 #工作”可自动识别日期、时间和标签。' },
      { title: '2. 安排任务', paragraphs: ['点开任务详情可设置日期、提醒、优先级、清单和标签；也可以把真正要做的任务加入“今日”。'], image: { src: '/screenshots/task-detail.webp', alt: '任务详情面板', caption: '任务详情面板支持设置日期、优先级、标签、子任务等' }, items: ['日期用于安排计划视图。', '“今日”只保留当天要推进的少数任务。'] },
      { title: '3. 完成与回顾', paragraphs: ['完成后勾选任务；已完成内容会保留，方便在“已完成”中回顾。'], tip: '每天结束前花一分钟整理收集箱，第二天会更轻松。' }
    ]
  },
  {
    id: 'feature-map', category: '快速开始', title: '应用功能地图', summary: '先了解系统里的对象、入口和可执行操作。', icon: Compass,
    sections: [
      { title: '你可以管理什么', paragraphs: ['易简清单把日常安排拆成几类对象。先分清它们的作用，再决定任务放在哪里：'], image: { src: '/screenshots/sidebar-overview.webp', alt: '应用功能入口总览', caption: '模块栏与清单侧栏共同放置应用入口、视图、清单和常用操作' }, items: [
        '任务：要完成的一件事，可以有日期、提醒、优先级、标签、子任务和备注',
        '清单：任务的容器，例如工作任务、家庭采购、阅读学习；一个任务属于一个清单',
        '分组：清单的上一级目录，例如把“工作任务”和“会议记录”放入“工作”',
        '视图：从不同角度查看同一批任务，例如今日、计划、重要、已完成和垃圾桶',
        '个人空间：管理昵称、头像、附件维护、本机恢复点和设备安全'
      ] },
      { title: '常用入口在哪里', paragraphs: ['桌面端打开后，最左侧是全局模块栏，清单栏、任务列表和任务详情依次展开。没有选中任务时，右侧会显示空状态；这不是额外的任务栏。'], image: { src: '/screenshots/sidebar-overview.webp', alt: '应用三栏布局', caption: '三栏布局：左侧模块栏 + 清单侧栏、中间任务列表、右侧详情/空状态' }, items: [
        '最左侧模块栏：头像打开个人空间；清单和时钟用于切换一级模块；使用指南和设置始终固定在底部',
        '清单栏右上角：收起清单栏。收起后，模块栏会接管搜索、主要视图、清单切换、已完成和垃圾桶等快捷操作',
        '左侧主要视图：今日、收集箱、计划、重要',
        '我的清单：通过“+”新建清单，通过文件夹加号新建分组',
        '左侧底部：已完成、垃圾桶和使用指南',
        '任务详情：点击任务后出现，可编辑属性、子任务、备注和附件'
      ], tip: '不确定从哪里开始时，先在收集箱创建任务，再通过任务详情或拖动整理。' },
      { title: '当前不包含的功能', paragraphs: ['当前版本是本地个人任务管理工具：'], items: [
        '不需要账号，数据保存在本机',
        '暂不提供云同步、多人协作、团队成员和在线连接',
        '时钟模块包含专注工作台、节律提醒、专注回顾和专注成就；所有记录与成长数据都保存在本机',
        '不包含完整日历、习惯或四象限管理'
      ], tip: '个人空间中的“连接与协作”是预留入口，目前不会改变本地任务数据。' }
    ]
  },
  {
    id: 'task-basics', category: '任务', title: '任务管理基础', summary: '创建、编辑和操作任务，以及使用富文本备注。', icon: BookOpenCheck,
    sections: [
      { title: '创建任务', paragraphs: ['在“今日”、收集箱、重要或具体清单中，使用页面顶部的添加任务输入框，输入标题后按回车即可创建。快速添加支持智能解析：'], image: { src: '/screenshots/today-view.webp', alt: '快速添加任务', caption: '输入框支持智能解析日期、时间和标签' }, items: [
        '输入“明天 9点 写周报 #工作”可设置日期、时间和标签',
        '输入“每天 英语听力”可设置每日重复',
        '输入“重要 项目评审”可标记为高优先级',
        '输入“下周 体检”可安排到一周后'
      ], tip: '不确定如何分类时，先放进收集箱，之后再整理。' },
      { title: '编辑任务详情', paragraphs: ['点击任务打开右侧详情面板，可以编辑以下内容：'], image: { src: '/screenshots/task-detail.webp', alt: '任务详情面板', caption: '任务详情面板支持设置日期、优先级、标签、子任务等' }, items: [
        '标题：直接点击标题区域修改',
        '日期：设置截止日期，任务会出现在计划视图中',
        '时间：可为任务指定具体时间，提供 08:00、09:00、10:00、12:00、14:00、18:00、20:00 快捷预设；自定义支持输入 930 或 09:30，并能按 15 分钟微调',
        '提醒：在日期浮层中选择预设或自定义提醒时间，应用会发送系统通知',
        '重复：按天/周/月/年重复，或自定义按周几组合',
        '优先级：高、中、低三级，高优先级任务会在”重要”视图中显示',
        '清单：将任务移动到其他清单',
        '标签：添加多个标签便于分类和搜索',
        '子任务：拆分为可完成的小步骤，支持拖动排序',
        '备注：支持富文本编辑，包括标题、列表、链接、图片、表格、折叠块、任务引用等'
      ] },
      { title: '任务操作', paragraphs: ['任务支持多种快捷操作：'], image: { src: '/screenshots/task-detail-meta.webp', alt: '任务详情顶部属性行', caption: '任务详情顶部属性行展示日期、优先级、清单等可操作的元数据' }, items: [
        '置顶：将重要任务固定在列表顶部',
        '标记重要：高亮显示并汇总到”重要”视图',
        '加入今日：将任务添加到今天的待办中',
        '完成：点击复选框标记完成，支持撤销',
        '删除：移入垃圾桶，可设置自动清理天数'
      ], tip: '已完成的任务会保留记录，方便在“已完成”视图中回顾。' },
      { title: '子任务管理', paragraphs: ['子任务适合将大任务拆分为可执行的小步骤。在详情面板的”子任务”区域：'], image: { src: '/screenshots/subtask-panel.webp', alt: '子任务列表', caption: '子任务列表紧贴主任务下方，可勾选、拖动排序，顶部显示完成进度' }, items: [
        '点击”添加子任务”输入子任务标题',
        '拖动子任务左侧的排序手柄调整顺序',
        '点击复选框标记子任务完成',
        '详情卡片顶部显示子任务完成进度'
      ], tip: '子任务列表会在详情面板中紧贴主任务下方，可参考富文本备注的截图查看其位置。' },
      { title: '富文本备注', paragraphs: ['备注支持丰富的格式，适合记录详细信息：'], image: { src: '/screenshots/rich-editor.webp', alt: '富文本编辑器', caption: '富文本编辑器支持多种格式和图片插入' }, items: [
        '标题：使用 H1-H3 组织内容结构',
        '文本格式：加粗、斜体、删除线、下划线、高亮、行内代码',
        '列表：无序列表、编号列表、待办列表',
        '链接：添加超链接，点击可直接打开；粘贴网址时自动识别',
        '引用：突出显示重要信息',
        '分割线：分隔不同内容区域',
        '图片：粘贴或上传图片，支持预览和放大查看',
        '代码块：插入多行代码或命令片段',
        '表格：插入 3×3 表格，可调整行列',
        '折叠块：插入可展开的详情内容，适合长文阅读',
        '任务引用：搜索并引用其他任务，备注中的链接会跳到对应任务',
        '对齐：支持段落和标题的居中、左对齐',
        '撤销与重做：通过工具栏按钮或 Ctrl/Cmd+Z、Ctrl/Cmd+Shift+Z 操作'
      ], tip: '点击编辑器右上角的放大按钮，可进入全屏编辑模式；底部状态栏会显示字符数、词数和预计阅读时间。' }
    ]
  },
  {
    id: 'date-reminder', category: '任务', title: '日期与提醒', summary: '用统一浮层设置时间、提醒和重复。', icon: Calendar,
    sections: [
      { title: '日期与提醒浮层', paragraphs: ['在任务详情中点开日期，会浮出统一的日期 / 时间 / 提醒 / 重复面板，按需展开：'], image: { src: '/screenshots/date-reminder.webp', alt: '日期与提醒浮层', caption: '日期浮层在任务详情中展开，时间/提醒/重复分组默认折叠，按需逐项展开' }, items: [
        '日历选择：顶栏可切换月份，并提供“今天”“明天”“下周”快捷按钮',
        '分组折叠：时间、提醒、重复三个分组默认收起，点击标题逐项展开；摘要实时显示在标题旁',
        '时间预设：08:00、09:00、10:00、12:00、14:00、18:00、20:00 一键设置；自定义可输入 930 或 09:30',
        '15 分钟微调：在时间区域用减号 / 加号按钮按 15 分钟步进调整',
        '提醒选项：当天、提前 5/15/30 分钟、提前 1 小时、提前 1 天、提前 1 周，以及自定义时间',
        '重复选项：不重复、每天、每个工作日、每周、每月、每年，以及自定义按周几组合',
        '清除与重置：所有字段都可以随时清除，不会偷偷写入默认值',
        '关闭方式：点击浮层外部、按 Esc 或点击“完成”都会保存当前选择'
      ], tip: '时间、提醒、重复三个区域互相独立，修改其中一项不会影响其他设置。' }
    ]
  },
  {
    id: 'list-views', category: '任务', title: '清单与视图', summary: '用清单、分组和视图组织、查找任务。', icon: Compass,
    sections: [
      { title: '清单的作用', paragraphs: ['清单是任务的容器，用于区分不同的工作或生活领域。系统默认提供：'], image: { src: '/screenshots/sidebar-overview.webp', alt: '左侧栏清单列表', caption: '左侧栏显示所有清单、分组和视图入口' }, items: [
        '收集箱：临时存放未分类的任务',
        '工作任务：与工作相关的任务',
        '个人备忘：个人生活相关的任务'
      ], tip: '建议根据实际需求创建清单，如”项目A”、”家庭事务”、”学习计划”等。' },
      { title: '创建和管理清单', paragraphs: ['在左侧栏“我的清单”标题右侧点击“+”，输入清单名称后按回车即可创建；也可以点击某个分组标题右侧的“+”，直接在该分组内创建。'], image: { src: '/screenshots/list-management.webp', alt: '新建清单', caption: '新建清单时直接输入名称，回车保存；清单可作为任务的归属容器' }, steps: [
        '点击“我的清单”右侧的加号，创建未分组清单；或点击某个分组右侧的加号，创建分组内清单。',
        '在清单名称输入框中输入名称，按 Enter 保存；按 Esc 取消。',
        '在清单上点击右侧的更多按钮，可重命名、移动至分组或删除清单。',
        '删除清单后，清单和其中任务会进入垃圾桶；可以恢复，也可以永久删除。'
      ] },
      { title: '创建和设置分组', paragraphs: ['分组只负责整理清单，不会改变任务本身。创建分组时可以设置名称、图标和强调色。'], image: { src: '/screenshots/group-management.webp', alt: '在左侧栏新建分组', caption: '新建分组对话框中可直接选择 Emoji 图标和强调色' }, steps: [
        '点击“我的清单”标题右侧的文件夹加号，打开新建分组对话框。',
        '输入分组名称，可点击左侧图标选择 Emoji。',
        '图标选择器按主题分类：工作、自然、娱乐、动物、饮食、交通、健康、居家、财务、沟通等；顶部搜索框支持中文关键词，如“会议”“猫”“咖啡”。',
        '选择预设强调色，或输入十六进制颜色；强调色只用于分组标题标识。',
        '点击确认创建分组；之后可通过分组右侧的更多按钮重命名或删除分组。'
      ], tip: '删除分组只会把其中清单移到“未分组”，不会删除清单和任务。' },
      { title: '把清单放入分组', paragraphs: ['已有清单可以通过菜单或拖动调整归属：'], image: { src: '/screenshots/sidebar-overview.webp', alt: '左侧栏中的清单与分组', caption: '左侧栏中可通过更多菜单或拖动手柄把清单移入目标分组' }, items: [
        '打开清单右侧更多菜单，选择“移动至分组…”，再选择目标分组或“未分组”',
        '拖动清单左侧的排序手柄，把清单拖到目标分组中',
        '拖动分组左侧的排序手柄，可以调整分组顺序',
        '点击分组标题可以折叠或展开其中的清单'
      ], tip: '分组是导航结构；任务的具体内容仍在各自清单中。' },
      { title: '视图说明', paragraphs: ['应用提供多种视图帮助你管理任务：'], image: { src: '/screenshots/today-view.webp', alt: '今日视图', caption: '今日视图聚焦当天需要推进的任务' }, items: [
        '今日：聚焦今天需要推进的任务，包括手动加入和今日到期的任务',
        '收集箱：临时存放未分类的任务，定期整理',
        '计划：按日期分组显示所有有日期的任务，包括已逾期、今天、明天、本周、以后',
        '重要：汇总所有高优先级、置顶和标记重要的任务',
        '已完成：查看所有已完成的任务',
        '垃圾桶：查看已删除的任务，可恢复或永久删除',
        '搜索：全文搜索任务标题、备注、标签和重复规则'
      ] },
      { title: '今日视图', paragraphs: ['今日视图聚焦当天需要推进的任务，包括：'], image: { src: '/screenshots/today-view.webp', alt: '今日视图', caption: '今日视图显示今天需要推进的任务' }, items: [
        '手动加入今日的任务',
        '今天到期的任务',
        '已逾期的任务（需要优先处理）'
      ], tip: '每天开始时先查看今日视图，明确当天要推进的事项。' },
      { title: '计划视图', paragraphs: ['计划视图按时间分组显示所有有日期的任务：'], image: { src: '/screenshots/planned-view.webp', alt: '计划视图', caption: '计划视图按时间分组显示任务' }, items: [
        '已逾期：需要优先处理的过期任务',
        '今天：今天到期的任务',
        '明天：明天到期的任务',
        '本周：未来7天内到期的任务',
        '以后：更远日期的任务'
      ] },
      { title: '重要视图', paragraphs: ['重要视图汇总所有需要重点关注的任务：'], image: { src: '/screenshots/important-view.webp', alt: '重要视图', caption: '重要视图汇总高优先级、置顶和标记重要的任务' }, items: [
        '高优先级任务（优先级3）',
        '置顶任务',
        '标记为重要的任务'
      ] },
      { title: '收集箱、已完成与垃圾桶', paragraphs: ['收集箱用于临时记录尚未整理的事项；已完成可用于回顾进展；误删任务会先进入垃圾桶，方便恢复。'], image: { src: '/screenshots/inbox-view.webp', alt: '收集箱视图', caption: '收集箱适合快速记录，之后再安排日期或清单' }, items: [
        '收集箱：临时存放还没分类的任务',
        '已完成：查看和回顾已完成任务',
        '垃圾桶：恢复误删任务，或将其永久删除'
      ] },
      { title: '搜索功能', paragraphs: ['使用 Ctrl+K（macOS 为 ⌘K）打开搜索，支持搜索：'], image: { src: '/screenshots/search.webp', alt: '搜索结果', caption: '搜索结果按关键词“报告”匹配，命中任务标题、备注或标签' }, items: [
        '任务标题',
        '备注内容',
        '标签',
        '重复规则'
      ], tip: '搜索结果实时更新，输入关键词即可筛选。' }
    ]
  },
  {
    id: 'focus-timer', category: '时钟与专注', title: '专注与花田', summary: '用今日成长保持专注，用长期花田回顾积累。', icon: Timer,
    sections: [
      { title: '专注工作台关注今天', paragraphs: ['进入"时钟 → 专注工作台"，选择专注方式和可选任务后即可开始。工作台只展示当前计时、今日花朵和今日目标，避免长期统计干扰当下。'], image: { src: '/screenshots/focus-workspace.webp', alt: '专注工作台', caption: '专注工作台默认展示今日花（小雏菊·种子）、今日目标与 3 个内置专注方式' }, items: [
        '中央大圆环：剩余时间和当前阶段（准备开始 / 专注中 / 休息中），可用方向键增减 5 分钟',
        '今日花朵：底部卡片显示当前选定的花种名称、所处阶段（种子 / 破土 / 舒叶 / 花苞 / 初绽 / 盛放）和今日目标进度 0 / 50 分钟',
        '专注方式：右上"专注方式"卡片列出所有可用的专注 profile（番茄专注 / 深度专注 / 自由时长，或你自己新增的自定义 profile）；点击切换',
        '本次专注：右上"本次专注"卡片可选一个未完成任务、最近任务，或直接不关联任务开始',
        '今日状态：右下卡片显示今日有效专注分钟、完成轮数、中断次数和可调整的今日目标（25 / 50 / 90 / 10–240 分钟自定义）',
        '右侧"回顾"按钮可一键跳到专注回顾页面',
        '番茄专注适合短冲刺，深度专注适合完整工作块，自由计时不设上限',
        '完成的有效专注分钟会让今日植物自然经历种子、破土、舒叶、花苞、初绽和盛放',
        '中断记录保留在专注回顾中，但不会增加花朵成长'
      ], tip: '每日目标是成长节奏，不是惩罚线；超出目标的专注仍会计入长期累计。' },
      { title: '桌面专注控制器：三种形态随你选', paragraphs: ['在"专注工作台"点击"打开桌面控制器"或专注进行中顶部的"显示桌面控制器"按钮，可以弹出一个独立的桌面小窗，让你在切换到其他应用时仍能看到进度、调整时间和完成本轮。'], image: { src: '/screenshots/settings-focus.webp', alt: '桌面专注控制器形态设置', caption: '在"设置 → 专注与休息"中可以切换桌面控制器的形态，并控制是否保持在最前面' }, items: [
        '轨道表盘：圆形进度表盘，剩余时间、阶段、暂停/继续、±5 分钟、完成本轮都集中在 232px 的圆里，适合喜欢仪表化视觉',
        '专注岛：紧凑常驻的窄条形态，顶部一行显示当前阶段与剩余时间，需要时再展开操作；适合放在屏幕边缘',
        '经典卡片：保留所有操作按钮的卡片形态，时间、暂停、完成、关闭等始终可见；适合需要随时调整的场景',
        '切换方式：打开"设置 → 专注与休息"，在"桌面专注控制器"中点选想要的形态卡片，下次开始专注时生效',
        '保持在最前面：同区域提供"控制器保持在最前面"开关；独立于专注完成提醒，可以单独控制',
        '控制器内操作：点击 −5 / +5 调整剩余时间（5 分钟步进），点击中间按钮暂停或继续，点击完成本轮直接结束，点击 × 关闭小窗',
        '样式：颜色、主题和专注主流程保持一致；不打断专注中选定的任务，关闭后下次还会按上次的形态出现'
      ], tip: '控制器只能在 Tauri 桌面环境下打开；浏览器或开发预览下点击会提示"当前环境暂不支持桌面专注控制器"。' },
      { title: '节律提醒按你的节奏跳出来', paragraphs: ['"时钟 → 节律提醒"是工作台之外、与专注计时完全独立的第二条时间线。专注中可以选择性暂停节律，节律到期不会打断你的专注。'], image: { src: '/screenshots/rhythm-workspace.webp', alt: '节律提醒', caption: '节律提醒中心按"现在 / 接下来"两层组织，最多同时开启 3 项' }, items: [
        '三种触发方式：按间隔（倒计时）、连续使用（累计键盘鼠标活跃时长）、固定时刻（每天几点）',
        '内置 6 个常用模板：护眼远望（20 分钟间隔）、补水（60 分钟）、起身活动（45 分钟活跃）、肩颈舒展（90 分钟活跃）、呼吸放松（120 分钟间隔）、今日收尾（17:45）',
        '最多同时开启 3 项：开启第 4 项时会提示替换，避免打扰过多',
        '工作时段 / 静默时段：每条提醒可以限定工作日、工作时段和静默时段；提供测试提醒按钮',
        '到点后的处置：完成、延后 5 分钟、跳过本次、今天不再提醒；同时间隔类进入下一轮',
        '暂停全部：顶部"暂停"按钮冻结所有运行中提醒；继续后从原有剩余时间接着运行',
        '自定义：可以基于模板或从零创建新提醒，自定义图标、颜色、提示内容、完成方式',
        '随机文案：每条提醒的标题与正文都支持一句随机的提示语；同一个提醒每次到期会从预设文案里随机挑，避免重复感',
        '后台到期：即使应用不在前台，节律提醒也会通过系统通知中心送达；点击通知可直接进入该提醒'
      ], tip: '"全局·专注中暂停节律提醒"是独立开关，可在设置里决定专注时是否同时暂停节律。' },
      { title: '专注回顾看清真实投入', paragraphs: ['"时钟 → 专注回顾"汇总专注和节律两类记录，从时间范围、趋势、单条记录三个角度看投入。'], image: { src: '/screenshots/focus-history.webp', alt: '专注回顾', caption: '专注回顾按今日 / 本周 / 本月 / 全部切换，新装状态下还没有任何记录时会显示空状态引导' }, items: [
        '时间范围：顶部切换今日 / 本周 / 本月 / 全部，下方所有统计和列表同步使用同一时间窗口',
        '摘要：当前范围内的专注轮数、有效分钟、完成率、中断率等汇总',
        '趋势：折线 / 柱状展示每日专注分钟和节律到点次数；可与上周 / 上月同口径对比',
        '专注记录：每条记录展示起止时间、专注方式、关联任务、结果（完成 / 放弃 / 中断）和一句可选备注',
        '节律记录：每条节律到点展示是哪条提醒、何时到期、当时的处置（完成 / 延后 / 跳过）',
        '详情面板：点击任意记录在右侧打开详情，可编辑备注、调整结果分类',
        '筛选与统计：按专注方式、按关联清单、按结果状态多维筛选，列表和上方统计同步刷新'
      ], tip: '专注回顾和专注成就使用同一份数据，但回顾聚焦"什么时候做了什么"，成就聚焦"留下了什么"。' },
      { title: '专注成就让长期投入可见', paragraphs: ['"时钟 → 专注成就"是独立的长期反馈页面，与工作台、节律、回顾平级。它回答"这些投入留下了什么"，不进入开始专注前的决策。'], image: { src: '/screenshots/focus-achievement.webp', alt: '专注成就', caption: '专注成就由花田总览、花种图鉴、成长徽章三个二级页签组成，新装状态下默认显示小雏菊·种子' }, items: [
        '花田总览：默认页，先展示当前年份的四季花田（12 个月聚合），再展示本月花圃（每天一株）',
        '花种图鉴：互动植物舞台 + 六阶段成长回放 + 主题花圃收藏。已解锁、下一可解锁、未解锁花种在同一页浏览',
        '12 种花按主题：晨光（小雏菊 / 郁金香 / 波斯菊 / 向日葵）、微风（虞美人 / 薰衣草 / 鸢尾花 / 百合）、暮色（绣球花 / 山茶花 / 牡丹 / 月光花）',
        '成长徽章：按"开始 / 积累 / 深入 / 多样"四类组织；首次盛放、累计盛放、累计有效专注、培养多花种等非连续里程碑',
        '历史收获：旧的蓝莓 / 草莓 / 番茄 / 西瓜 / 南瓜等果实奖励只读保留，不继续产生',
        '解锁机制：花种按累计有效专注分钟（0、60、180、360、600、900、1200、1800、2700、3900、5400、7200）逐步解锁；首次跨过门槛会播放收藏印章演出'
      ], tip: '可以当天尚未成长时切换花种；已有成长后切换只影响次日，避免数据反复改写。' },
      { title: '成长数据如何计算', paragraphs: ['花田从升级到当前版本后开始记录，不把过去的果实奖励自动折算为花朵。新完成记录不再生成果实，旧记录中的果实仍可在专注成就里查看。'], items: [
        '只有完成状态的专注阶段按实际整分钟计入成长',
        '花种按累计有效专注分钟逐步解锁；首次跨过门槛会在专注完成时出现收藏提示',
        '历史日会归档成长期花田；删除今天的专注记录会同步重算今日成长'
      ], tip: '开启系统"减少动态效果"后，植物与解锁演出会自动改用静态结果。' }
    ]
  },
  {
    id: 'settings', category: '设置与数据', title: '个性化设置', summary: '调整外观、任务显示、专注节奏、启动行为和通知反馈。', icon: Settings,
    sections: [
      { title: '外观与布局', paragraphs: ['在设置中可以调整应用的外观和三栏布局：'], image: { src: '/screenshots/settings-appearance.webp', alt: '外观设置', caption: '外观设置支持主题、密度和侧栏/详情面板开关' }, items: [
        '配色主题：青绿、海蓝、紫罗兰、石墨四种主题',
        '主题背景：让侧栏、任务区和详情区使用当前主题的低饱和背景',
        '信息密度：舒适模式和紧凑模式',
        '界面显示：侧栏和默认任务详情面板可独立开关，详情栏宽度也可拖动调整'
      ] },
      { title: '任务与清单显示', paragraphs: ['"任务与清单"用于控制已完成任务在列表和分组中的展示方式。'], items: [
        '列表模式显示已完成任务：控制普通列表底部的已完成区域',
        '分组模式下保留已完成任务：决定已完成任务留在原分组还是集中到底部',
        '默认显示已完成任务：进入分组模式时是否展开已完成项',
        '显示完成用时：在已完成主任务和子任务旁显示完成耗时'
      ], tip: '这些选项只影响展示，不会删除或改变任务数据。' },
      { title: '专注与休息', paragraphs: ['"专注与休息"集中管理桌面专注控制器、番茄节奏和休息安排。'], image: { src: '/screenshots/settings-focus.webp', alt: '专注与休息设置', caption: '专注与休息设置中可切换桌面控制器形态、调整番茄轮次和休息时长' }, items: [
        '桌面专注控制器：在"轨道表盘""专注岛""经典卡片"三选一，决定下次开始专注时弹出的桌面小窗形态',
        '控制器保持在最前面：开启后独立于专注完成提醒，控制器小窗始终置顶；关闭后跟随默认窗口层级',
        '完成几轮后长休息：番茄节奏下，每完成 N 轮普通专注插入一次长休息，然后从第 1 轮重新开始；可选 2 / 3 / 4 / 5 / 6 / 8 轮',
        '短休息时长：每轮普通专注结束后的休息时间，可选 3 / 5 / 10 / 15 分钟',
        '长休息时长：完成一个轮次周期后的休息时间，可选 10 / 15 / 20 / 30 分钟',
        '自动开始休息：开启后完成专注立即进入对应的短休息或长休息；关闭后需要手动点击"开始休息"'
      ], tip: '番茄节奏设置只影响番茄专注方式；深度专注和自由时长不会插入休息。' },
      { title: '启动与窗口行为', paragraphs: ['在"应用行为"中可以决定打开应用后的落点和关闭窗口时的行为。'], image: { src: '/screenshots/settings-behavior.webp', alt: '应用行为设置', caption: '应用行为支持设置默认启动视图、启动提示和关闭窗口行为' }, items: [
        '默认启动视图：今日、收集箱、计划或重要',
        '启动提示：开启后根据任务状态显示本地提示，可选择轻松、务实或鼓励风格',
        '关闭窗口：选择最小化到后台或直接退出应用；最小化后可从 Windows 通知区域或 macOS Dock/菜单栏恢复'
      ] },
      { title: '通知与操作反馈', paragraphs: ['“通知与反馈”把到期提醒和操作音效分开管理：'], image: { src: '/screenshots/settings-notifications.webp', alt: '通知与反馈设置', caption: '通知与反馈支持测试系统提醒，并按类别开关操作音效' }, items: [
        '任务与节律提醒：到期时通过 Windows toast 或 macOS 通知中心提醒',
        '专注完成提醒：应用在前台时显示完成弹层；失焦、最小化或隐藏时显示默认置顶、可拖动的完成弹窗，置顶可在设置中关闭',
        '提醒声音：任务提醒与专注完成可分别控制系统声音，并可发送对应的测试提醒',
        '操作音效：分别控制任务、清单、分组和拖动排序的提示音',
        '试听按钮：可单独试听完成、新增与恢复、标记与日期、排序指示线四类声音'
      ], tip: '系统通知仍需在操作系统的通知设置中允许易简清单。' }
    ]
  },
  {
    id: 'data-care', category: '设置与数据', title: '数据与维护', summary: '管理个人资料、附件、空间和本机恢复点。', icon: Database,
    sections: [
      { title: '数据维护入口', paragraphs: ['数据维护集中在“个人空间”中，而不是设置面板：'], image: { src: '/screenshots/profile-space.webp', alt: '个人空间主面板', caption: '个人空间主面板：昵称、头像和数据维护的总入口' }, items: [
        '个人空间 → 空间管理：扫描本机应用数据，按任务数据、已用图片、已用文件、待处理附件、清理站、个人资料、本机恢复点等分类显示；可一键把未引用附件移入清理站，并在双 Tab 浏览器中分页浏览、预览和永久删除',
        '清理站：查看、恢复或永久删除附件；任务和回收站中的引用会保留；永久删除前必须二次确认',
        '个人空间 → 数据与安全：创建、打开、恢复和删除本机恢复点'
      ], tip: '扫描只读取数据，不会自动修改任务或附件；清理站中的附件可以恢复，永久删除后无法找回。' },
      { title: '数据保存方式', paragraphs: ['易简清单采用本地优先的数据存储策略：'], items: [
        '任务和设置保存在本地 SQLite 数据库中',
        '无需注册账号，数据完全在本机，不提供云同步和协作',
        '自动保存，无需手动操作；大批量整理前可在个人空间创建恢复点',
        '图片附件单独存储，避免数据库过大'
      ] },
      { title: '个人资料与头像', paragraphs: ['点击左侧顶部的头像或昵称，打开个人空间 → 个人资料。这里可以修改本机显示的昵称和头像。'], image: { src: '/screenshots/avatar-picker.webp', alt: '头像选择器', caption: '头像选择器提供内置头像，也支持上传本地头像' }, steps: [
        '点击左侧顶部头像，进入个人空间。',
        '在个人资料页面点击头像，打开头像选择器。',
        '选择一个内置头像即可立即保存；也可以选择“上传本地头像”使用自己的图片。',
        '点击昵称输入框修改名称，输入完成后离开输入框或按 Enter 保存。'
      ], tip: '头像、昵称和个人空间资料只保存在当前设备。' },
      { title: '附件管理', paragraphs: ['在备注中添加的图片会作为附件保存：'], image: { src: '/screenshots/image-preview.webp', alt: '图片预览', caption: '点击图片可预览大图，支持左右切换' }, items: [
        '支持粘贴、拖放或选择文件上传图片',
        '图片保存在应用数据目录的附件文件夹中',
        '点击图片可预览大图；任务中有多张图片时可切换查看'
      ] },
      { title: '本机空间管理', paragraphs: ['“个人空间 → 空间管理”按需扫描本机数据，把应用占用的每一类文件分开统计，并提供安全的附件整理流程。'], image: { src: '/screenshots/space-management.webp', alt: '空间管理与附件维护', caption: '空间管理可扫描本机附件并设置垃圾桶保留时间' }, items: [
        '应用总占用：扫描后顶部会显示应用整体占用的存储空间，分类采用互斥口径，不会重复相加',
        '空间构成明细：可展开查看任务数据、已用图片、已用文件、待处理附件、清理站、个人资料、本机恢复点、其他应用数据等分类大小',
        '状态摘要：根据当前情况显示“可安全整理 X / 可释放 Y MB”或“清理站待处理 N 项”，并指出下一步建议',
        '待处理附件：未被任何任务、备注或回收站引用的附件；支持一键移入清理站',
        '清理站：暂存区内的文件仍可一键恢复；永久删除前必须二次确认',
        '失效引用：扫描发现任务或备注指向了不存在的文件时只做提示，不会自动修改原任务数据',
        '附件维护浏览器：双 Tab 切换“待处理 / 清理站”，每页 30 项分页展示，图片可直接预览',
        '垃圾桶保留：单独设置已删除任务和清单在垃圾桶里保留多久（7 / 30 / 60 / 90 / 180 / 365 天），到期自动清理'
      ], tip: '扫描只读取数据，不会修改或删除任何文件；附件不会在未确认的情况下被释放空间。' },
      { title: '本机恢复点', paragraphs: ['打开个人空间 → 数据与安全，可以为当前设备创建恢复点。恢复点包含任务、附件和头像，适合在大批量整理或安装更新前使用。'], image: { src: '/screenshots/profile-security.webp', alt: '数据与安全', caption: '数据与安全页面可创建、打开、恢复和删除本机恢复点' }, steps: [
        '点击“创建恢复点”，等待本机备份完成。',
        '需要回到旧状态时，选择恢复点并确认；应用会先创建一个“恢复前安全点”。',
        '不再需要的恢复点可以删除，不会影响当前正在使用的数据。'
      ], tip: '应用不上传数据；恢复点和任务数据都保存在本机。' },
      { title: '常见问题', paragraphs: ['如果遇到问题，可以尝试以下步骤：'], items: [
        '确认应用已更新到最新版本',
        '检查系统通知权限是否已授予',
        '重启应用解决临时问题',
        '检查磁盘空间是否充足'
      ], tip: '如果问题持续存在，可以记录操作步骤和截图，便于反馈和定位。' }
    ]
  },
  {
    id: 'shortcuts', category: '使用技巧', title: '快捷键', summary: '提高操作效率的快捷键。', icon: Keyboard,
    sections: [
      { title: '当前可用快捷键', paragraphs: ['以下快捷键已在应用中提供：'], items: [
        'Windows：Ctrl+K；macOS：⌘K。打开搜索（应用窗口处于前台时）',
        'N：聚焦快速添加任务；在不支持快速添加的视图中会切换到收集箱（不在输入框或编辑器中时）',
        'D：把当前选中且未完成的任务加入今日；已在今日时会提示当前状态',
        'Esc：关闭当前最上层的弹窗、面板或确认框'
      ] },
      { title: '编辑器快捷键', paragraphs: ['在富文本编辑器中：'], items: [
        'Windows：Ctrl+B 加粗、Ctrl+I 斜体',
        'macOS：⌘B 加粗、⌘I 斜体',
        'Esc：关闭链接输入或退出独立编辑状态'
      ], tip: '记住常用快捷键可以大幅提高工作效率。' }
    ]
  },
  {
    id: 'efficiency', category: '使用技巧', title: '高效使用', summary: '让任务管理更高效的实用建议。', icon: Sparkles,
    sections: [
      { title: '任务收集习惯', paragraphs: ['养成随时记录的习惯：'], items: [
        '想到事情立刻记录，不要担心分类',
        '使用收集箱作为临时存放点',
        '每天固定时间整理收集箱',
        '先记录，再安排，最后执行'
      ], tip: '收集箱是你的”大脑外挂”，把所有事情都记下来。' },
      { title: '任务拆分技巧', paragraphs: ['大任务容易让人拖延，拆分成小步骤更易执行：'], items: [
        '每个子任务应该是可执行的具体动作',
        '子任务完成时间建议在15-30分钟',
        '按执行顺序排列子任务',
        '完成一个子任务就勾选一个，获得成就感'
      ] },
      { title: '优先级管理', paragraphs: ['合理使用优先级避免任务堆积：'], items: [
        '高优先级：今天必须完成的重要任务',
        '中优先级：本周内需要完成的任务',
        '低优先级：可以稍后处理的任务',
        '不要把所有任务都设为高优先级'
      ], tip: '每天选择3件最重要的事情优先完成。' },
      { title: '定期回顾', paragraphs: ['定期回顾帮助你保持清晰：'], items: [
        '每天结束前花5分钟整理明天的任务',
        '每周回顾本周完成情况和下周计划',
        '每月检查清单结构是否合理',
        '清理已完成和不再需要的任务'
      ] },
      { title: '标签使用建议', paragraphs: ['标签是灵活的分类工具：'], items: [
        '使用简短的标签名，如”工作”、”紧急”',
        '一个任务可以有多个标签',
        '用标签标记上下文，如”电脑”、”电话”',
        '用标签标记能量级别，如”高能量”、”低能量”'
      ], tip: '标签和清单配合使用，可以实现多维度的任务管理。' }
    ]
  },
  {
    id: 'updates', category: '更新说明', title: '版本更新', summary: '查看每个版本带来什么新能力。', icon: Wrench,
    sections: [
      { title: 'v0.4.5 · 自建更新源与系统代理修复', paragraphs: ['更新通道更可靠：新增自建更新服务器，并修复系统代理环境下检查更新失败的问题：'], items: [
        '新增自建更新源（simpletodo.duqimeng.cn）：更新检查默认按「自建服务器优先、GitHub 兜底」自动选择可用源，国内网络环境下不再受 GitHub 访问波动影响',
        '「设置 → 关于与更新」新增更新源切换：可手动指定自建服务器或 GitHub，也可恢复自动选择',
        '修复系统代理读取：更新检查现在能识别 Windows 系统代理设置，此前系统代理环境下提示「更新服务暂时不可用」导致无法自动更新的问题已解决',
        '发布流程完善：发布时自动同步更新产物（安装包、签名、更新清单）到自建服务器，两端更新源保持同版本'
      ] },
      { title: 'v0.4.4 · 自动更新链路修复', paragraphs: ['修复了自动更新失败的问题，并完善发布与版本信息：'], items: [
        '修复自动更新失败根因：线上更新清单携带 UTF-8 BOM，客户端解析失败导致所有用户无法更新；已清除编码问题并加入发布自动校验，恢复 Windows 自动更新通道',
        '更新失败提示更明确：区分网络异常与更新数据格式异常，给出具体原因并引导到发布页手动更新',
        '「设置 → 关于与更新」版本信息修正：当前版本亮点与历史版本记录补全，与应用内帮助保持一致',
        '发布流程完善：新增 macOS 构建与发布任务、更新清单自动修复脚本，Windows 与 macOS 产物统一归档到同一 Release'
      ] },
      { title: 'v0.4.3 · 桌面控制器与体验升级', paragraphs: ['v0.4.3 正式发布，带来桌面专注控制器多形态、可调的专注与休息设置，并对空间管理、编辑器与任务体验做了升级：'], items: [
        '桌面专注控制器多形态：在"设置 → 专注与休息"中可切换"轨道表盘""专注岛""经典卡片"三种桌面小窗形态，新增"控制器保持在最前面"独立开关',
        '专注与休息设置：番茄轮次（2–8 轮）、短休息（3/5/10/15 分钟）、长休息（10/15/20/30 分钟）和"自动开始休息"全部可调',
        '轨道表盘精修：232px 紧凑矢量表盘，去掉 ±5 角标，暂停按钮顶对齐 dock，状态 / 副标题 / 剩余时间等辅助文字字号统一上调一档',
        '节律提醒随机文案：每条节律的标题与正文都支持一句随机提示语，避免重复感；后台到点通过系统通知中心送达',
        '节律提示窗：独立的桌面提醒窗，前后端任务可同时处理；提供延后、跳过、完成等处置',
        '退出时不再驻留托盘：直接退出后系统托盘图标会同步清理',
        '「个人空间 → 空间管理」重塑：新增"应用已占用"总览，按任务数据、已用图片、已用文件、待处理附件、清理站、个人资料、本机恢复点等分类展示',
        '附件维护浏览器升级：待处理 / 清理站双 Tab 切换，每页 30 项分页，图片可直接预览；永久删除前必须二次确认',
        '富文本编辑器扩充：撤销 / 重做、下划线、多色高亮、行内代码、代码块、表格、折叠块、任务引用、居中 / 左对齐和字符 · 词数 · 阅读时间状态栏；粘贴网址时自动识别为链接',
        '分组图标选择器重做：覆盖工作、自然、娱乐、动物、饮食、交通、健康、居家、财务、沟通等主题，顶部搜索框支持中文关键词',
        '任务日期浮层重设计：时间、提醒、重复三个分组默认折叠；时间区域提供 08:00、09:00、10:00、12:00、14:00、18:00、20:00 快捷预设；自定义支持输入 930 或 09:30，可用 − / + 按 15 分钟微调'
      ] },
      { title: 'v0.4.2 · 专注与花田升级', paragraphs: ['这次升级专注工作台、专注花田和图鉴，让完成专注能直观看到植物成长：'], items: [
        '专注工作台重构：突出当前计时、今日植物和今日目标，减少长期信息干扰',
        '专注花田与图鉴更新：统一花种成长阶段、舞台呈现与种植进度展示',
        '成长徽章与花田总览：补充阶段性成就、解锁信息和成长汇总',
        '完成专注会推动植物自然成长；旧果实奖励只做兼容展示，不再继续生成',
        '修复了自定义时长浮层与倒计时的视觉层级、花种切换时花盆位置 / 比例 / 舞台背景、专注页卡片边框与信息密度等体验问题'
      ] },
      { title: 'v0.4.1 · 时钟与节律上线', paragraphs: ['正式引入时钟模块、节律提醒和桌面控制器：'], items: [
        '新增时钟模块：支持番茄、深度专注、自由时长、休息阶段与完成奖励',
        '新增节律提醒：可按间隔、固定时刻或连续使用触发，本轮可暂停或 ±5 分钟微调',
        '后台到期时弹出原生置顶提醒窗；专注可使用可拖动、可置顶的桌面控制器',
        '新增专注与节律回顾：可查看趋势、筛选记录、展开详情和管理历史',
        '平台支持扩展：同时提供 Windows x64 NSIS 安装包和 macOS Intel（x64）DMG'
      ] },
      { title: 'v0.3.2 · 设置重组与手册完善', paragraphs: ['把设置、通知、窗口行为和任务详情整理得更顺手，并补齐了使用手册：'], items: [
        '设置、通知、窗口行为与任务详情重组：提醒、恢复点和数据维护入口更集中易用',
        '子任务进度在任务详情和卡片中保持一致；跨平台快捷键与弹层关闭行为更稳定',
        '补充场景化提示与操作音效（删除、撤销等结果型反馈）',
        '应用内使用手册、演示素材和本地优先的产品文档正式上线',
        '修复 macOS 操作音效与窗口事件兼容问题，修复删除清单后遗留任务分组与子任务进度显示问题',
        '应用内自动更新通道启用，可在 Windows / macOS 上接收下一版更新',
        '应用启动后自动检查更新：发现新版本时在"设置 → 关于与更新"提示，可下载安装或跳过指定版本；Windows 安装完成后应用会自动重新打开'
      ] },
      { title: 'v0.3.1 · 恢复点与个人空间', paragraphs: ['引入本机恢复点，并把个人空间扩展为完整的数据管理面板：'], items: [
        '新增本机恢复点：可创建、定位、恢复和删除；恢复前会自动先建一个安全点',
        '个人空间新增"数据与安全"分区；头像选择器支持悬停预览，并扩充了内置头像',
        '增加重复任务、逾期任务处理、发布前检查与常用快捷键',
        '窄中栏下把低频操作收纳到"更多"菜单，保留核心操作不被挤压',
        '完善本地数据迁移和备份保护，避免更新或手动安装时覆盖既有数据'
      ] },
      { title: 'v0.2.5 · 清单筛选与日期弹层', paragraphs: ['清单支持多条件筛选，日期与提醒的弹层用起来更顺手：'], items: [
        '清单支持按完成状态、日期、优先级组合筛选，列表与分组视图都生效',
        '完成记录可显示用时，并可在设置中关闭',
        '任务详情日期弹窗优化：时间、提醒、重复分组更清晰，支持快捷时间、原生时间选择与微调',
        '清单分组拖拽和"移动至分组"交互更稳定；移除了无效的清单置顶功能',
        '修复历史子任务缺少创建时间时的显示问题；完成主任务后未同步子任务的问题也已修复'
      ] },
      { title: 'v0.2.4 · 个人空间与头像', paragraphs: ['重构个人空间，集中管理头像、昵称、本地数据与数据安全入口：'], items: [
        '个人空间重构：头像与昵称、本地数据管理、空间概览、数据安全入口集中管理',
        '内置 18 个可选头像，支持本地上传、更换和更流畅的选择交互',
        '清单标题可直接切换清单；展示分组、任务与子任务完成进度，并提供悬浮详情',
        '主题背景可跟随配色，侧栏、详情页与折叠 Rail 的交互层级进一步细化',
        '当前版本仍聚焦本地个人任务管理；账号、云同步和协作入口尚未开放'
      ] },
      { title: 'v0.2.3 · 列表与子任务面板', paragraphs: ['重做子任务面板，让桌面端的任务提醒能稳定投递：'], items: [
        '优化任务列表、分组层级、标签展示与任务详情的阅读体验',
        '重做子任务面板：补充进度反馈、时间信息和更紧凑的操作布局',
        '修复桌面端任务提醒：应用运行或最小化到托盘时都能按时提醒，重启或从休眠恢复后会补发未投递的提醒',
        '统一 GitHub 发布规则，下载文件名改为英文'
      ] },
      { title: '0.2.2 · 任务详情与富文本', paragraphs: ['任务详情、属性编辑和备注富文本编辑都做了显著升级：'], items: [
        '优化任务详情、属性编辑、日期选择与图片预览',
        '完善分组配色、图标、拖拽与完成任务展示，降低分组阅读干扰',
        '新增应用内使用指南和全局搜索体验',
        '升级备注富文本编辑与图片大图查看'
      ] },
      { title: '0.2.1 · 任务分组与拖拽', paragraphs: ['清单首次支持分组视图和任务分组：'], items: [
        '清单支持分组视图和列表视图切换，可创建任务分组，并配置图标、颜色和折叠',
        '任务可归属到具体分组，支持跨分组拖拽',
        '完善本地附件数据管理；优化任务分组颜色验证'
      ] },
      { title: '后续计划', paragraphs: ['未来几个版本会继续在这些方向投入：'], items: [
        '继续完善本地任务管理体验',
        '补充新功能对应的使用说明和截图',
        '优化附件管理与数据维护体验'
      ], tip: '每个版本发布后这里都会同步更新。' }
    ]
  }
]

const filteredDocuments = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return documents
  return documents.filter((document) => JSON.stringify(document).toLowerCase().includes(keyword))
})
const groupedDocuments = computed(() => {
  const groups = new Map()
  filteredDocuments.value.forEach((document) => {
    if (!groups.has(document.category)) groups.set(document.category, [])
    groups.get(document.category).push(document)
  })
  return [...groups].map(([category, documents]) => ({ category, documents }))
})
const activeDocument = computed(() => documents.find((document) => document.id === activeId.value) || documents[0])

function selectDocument(id) {
  activeId.value = id
  activeSectionTitle.value = activeDocument.value.sections[0]?.title || ''
  nextTick(() => articleRef.value?.scrollTo({ top: 0, behavior: 'smooth' }))
}

function scrollToSection(title) {
  activeSectionTitle.value = title
  const sections = articleRef.value?.querySelectorAll('.help-center__section') || []
  const target = [...sections].find((section) => section.querySelector('h2')?.textContent === title)
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function syncActiveSection() {
  const article = articleRef.value
  if (!article) return
  const sections = [...article.querySelectorAll('.help-center__section')]
  const current = sections.filter((section) => section.offsetTop - article.scrollTop <= 40).at(-1) || sections[0]
  activeSectionTitle.value = current?.querySelector('h2')?.textContent || ''
}

function matchSummary(document) {
  const keyword = query.value.trim()
  if (!keyword) return document.summary
  const section = document.sections.find((item) => JSON.stringify(item).toLowerCase().includes(keyword.toLowerCase()))
  return section ? `命中：${section.title}` : document.summary
}

watch(() => store.helpCenterOpen, (visible) => {
  if (visible) nextTick(() => {
    panelRef.value?.focus()
    activeSectionTitle.value = activeDocument.value.sections[0]?.title || ''
  })
})

watch(filteredDocuments, (documents) => {
  if (documents.length && !documents.some((document) => document.id === activeId.value)) selectDocument(documents[0].id)
})
</script>
