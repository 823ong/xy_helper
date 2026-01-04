<template>
  <div class="flex w-full h-full">
    <div class="w-1/2 h-full border">
      <LogPanel ref="logPanel" />
    </div>
    <div class="w-1/2 h-full flex flex-col border">
      <PlaywrightTest v-if="logPanel" :log-panel="logPanel" />
    </div>
  </div>
</template>
<script lang="tsx" setup>
  import LogPanel from '@renderer/components/LogPanel.vue'
  import PlaywrightTest from '@renderer/views/ScanAccount/PlaywrightTest.vue'
  import { ref } from 'vue'

  const logPanel = ref<InstanceType<typeof LogPanel>>()
</script>
