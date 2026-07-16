export const DAILY_PROMPT_STYLES = [
  { id: 'calm', label: '轻松', description: '温和留白，不催促' },
  { id: 'practical', label: '务实', description: '清楚直接，聚焦下一步' },
  { id: 'encouraging', label: '鼓励', description: '多一点元气和肯定' }
]

const COPY = {
  calm: {
    todayEmpty: {
      title: ['今天留白，也是一种安排', '今天的页还很安静', '清单刚好给你留了位置', '今天可以从容一点', '一张干净的今日页', '今天还没有被任务填满', '先不急，今天才刚开始', '今天的第一笔，等你落下', '今日页正在晒太阳', '今天有一小段空白时间'],
      text: ['挑一件真正想推进的事，慢慢开始就好。', '把脑中盘旋的那件小事写下来，剩下的交给清单。', '不必排满，把最重要的一件放进今天。', '先给今天一个方向，哪怕只有一件事。', '空白不是落后，是可以自主安排的余地。', '先记录，再决定什么时候做；不用一次想清所有事。', '一件小事就能让今天启动。', '留一点余裕，事情反而更容易往前走。', '从最不费力的一步开始，也很不错。', '把想做的事写下来，它就不必一直占着脑子。']
    },
    todayFocus: {
      eyebrow: ['把注意力放回眼前这一件事。', '不必同时做好所有事，先做好下一件。', '今天的节奏，由你来定。', '慢一点没关系，方向对就好。', '先完成，再把心腾出来。', '把清单当作扶手，不是鞭子。', '今天只需要向前一点点。', '有条理地做，事情会自己变轻。', '先看最重要的，再看其他。', '给今天留一点专注的空间。'],
      emptyHint: ['完成得很干净，接下来给自己留一点时间。', '今日事项已清空，慢慢享受这份从容。', '这一页已经很轻了，做得不错。', '今天的任务告一段落，先不用急着找下一件。', '清单安静下来，说明你已经推进了不少。']
    },
    overdue: ['有些事晚一点也没关系，先重新排个顺序。', '逾期不是判决书，把最要紧的一件放回今天。', '先处理眼前能动的一步，其他可以再安排。', '任务多的时候，温柔地重排比硬扛更有效。', '把已过期的事看成提醒，而不是责备。', '今天先救回一件事，节奏就会回来。', '重新安排，不等于失败；这是清单该做的事。', '别和昨天较劲，先替今天腾出一点空间。'],
    inbox: ['灵感先放这儿，脑子可以先下班。', '先收下，不急着给每件事找位置。', '把零散念头放进收集箱，稍后再整理。', '想到就记，安排可以晚一点再做。', '这里适合暂存，不适合自责。', '先把事情从脑中挪到纸面上。'],
    planned: ['日程还很松，给真正重要的事留位置。', '未来尚未排满，正好从一件事开始。', '要做的事有了日期，心里会更踏实。', '先定一个可实现的时间，不必把未来塞满。', '计划不是束缚，是给未来的自己一盏小灯。'],
    completion: ['最后一件也完成了，今天可以安心收尾。', '今日清单清爽落地，给自己一点掌声。', '这一页已经完成使命，剩下的时间归你。', '收工得很漂亮，别忘了休息一下。', '最后一项落下，今天的节奏刚刚好。', '清单清空，不代表继续加码；休息也算安排。', '今天的任务告一段落，辛苦了。', '完成得很安静，也很了不起。']
  },
  practical: {
    todayEmpty: {
      title: ['今天从一件重要的事开始', '今日清单等待第一项', '今天还没有待办', '先确定今天的优先事项', '把下一步写下来', '今日任务尚未安排', '今天可以先定一个目标', '一件任务，就是一个清晰起点', '今日页已准备好', '先处理最值得推进的事'],
      text: ['添加一个今日任务，完成后再决定下一件。', '把需要推进的事项放进今天，避免它继续占用注意力。', '先写下一个可执行动作，而不是一个模糊目标。', '从截止日期、重要任务或收集箱里挑一项。', '任务不必多，关键是知道下一步做什么。', '先记录，后排序；清单会帮你保留上下文。', '给今天一个明确起点，后续安排会更顺。', '选一项能在今天推进的任务即可。', '把今天最重要的一步放到这里。', '先完成小的一步，再处理更复杂的事。']
    },
    todayFocus: {
      eyebrow: ['聚焦今天真正要推进的事。', '先处理优先级最高的一项。', '按顺序推进，比反复切换更有效。', '今天的任务已经明确，开始下一步。', '清单负责记忆，你只需要执行。', '先完成可完成的，再处理复杂的。', '把任务拆小，进度会更清楚。', '今天的重点已经在这里。', '一次只推进一件事。', '完成一项，就少一项心事。'],
      emptyHint: ['今日任务已完成；需要时再从建议中加入下一项。', '当前没有待办，下一步可整理收集箱或安排计划。', '今日页已清空，先检查是否有需要重新安排的任务。', '今天的任务已结束，后续事项可留给明天。', '完成当前计划后，不必立刻补满清单。']
    },
    overdue: ['有逾期任务：先选一项重新安排到可执行的时间。', '先处理截止日期最早的一项，避免问题继续堆积。', '逾期任务需要新的计划，不需要重复提醒。', '把不能今天完成的任务改期，保留真实的安排。', '优先确认范围和下一步，再决定是否继续保留今天。', '先解决一项逾期，清单就会恢复可控。', '从最重要或最容易推进的一项开始重排。', '给逾期任务一个新日期，计划才会重新可信。'],
    inbox: ['把临时想法收进这里，整理留到合适的时候。', '收集箱适合记录，不要求立刻分类。', '先捕捉事项，避免遗漏；稍后再设日期。', '临时任务先放这里，之后再决定优先级。', '记录比记住更可靠。', '把下一件想到的事写下来。'],
    planned: ['给任务设置日期后，它会出现在这里。', '计划从一个可信的截止日期开始。', '安排未来任务时，先预留真实可用的时间。', '日期帮助排序，不必给每件事都设期限。', '先安排有明确时间要求的事项。'],
    completion: ['今日最后一项已完成，计划按预期收尾。', '今日清单已完成；下一步可以休息或整理明天。', '今天的任务已清空，进度已保存。', '最后一项完成，今天的工作可以结束了。', '今日目标完成，剩余时间可自由安排。', '清单归零，说明今天的安排已闭环。', '今日事项已处理完毕，明天再继续。', '最后一项已完成，别忘了给明天留出余量。']
  },
  encouraging: {
    todayEmpty: {
      title: ['今天，值得从一件小事开始', '给今天一个漂亮的开场', '今日清单等你点亮', '今天的第一步，会很有分量', '来，把今天启动一下', '今日舞台已经搭好', '今天可以做成一件好事', '先把第一颗小石子推起来', '今日任务席位虚位以待', '给未来的自己一个好消息'],
      text: ['挑一件最想完成的事，今天的故事就从这里开始。', '不需要惊天动地，完成一小步也很酷。', '写下第一项，让“等会儿再说”失去藏身处。', '从收集箱挑一个出来，给它一个正式出场。', '今天的主角可以只有一件事。', '开始得小一点，成就感会来得早一点。', '先把能赢的一局拿下。', '把想做的事放进今天，给它一个实现的机会。', '今天也许很忙，但总能为重要的事留一格。', '一条任务，就是给自己发出的行动邀请。']
    },
    todayFocus: {
      eyebrow: ['今天的进度条，等你轻轻往前推。', '每完成一项，心里就空出一点位置。', '别小看下一步，它会把事情带起来。', '今天的你，适合完成一点厉害的小事。', '先拿下一项，成就感马上到账。', '清单不是 Boss 战，逐项通关就好。', '你已经在路上了，接着推进这一件。', '把一件事做完，就是很棒的超能力。', '今天不求全能，只求前进。', '动起来以后，事情往往没那么可怕。'],
      emptyHint: ['今天已经通关，奖励是一段不被任务追着跑的时间。', '今日清单清空，恭喜解锁一点自由。', '今天的任务全数完成，漂亮收尾。', '这一页的勾勾很整齐，值得开心一下。', '今日目标已达成，剩下的时间请随意使用。']
    },
    overdue: ['有几件事迟到了，但你可以让它们重新上车。', '逾期任务不用躲，先挑最容易救回的一件。', '计划有时会打个盹，叫醒它就行。', '把一件逾期任务重新安排好，就是扳回一城。', '不必一口气清零，先赢下眼前这一项。', '今天先处理一件，明天的你会来点赞。', '任务晚点到没关系，重新定个可靠的时间。', '清单不是考卷，重排就是它的修正功能。'],
    inbox: ['想到的事先停靠这里，灵感不用排队。', '收集箱是灵感候车厅，先上车再说。', '把脑内弹幕放进这里，稍后慢慢挑。', '临时想法已准备好，等你哪天把它点亮。', '先抓住念头，整理的事交给之后的你。', '灵感到站，请在这里下车。'],
    planned: ['未来的空格还在，给好事情预留一个座位。', '给任务一个日期，它就有了准时出现的机会。', '明天的你会感谢今天做的这点安排。', '安排不是把未来塞满，是把重要的事提前照亮。', '挑一件未来要做的事，给它发一张日历邀请。'],
    completion: ['最后一项拿下，今天的你很能打。', '今日清单全绿，恭喜完成漂亮一局。', '最后一个勾出现了：今日任务已通关。', '今天的待办已清空，掌声可以有。', '收尾成功，剩下的时间是你的奖励。', '这一页的任务都被你解决了，厉害。', '今天的进度条拉满，值得高兴一下。', '最后一项完成，今日 MVP 就是你。']
  }
}

