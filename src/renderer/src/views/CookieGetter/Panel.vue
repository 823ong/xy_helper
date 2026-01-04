<template>
  <div class="h-full flex flex-col gap-4 p-4">
    <div class="flex gap-3">
      <NButton :type="platformInfo.running ? 'error' : 'info'" @click="handleToggle">
        {{ platformInfo.running ? '停止' : '启动浏览器' }}
      </NButton>
    </div>
  </div>
</template>

<script setup lang="tsx">
import LogPanel from '@renderer/components/LogPanel.vue'
import { win } from '@renderer/win'
import { onMounted, reactive } from 'vue'
import { TransferData, TransferLog } from '../../../../preload/types/api'

interface Props {
  logPanel: InstanceType<typeof LogPanel>;
}

const { logPanel } = defineProps<Props>()
const platformInfo = reactive<{
  running: boolean;
  [key: string]: any;
}>({
  running: false
})

const handleStart = async () => {
  await win.api.xyCKGetter.update({
    type: 'command',
    command: 'start'
  })
}
const handleStop = async () => {
  await win.api.xyCKGetter.update({
    type: 'command',
    command: 'stop'
  })
}

const handleToggle = async () => {
  if (platformInfo.running) {
    await handleStop()
  } else {
    await handleStart()
  }
}
onMounted(() => {
  win.api.xyCKGetter.listenLog((logObj: TransferLog) => {
    console.log(logObj)
    logPanel.addLog(logObj.level, logObj.content)
  })
  win.api.xyCKGetter.onUpdated((info: TransferData) => {
    Object.assign(platformInfo, info)
  })
})
</script>
