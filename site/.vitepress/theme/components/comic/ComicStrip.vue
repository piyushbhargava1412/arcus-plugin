<template>
  <div class="strip">
    <slot />
  </div>
</template>

<style scoped>
.strip {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
  margin: 0 0 16px;
}
@media (max-width: 700px) {
  .strip {
    grid-template-columns: 1fr;
  }
}
</style>
