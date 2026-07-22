<script setup lang="ts">
withDefaults(defineProps<{
  who: string
  right?: boolean
}>(), {
  right: false,
})
</script>

<template>
  <div class="bubble" :class="{ right }">
    <span class="who">{{ who }}</span><slot />
  </div>
</template>

<style scoped>
.bubble {
  position: relative;
  background: var(--comic-bubble-bg);
  color: var(--comic-bubble-ink);
  border: 2.5px solid var(--comic-panel-border);
  border-radius: 16px;
  padding: 9px 13px;
  font-size: 14px;
  line-height: 1.4;
  max-width: 52ch;
}
.bubble::before {
  content: "";
  position: absolute;
  top: -12px;
  left: 26px;
  width: 14px;
  height: 14px;
  background: var(--comic-bubble-bg);
  border-left: 2.5px solid var(--comic-panel-border);
  border-top: 2.5px solid var(--comic-panel-border);
  transform: skewX(30deg) rotate(52deg);
}
.bubble.right { align-self: flex-end; }
.bubble.right::before {
  left: auto;
  right: 26px;
  transform: skewX(-30deg) rotate(-52deg);
}
.who {
  display: block;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--comic-coral);
  margin-bottom: 2px;
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif;
}
.bubble :deep(em) { font-style: normal; font-weight: 700; }
.bubble :deep(code) { background: rgba(138, 90, 43, .14); }
</style>
