<script setup lang="ts">
import { ref, computed } from 'vue'
import { QUIZ, type QuizQuestion } from '../../comic/questions'

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface DealtQuestion {
  item: QuizQuestion
  options: { text: string; correct: boolean }[]
  answeredIndex: number | null
}

const picked = ref<DealtQuestion[]>(
  (['easy', 'medium', 'hard'] as const).flatMap((d) => {
    const pool = QUIZ.filter((q) => q.d === d)
    if (pool.length < 5) {
      console.warn(
        `ARCUS exam: the "${d}" pool has only ${pool.length} question(s); ` +
        'the exam expects at least 5 — add more to questions.ts.'
      )
    }
    return shuffle(pool)
      .slice(0, 5)
      .map((item) => ({
        item,
        options: shuffle(item.o.map((text, i) => ({ text, correct: i === item.a }))),
        answeredIndex: null as number | null,
      }))
  })
)

const answeredCount = computed(() => picked.value.filter((q) => q.answeredIndex !== null).length)
const score = computed(
  () => picked.value.filter((q) => q.answeredIndex !== null && q.options[q.answeredIndex].correct).length
)
const allAnswered = computed(() => answeredCount.value === picked.value.length)

function answer(q: DealtQuestion, optionIndex: number) {
  if (q.answeredIndex !== null) return
  q.answeredIndex = optionIndex
}

const rank = computed(() => {
  const s = score.value
  if (s <= 5) return { title: '🆕 New Hire', line: 'Everyone starts on day one. Scroll up — the roster’s worth a second look.' }
  if (s <= 9) return { title: '📋 Junior Teammate', line: 'You’re picking up the board. Flip the fact cards you missed and you’ll be running tickets solo.' }
  if (s <= 12) return { title: '🎯 Full-Stack Teammate', line: 'You know the roster, the board, and the rules of the pipeline. Go run a story.' }
  return { title: '🏆 Honorary Lead', line: 'Four gates, seven teammates, zero mistakes. Lucie would hand you the board.' }
})
</script>

<template>
  <section class="exam" aria-label="The ARCUS Exam">
    <h2>The ARCUS Exam</h2>
    <p class="exam-intro">
      Fifteen questions dealt from a pool of thirty-four — five easy, five medium, five hard,
      answer order shuffled — so every visit is a fresh paper. Answer each one to see the
      explanation; your rank is stamped at the end. Wrong answers teach the most, and reloading
      deals you a new exam.
    </p>
    <div class="scorebar" aria-live="polite">SCORE {{ score }} / {{ picked.length }} · ANSWERED {{ answeredCount }}</div>

    <div class="qcard" v-for="(q, qi) in picked" :key="qi" :class="{ answered: q.answeredIndex !== null }">
      <div class="qtop">
        <span class="qnum">Q{{ qi + 1 }}</span>
        <span class="diff" :class="q.item.d">{{ q.item.d }}</span>
      </div>
      <p class="qtext">{{ q.item.q }}</p>
      <div class="opts">
        <button
          v-for="(opt, oi) in q.options"
          :key="oi"
          type="button"
          class="opt"
          :disabled="q.answeredIndex !== null"
          :class="{
            right: q.answeredIndex !== null && opt.correct,
            wrong: q.answeredIndex === oi && !opt.correct,
            dim: q.answeredIndex !== null && q.answeredIndex !== oi && !opt.correct,
          }"
          @click="answer(q, oi)"
        >
          {{ opt.text }}
        </button>
      </div>
      <p class="why">{{ q.item.w }}</p>
    </div>

    <div class="verdict-card" :class="{ show: allAnswered }" aria-live="polite">
      <span class="rank">{{ rank.title }} — {{ score }}/{{ picked.length }}</span>
      <span>{{ rank.line }}</span>
    </div>
  </section>
</template>

