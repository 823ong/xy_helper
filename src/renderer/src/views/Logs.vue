<template>
  <div class="h-full p-4 flex flex-col">
    <n-card
      title="System Logs"
      class="flex-1"
      content-style="padding: 0; display: flex; flex-direction: column; height: 100%;"
    >
      <LogPanel ref="logPanel" />
    </n-card>
  </div>
</template>

<script setup lang="ts">
  import { NCard } from 'naive-ui'
  import { onMounted, ref } from 'vue'

  import LogPanel from '../components/LogPanel.vue'

  const logPanel = ref<InstanceType<typeof LogPanel> | null>(null)

  // Simulation of logs
  onMounted(() => {
    if (logPanel.value) {
      logPanel.value.info('System initialized')
      logPanel.value.debug('Playwright engine loaded')
      logPanel.value.warn('Waiting for tasks...')
    }
  })
</script>
