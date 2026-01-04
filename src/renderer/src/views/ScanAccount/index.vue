<template>
  <div class="flex w-full h-full">
    <div class="w-1/2 h-full border">
      <LogPanel ref="logPanel" class="h-full" />
    </div>
    <div class="w-1/2 h-full flex flex-col border">
      <PlaywrightTest v-if="logPanel" :log-panel="logPanel" />
    </div>
  </div>
</template>
<script setup lang="ts">
  import LogPanel from '@renderer/components/LogPanel.vue'
  import PlaywrightTest from '@renderer/views/ScanAccount/PlaywrightTest.vue'
  import { ref } from 'vue'

  const logPanel = ref<InstanceType<typeof LogPanel>>()
</script>