const TIME_LEADS = {
  calm: {
    morning: ['早上好，', '晨光正好，', '新的一天开始了，'],
    afternoon: ['下午好，', '午后的节奏慢一点也没关系，', '现在继续也正合适，'],
    evening: ['傍晚好，', '今天还剩一点时间，', '晚些时候，'],
    night: ['晚上好，', '夜色已深，', '今天辛苦了，']
  },
  practical: {
    morning: ['早上好，', '今天开始了，', '现在适合确定优先事项，'],
    afternoon: ['下午好，', '现在适合推进下一步，', '今天仍有可用时间，'],
    evening: ['傍晚好，', '今天进入收尾阶段，', '剩余时间适合处理一件小事，'],
    night: ['晚上好，', '今天接近尾声，', '现在适合整理或安排明天，']
  },
  encouraging: {
    morning: ['早上好，', '今天的舞台刚亮灯，', '新一天，来拿下一项吧，'],
    afternoon: ['下午好，', '今天还有半场可以发挥，', '现在继续推进，正是好时候，'],
    evening: ['傍晚好，', '今天还有一次漂亮收尾的机会，', '剩余时间也能完成一件好事，'],
    night: ['晚上好，', '今天快要谢幕了，', '把最后一点心事放进清单吧，']
  }
}

