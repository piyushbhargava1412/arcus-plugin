<script setup lang="ts">
withDefaults(defineProps<{
  span?: number
  tilt?: 'l' | 'r' | null
}>(), {
  span: 6,
  tilt: null,
})
</script>

<template>
  <figure
    class="panel"
    :class="{ 'tilt-l': tilt === 'l', 'tilt-r': tilt === 'r' }"
    :style="{ '--span': span }"
  >
    <span class="caption"><slot name="caption" /></span>
    <slot name="scene" />
    <slot />
    <div class="talk">
      <slot name="talk" />
    </div>
  </figure>
</template>

<style scoped>
.panel {
  grid-column: span var(--span, 6);
  margin: 0;
  border: 3.5px solid var(--comic-panel-border);
  border-radius: 4px;
  /* A warm studio glow — amber light sinking into shadow, replacing
     krill's ocean teal. Hardcoded like the original: this is a deliberate
     scene backdrop, not a themeable token. */
  background: linear-gradient(180deg, #c8763a 0%, #8a4a2a 55%, #4a2818 100%);
  box-shadow: 5px 5px 0 rgba(0, 0, 0, .25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.panel.tilt-l { transform: rotate(-.5deg); }
.panel.tilt-r { transform: rotate(.5deg); }
.caption {
  align-self: flex-start;
  margin: 10px 0 0 10px;
  background: var(--comic-caption-bg);
  color: var(--comic-caption-ink);
  border: 2.5px solid var(--comic-panel-border);
  padding: 3px 9px;
  font-size: 11.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .09em;
  z-index: 2;
  font-family: "Avenir Next Condensed", "Arial Narrow", Impact, "Franklin Gothic Medium", sans-serif;
}
.talk {
  padding: 0 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.panel :deep(.scene) {
  display: block;
  width: 100%;
  flex: 1 0 auto;
}
.panel :deep(code) {
  background: rgba(138, 90, 43, .16);
}
@media (max-width: 700px) {
  .panel {
    grid-column: 1 / -1 !important;
    transform: none !important;
  }
}
</style>
