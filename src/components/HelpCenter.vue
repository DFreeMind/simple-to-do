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
import { BookOpenCheck, Calendar, Compass, Database, Keyboard, Maximize2, Rocket, Search, Settings, Sparkles, Wrench, X } from 'lucide-vue-next'
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
      { title: '你可以管理什么', paragraphs: ['易简清单把日常安排拆成几类对象。先分清它们的作用，再决定任务放在哪里：'], image: { src: '/screenshots/sidebar.webp', alt: '应用功能入口总览', caption: '左侧栏集中放置视图、清单、分组、已完成、垃圾桶和使用指南' }, items: [
        '任务：要完成的一件事，可以有日期、提醒、优先级、标签、子任务和备注',
        '清单：任务的容器，例如工作任务、家庭采购、阅读学习；一个任务属于一个清单',
        '分组：清单的上一级目录，例如把“工作任务”和“会议记录”放入“工作”',
        '视图：从不同角度查看同一批任务，例如今日、计划、重要、已完成和垃圾桶',
        '个人空间：管理昵称、头像、附件维护、本机恢复点和设备安全'
      ] },
      { title: '常用入口在哪里', paragraphs: ['桌面端打开后，左侧是导航和清单，中间是任务列表，右侧是选中任务的详情。没有选中任务时，右侧会显示空状态；这不是额外的任务栏。'], items: [
        '左侧顶部：头像和昵称，点击进入个人空间；齿轮进入设置',
        '左侧主要视图：今日、收集箱、计划、重要',
        '我的清单：通过“+”新建清单，通过文件夹加号新建分组',
        '左侧底部：已完成、垃圾桶和使用指南',
        '任务详情：点击任务后出现，可编辑属性、子任务、备注和附件'
      ], tip: '不确定从哪里开始时，先在收集箱创建任务，再通过任务详情或拖动整理。' },
      { title: '当前不包含的功能', paragraphs: ['当前版本是本地个人任务管理工具：'], items: [
        '不需要账号，数据保存在本机',
        '暂不提供云同步、多人协作、团队成员和在线连接',
        '不包含完整日历、习惯、番茄钟或四象限管理'
      ], tip: '个人空间中的“连接与协作”是预留入口，目前不会改变本地任务数据。' }
    ]
  },
  {
    id: 'task-guide', category: '使用手册', title: '任务管理详解', summary: '创建、编辑和管理任务的完整指南。', icon: BookOpenCheck,
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
        '提醒：在日期选择器中设置提醒时间，应用会发送系统通知',
        '优先级：高、中、低三级，高优先级任务会在”重要”视图中显示',
        '清单：将任务移动到其他清单',
        '标签：添加多个标签便于分类和搜索',
        '子任务：拆分为可完成的小步骤，支持拖动排序',
        '备注：支持富文本编辑，包括标题、列表、链接、图片等'
      ] },
      { title: '任务操作', paragraphs: ['任务支持多种快捷操作：'], items: [
        '置顶：将重要任务固定在列表顶部',
        '标记重要：高亮显示并汇总到”重要”视图',
        '加入今日：将任务添加到今天的待办中',
        '完成：点击复选框标记完成，支持撤销',
        '删除：移入垃圾桶，可设置自动清理天数'
      ], tip: '已完成的任务会保留记录，方便在“已完成”视图中回顾。' },
      { title: '子任务管理', paragraphs: ['子任务适合将大任务拆分为可执行的小步骤。在详情面板的”子任务”区域：'], image: { src: '/screenshots/subtasks.webp', alt: '子任务管理', caption: '子任务支持拖动排序和完成状态切换' }, items: [
        '点击”添加子任务”输入子任务标题',
        '拖动子任务左侧的排序手柄调整顺序',
        '点击复选框标记子任务完成',
        '详情卡片顶部显示子任务完成进度'
      ] },
      { title: '富文本备注', paragraphs: ['备注支持丰富的格式，适合记录详细信息：'], image: { src: '/screenshots/rich-editor.webp', alt: '富文本编辑器', caption: '富文本编辑器支持多种格式和图片插入' }, items: [
        '标题：使用 H1-H3 组织内容结构',
        '文本格式：加粗、斜体、删除线',
        '列表：无序列表、编号列表、待办列表',
        '链接：添加超链接，点击可直接打开',
        '引用：突出显示重要信息',
        '分割线：分隔不同内容区域',
        '图片：粘贴或上传图片，支持预览和放大查看'
      ], tip: '点击编辑器右上角的放大按钮，可进入全屏编辑模式。' }
    ]
  },
  {
    id: 'organize', category: '使用手册', title: '清单与分组', summary: '组织和管理你的任务清单。', icon: Compass,
    sections: [
      { title: '清单的作用', paragraphs: ['清单是任务的容器，用于区分不同的工作或生活领域。系统默认提供：'], image: { src: '/screenshots/sidebar.webp', alt: '左侧栏清单列表', caption: '左侧栏显示所有清单和分组' }, items: [
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
      { title: '创建和设置分组', paragraphs: ['分组只负责整理清单，不会改变任务本身。创建分组时可以设置名称、图标和强调色。'], image: { src: '/screenshots/group-management.webp', alt: '在左侧栏新建分组', caption: '在“我的清单”标题右侧点击文件夹加号，直接输入分组名称' }, steps: [
        '点击“我的清单”标题右侧的文件夹加号，打开新建分组对话框。',
        '输入分组名称，可点击左侧图标选择 Emoji。',
        '选择预设强调色，或输入十六进制颜色；强调色只用于分组标题标识。',
        '点击确认创建分组；之后可通过分组右侧的更多按钮重命名或删除分组。'
      ], tip: '删除分组只会把其中清单移到“未分组”，不会删除清单和任务。' },
      { title: '把清单放入分组', paragraphs: ['已有清单可以通过菜单或拖动调整归属：'], items: [
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
    ]
  },
  {
    id: 'views', category: '使用手册', title: '视图与筛选', summary: '使用不同视图管理任务。', icon: Calendar,
    sections: [
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
      { title: '搜索功能', paragraphs: ['使用 Ctrl+K（macOS 为 ⌘K）打开搜索，支持搜索：'], image: { src: '/screenshots/search.webp', alt: '搜索功能', caption: '搜索功能支持全文搜索任务' }, items: [
        '任务标题',
        '备注内容',
        '标签',
        '重复规则'
      ], tip: '搜索结果实时更新，输入关键词即可筛选。' }
    ]
  },
  {
    id: 'settings', category: '使用手册', title: '设置与个性化', summary: '自定义应用外观和行为。', icon: Settings,
    sections: [
      { title: '外观与布局', paragraphs: ['在设置中可以调整应用的外观和三栏布局：'], image: { src: '/screenshots/settings-appearance.webp', alt: '外观设置', caption: '外观设置支持主题、密度和侧栏/详情面板开关' }, items: [
        '配色主题：青绿、海蓝、紫罗兰、石墨四种主题',
        '主题背景：让侧栏、任务区和详情区使用当前主题的低饱和背景',
        '信息密度：舒适模式和紧凑模式',
        '界面显示：侧栏和默认任务详情面板可独立开关，详情栏宽度也可拖动调整'
      ] },
      { title: '任务与清单显示', paragraphs: ['“任务与清单”用于控制已完成任务在列表和分组中的展示方式。'], items: [
        '列表模式显示已完成任务：控制普通列表底部的已完成区域',
        '分组模式下保留已完成任务：决定已完成任务留在原分组还是集中到底部',
        '默认显示已完成任务：进入分组模式时是否展开已完成项',
        '显示完成用时：在已完成主任务和子任务旁显示完成耗时'
      ], tip: '这些选项只影响展示，不会删除或改变任务数据。' },
      { title: '启动与窗口行为', paragraphs: ['在“应用行为”中可以决定打开应用后的落点和关闭窗口时的行为。'], image: { src: '/screenshots/settings-behavior.webp', alt: '应用行为设置', caption: '应用行为支持设置默认启动视图、启动提示和关闭窗口行为' }, items: [
        '默认启动视图：今日、收集箱、计划或重要',
        '启动提示：开启后根据任务状态显示本地提示，可选择轻松、务实或鼓励风格',
        '关闭窗口：选择最小化到后台或直接退出应用；最小化后可从 Windows 通知区域或 macOS Dock/菜单栏恢复'
      ] },
      { title: '通知与操作反馈', paragraphs: ['“通知与反馈”把到期提醒和操作音效分开管理：'], image: { src: '/screenshots/settings-notifications.webp', alt: '通知与反馈设置', caption: '通知与反馈支持测试系统提醒，并按类别开关操作音效' }, items: [
        '系统提醒通知：到期时通过 Windows toast 或 macOS 通知中心提醒',
        '提醒声音：控制系统提醒是否播放声音，并可发送测试提醒检查权限',
        '操作音效：分别控制任务、清单、分组和拖动排序的提示音',
        '试听按钮：可单独试听完成、新增与恢复、标记与日期、排序指示线四类声音'
      ], tip: '系统通知仍需在操作系统的通知设置中允许易简清单。' },
      { title: '数据与维护入口', paragraphs: ['数据维护集中在“个人空间”中，而不是设置面板：'], image: { src: '/screenshots/space-management.webp', alt: '空间管理与附件维护', caption: '个人空间的空间管理支持附件扫描、清理站和垃圾桶保留时间' }, items: [
        '个人空间 → 空间管理：设置垃圾桶保留时间，扫描未引用附件并移入清理站',
        '清理站：查看、恢复或永久删除附件；任务和回收站中的引用会保留',
        '个人空间 → 数据与安全：创建、打开、恢复和删除本机恢复点'
      ], tip: '清理站中的附件可以恢复；永久删除后无法找回。' }
    ]
  },
  {
    id: 'shortcuts', category: '使用手册', title: '快捷键', summary: '提高操作效率的快捷键。', icon: Keyboard,
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
    id: 'data', category: '数据与维护', title: '数据管理', summary: '了解数据保存和附件管理。', icon: Database,
    sections: [
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
      { title: '数据维护', paragraphs: ['在“个人空间 → 空间管理”中可以：'], image: { src: '/screenshots/space-management.webp', alt: '空间管理与附件维护', caption: '空间管理可扫描本机附件并设置垃圾桶保留时间' }, items: [
        '查看未引用附件：检查是否有孤立的附件文件',
        '清理站：查看已删除的清单和附件',
        '恢复文件：从清理站恢复误删的文件',
        '永久删除：彻底清理不需要的文件'
      ], tip: '定期清理未引用附件可以释放磁盘空间。' },
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
    id: 'tips', category: '使用技巧', title: '高效使用技巧', summary: '让任务管理更高效的实用建议。', icon: Sparkles,
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
    id: 'updates', category: '更新说明', title: '版本更新', summary: '查看最新的功能改进。', icon: Wrench,
    sections: [
      { title: '当前版本 v0.3.1', paragraphs: ['本版本聚焦本地数据安全、日常整理和桌面端体验：'], items: [
        '新增本机恢复点：支持创建、打开、恢复和删除恢复点，恢复前自动创建安全点',
        '新增附件维护：扫描未引用附件，支持移入清理站、恢复和永久删除',
        '完善重复任务、逾期处理、提醒通知和常用快捷键说明',
        '优化主题背景、信息密度、侧栏折叠、详情栏宽度和个人空间体验',
        '统一备注图片预览入口，并继续修复日期选择和主题适配细节'
      ] },
      { title: '功能路线图', paragraphs: ['后续版本计划包含：'], items: [
        '继续完善本地任务管理体验',
        '补充新功能对应的使用说明和截图',
        '优化附件管理与数据维护体验'
      ], tip: '每次更新后可从这里快速了解功能变化。' }
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