<style scoped>
.exam {
  margin-top: 56px;
  border: 4px solid var(--comic-panel-border);
  /* Same house-at-dusk gradient as ComicPanel, deliberately hardcoded. */
  background: linear-gradient(180deg, #c8763a 0%, #8a4a2a 60%, #4a2818 100%);
  box-shadow: 6px 6px 0 rgba(0, 0, 0, .28);
  padding: 24px 20px 26px;
}
.exam > h2 {
  margin: 0;
  color: #fff;
  text-transform: uppercase;
  font-style: italic;
  font-weight: 800;
  font-size: clamp(30px, 5.5vw, 46px);
  letter-spacing: .01em;
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif;
  text-shadow: 3px 3px 0 #2e1a0e, 5px 5px 0 rgba(209, 55, 42, .85);
  text-wrap: balance;
}
.exam-intro { color: #ffe4b8; font-size: 14.5px; max-width: 60ch; margin: 10px 0 4px; }
.scorebar {
  position: sticky;
  top: 10px;
  z-index: 5;
  display: inline-block;
  margin: 12px 0 6px;
  background: var(--comic-caption-bg);
  color: var(--comic-caption-ink);
  border: 3px solid var(--comic-panel-border);
  padding: 5px 12px;
  font-weight: 800;
  letter-spacing: .08em;
  font-size: 13.5px;
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif;
  box-shadow: 3px 3px 0 rgba(0, 0, 0, .3);
  transform: rotate(-1deg);
}
.qcard {
  background: var(--comic-bubble-bg);
  color: var(--comic-bubble-ink);
  border: 3px solid var(--comic-panel-border);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, .28);
  padding: 14px 16px;
  margin-top: 16px;
}
.qtop { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.qnum { font-family: "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif; font-weight: 800; font-size: 17px; }
.diff {
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif;
  font-weight: 800;
  font-size: 10.5px;
  letter-spacing: .14em;
  text-transform: uppercase;
  border: 2px solid var(--comic-panel-border);
  padding: 2px 8px;
  color: #fff;
}
.diff.easy { background: var(--comic-green); }
.diff.medium { background: #c9821b; }
.diff.hard { background: var(--comic-red); }
.qtext { font-size: 17px; font-weight: 700; margin: 0 0 10px; }
.opts { display: grid; gap: 8px; margin: 0; padding: 0; }
.opt {
  display: block;
  width: 100%;
  text-align: left;
  font: inherit;
  font-size: 15.5px;
  color: var(--comic-bubble-ink);
  background: rgba(138, 90, 43, .1);
  border: 2.5px solid var(--comic-panel-border);
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
}
.opt:hover { background: rgba(243, 193, 74, .4); }
.opt:focus-visible { outline: 3px dashed var(--comic-coral); outline-offset: 3px; }
.qcard.answered .opt { cursor: default; }
.qcard.answered .opt:hover { background: rgba(138, 90, 43, .1); }
.qcard.answered .opt.right { background: #d3f2df; border-color: var(--comic-green); font-weight: 700; }
.qcard.answered .opt.right:hover { background: #d3f2df; }
.qcard.answered .opt.wrong { background: #ffd8d1; border-color: var(--comic-red); }
.qcard.answered .opt.wrong:hover { background: #ffd8d1; }
.qcard.answered .opt.dim { opacity: .55; }
.why {
  display: none;
  margin: 10px 0 0;
  padding: 8px 12px;
  font-size: 15px;
  background: #fdeec2;
  border: 2.5px dashed var(--comic-panel-border);
  border-radius: 8px;
}
.qcard.answered .why { display: block; }
.verdict-card {
  display: none;
  margin-top: 20px;
  background: var(--comic-caption-bg);
  color: var(--comic-caption-ink);
  border: 3.5px solid var(--comic-panel-border);
  box-shadow: 5px 5px 0 rgba(0, 0, 0, .3);
  padding: 16px 18px;
  transform: rotate(-.6deg);
}
.verdict-card.show { display: block; }
.verdict-card .rank {
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif;
  font-weight: 800;
  font-size: 26px;
  text-transform: uppercase;
  font-style: italic;
  display: block;
  margin-bottom: 4px;
}
</style>
