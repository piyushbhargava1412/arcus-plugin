<script setup lang="ts">
withDefaults(defineProps<{
  no: string
  cmd?: string
}>(), {
  cmd: '',
})
</script>

<template>
  <div class="chapter">
    <span class="no">{{ no }}</span>
    <h2><slot /></h2>
    <span v-if="cmd" class="cmd">{{ cmd }}</span>
  </div>
</template>

<style scoped>
.chapter {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
  margin: 54px 0 18px;
}
.no {
  background: var(--comic-coral);
  color: #fff;
  border: 3px solid var(--comic-panel-border);
  font-weight: 800;
  font-size: 15px;
  letter-spacing: .1em;
  padding: 5px 11px;
  transform: rotate(-2deg);
  box-shadow: 3px 3px 0 rgba(0, 0, 0, .25);
}
.chapter h2 {
  margin: 0;
  text-transform: uppercase;
  font-style: italic;
  font-weight: 800;
  font-size: clamp(26px, 4.5vw, 38px);
  letter-spacing: .015em;
  text-wrap: balance;
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, "Franklin Gothic Medium", sans-serif;
}
.cmd {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .06em;
  color: var(--comic-ink-soft);
  border-bottom: 3px dotted var(--comic-coral);
  padding-bottom: 2px;
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, "Franklin Gothic Medium", sans-serif;
}
</style>