const COUNT_HINTS = {
  calm: ['今天有 1 件事，慢慢做好它。', '今天有 {count} 件事，不必同时惦记。', '今天有 {count} 件待办，按自己的节奏来。'],
  practical: ['今天有 1 件待办，完成它就够了。', '今天有 {count} 件待办，先处理优先级最高的一项。', '今天有 {count} 件任务，逐项推进即可。'],
  encouraging: ['今天有 1 个小目标，拿下它！', '今天有 {count} 件待办，今天的你能逐个解决。', '今天有 {count} 个待办，先赢下第一项。']
}

const DAY_MS = 24 * 60 * 60 * 1000

function dayIndex(date = new Date()) {
  const local = new Date(date)
  return Math.floor(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()) / DAY_MS)
}

function hash(text) {
  return [...text].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7)
}

function choose(items, salt, date) {
  if (!items?.length) return ''
  return items[(dayIndex(date) + hash(salt)) % items.length]
}

function tone(style) {
  return COPY[style] ? style : 'practical'
}

function timeOfDay(date) {
  const hour = new Date(date).getHours()
  if (hour < 11) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

function withTimeLead(message, style, date) {
  return `${choose(TIME_LEADS[style][timeOfDay(date)], `time:${style}`, date)}${message}`
}

function countHint(openCount, style, date) {
  const index = openCount === 1 ? 0 : Math.min(2, Math.floor(openCount / 5) + 1)
  return COUNT_HINTS[style][index].replace('{count}', String(openCount))
}

export function getTodayGuidance({ style, date = new Date(), openCount = 0, overdueCount = 0 }) {
  const selectedTone = tone(style)
  const copy = COPY[selectedTone]
  if (openCount === 0) {
    return {
      eyebrow: withTimeLead(
        overdueCount > 0 ? choose(copy.overdue, `overdue:${selectedTone}`, date) : choose(copy.todayFocus.emptyHint, `today-done:${selectedTone}`, date),
        selectedTone,
        date
      ),
      title: choose(copy.todayEmpty.title, `today-empty-title:${selectedTone}`, date),
      text: choose(copy.todayEmpty.text, `today-empty-text:${selectedTone}`, date),
      state: overdueCount > 0 ? 'overdue' : 'empty'
    }
  }
  if (overdueCount > 0) {
    return { eyebrow: withTimeLead(choose(copy.overdue, `overdue:${selectedTone}`, date), selectedTone, date), state: 'overdue' }
  }
  return {
    eyebrow: `${withTimeLead(choose(copy.todayFocus.eyebrow, `today-focus:${selectedTone}`, date), selectedTone, date)} ${countHint(openCount, selectedTone, date)}`,
    state: 'focus'
  }
}

export function getViewEmptyMessage({ view, style, date = new Date() }) {
  const selectedTone = tone(style)
  const copy = COPY[selectedTone]
  const texts = {
    inbox: copy.inbox,
    planned: copy.planned
  }
  const text = texts[view] ? choose(texts[view], `${view}:${selectedTone}`, date) : ''
  return text ? { text } : null
}

export function getCompletionMessage({ style, date = new Date() }) {
  const selectedTone = tone(style)
  return choose(COPY[selectedTone].completion, `completion:${selectedTone}`, date)
}
