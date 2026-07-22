<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{
  tease: string
  span?: number
  tip?: string
}>(), {
  span: 12,
  tip: '-.7deg',
})

const flipped = ref(false)
</script>

<template>
  <button
    class="fact"
    type="button"
    :aria-expanded="flipped"
    :class="{ flipped }"
    :style="{ '--span': span, '--tip': tip }"
    @click="flipped = !flipped"
  >
    <span class="face front" :aria-hidden="flipped">
      <CastIcon name="star" class="star" />
      <span class="lbl">Did you know?</span>
      <span class="tease">{{ tease }}</span>
      <span class="hint">Tap to reveal</span>
    </span>
    <span class="face back" :aria-hidden="!flipped">
      <span class="lbl">Fun fact</span>
      <span class="fact-body"><slot /></span>
      <span class="hint">Flip back</span>
    </span>
  </button>
</template>

<style scoped>
.fact {
  grid-column: span var(--span, 12);
  transform: rotate(var(--tip, -.7deg));
  border: 0;
  background: none;
  padding: 0;
  margin: 0;
  display: grid;
  align-self: center;
  perspective: 1100px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}
.fact:focus-visible { outline: 3px dashed var(--comic-coral); outline-offset: 5px; }
.fact .face {
  grid-area: 1 / 1;
  background: var(--comic-fact-bg);
  color: var(--comic-fact-ink);
  border: 3.5px solid var(--comic-panel-border);
  box-shadow: 5px 5px 0 rgba(0, 0, 0, .25);
  padding: 14px 18px 15px 58px;
  position: relative;
  font-size: 14.5px;
  line-height: 1.45;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transition: transform .55s ease;
}
.fact .front { transform: rotateY(0deg); display: flex; flex-direction: column; justify-content: center; gap: 4px; }
.fact .back { transform: rotateY(-180deg); background: #fdeec2; }
.fact.flipped .front { transform: rotateY(180deg); }
.fact.flipped .back { transform: rotateY(0deg); }
.fact :deep(strong) { font-weight: 700; }
.fact :deep(code) { background: rgba(138, 90, 43, .16); }
.fact .tease { font-weight: 700; font-size: 15.5px; text-wrap: balance; }
.fact .hint {
  align-self: flex-start;
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif;
  font-weight: 800;
  font-size: 10.5px;
  letter-spacing: .14em;
  text-transform: uppercase;
  background: var(--comic-coral);
  color: #fff;
  border: 2px solid var(--comic-panel-border);
  padding: 2px 8px;
  margin-top: 5px;
  transform: rotate(-1.5deg);
}
.fact .back .hint { background: var(--comic-teal); position: absolute; right: 12px; bottom: 10px; margin: 0; }
.fact .star { position: absolute; left: -14px; top: -14px; width: 58px; height: 58px; }
.fact .lbl {
  display: block;
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: 12px;
  margin-bottom: 3px;
  color: #8a4a12;
}
@media (prefers-reduced-motion: reduce) {
  .fact .face { transition: none; }
}
@media (max-width: 700px) {
  .fact {
    grid-column: 1 / -1 !important;
    transform: none !important;
    padding-left: 0;
  }
  .fact .face { padding-left: 52px; }
}
</style>
