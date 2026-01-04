<template>
  <div class="log-panel">
    <div v-if="showHeader" class="log-panel-header">
      <div class="log-panel-controls">
        <n-space>
          <n-checkbox v-model:checked="showTime" @update:checked="updateShowTime">
            显示时间
          </n-checkbox>
          <n-select
            v-model:value="filterLevel"
            :options="levelOptions"
            size="small"
            style="width: 120px"
            @update:value="updateFilterLevel"
          />
          <n-button size="small" @click="clearLogs">
            <template #icon></template>
            清空
          </n-button>
        </n-space>
      </div>
    </div>

    <div ref="logContainer" class="log-panel-content">
      <div
        v-for="(log, index) in filteredLogs"
        :key="log.id || index"
        class="log-entry"
        :class="`log-${log.level}`"
      >
        <span v-if="showTime" class="log-time">{{ formatTime(log.timestamp) }}</span>
        <span class="log-level">[{{ log.level.toUpperCase() }}]</span>
        <span class="log-message">{{ log.message }}</span>
      </div>

      <div v-if="filteredLogs.length === 0" class="log-empty">
        <span>暂无日志</span>
      </div>
    </div>
  </div>
</template>

<script lang="tsx" setup>
  import { NButton, NCheckbox, NSelect, NSpace } from 'naive-ui'
  import { computed, nextTick, ref } from 'vue'

  export interface LogEntry {
    id?: string
    level: 'debug' | 'info' | 'warn' | 'error'
    message: string
    timestamp?: number
  }

  interface Props {
    showHeader?: boolean
    showTime?: boolean
    maxLogs?: number
    defaultFilterLevel?: 'debug' | 'info' | 'warn' | 'error' | 'all'
    autoScroll?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    showHeader: true,
    showTime: true,
    maxLogs: 1000,
    defaultFilterLevel: 'all',
    autoScroll: true
  })

  const emit = defineEmits<{
    'update:showTime': [value: boolean]
    'update:filterLevel': [value: string]
    'log-added': [log: LogEntry]
  }>()

  const logs = ref<LogEntry[]>([])
  const showTime = ref(props.showTime)
  const filterLevel = ref<string>(props.defaultFilterLevel)
  const logContainer = ref<HTMLElement>()

  const levelOptions = [
    { label: '全部', value: 'all' },
    { label: '调试', value: 'debug' },
    { label: '信息', value: 'info' },
    { label: '警告', value: 'warn' },
    { label: '错误', value: 'error' }
  ]

  const filteredLogs = computed(() => {
    if (filterLevel.value === 'all') {
      return logs.value
    }
    return logs.value.filter((log) => log.level === filterLevel.value)
  })

  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  const scrollToBottom = async (): Promise<void> => {
    if (!props.autoScroll || !logContainer.value) return

    await nextTick()
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }

  const addLog = (level: LogEntry['level'], message: string, timestamp?: number) => {
    console.log(message, timestamp)
    const log: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      level,
      message,
      timestamp: timestamp || Date.now()
    }

    logs.value.push(log)

    if (logs.value.length > props.maxLogs) {
      logs.value.shift()
    }

    emit('log-added', log)
    scrollToBottom()
  }

  const debug = (message: string) => addLog('debug', message)
  const info = (message: string) => addLog('info', message)
  const warn = (message: string) => addLog('warn', message)
  const error = (message: string) => addLog('error', message)

  const log = (level: LogEntry['level'], message: string) => {
    addLog(level, message)
  }

  const clearLogs = () => {
    logs.value = []
  }

  const updateShowTime = (value: boolean) => {
    showTime.value = value
    emit('update:showTime', value)
  }

  const updateFilterLevel = (value: string) => {
    filterLevel.value = value
    emit('update:filterLevel', value)
  }

  defineExpose({
    debug,
    info,
    warn,
    error,
    log,
    clearLogs,
    addLog
  })
</script>

<style scoped>
  .log-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-radius: 6px;
    overflow: auto;
  }

  .log-panel-header {
    padding: 8px 12px;
    border-bottom: 1px solid;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .log-panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.5;
  }

  .log-entry {
    margin-bottom: 2px;
    padding: 1px 4px;
    border-radius: 2px;
    word-break: break-all;
  }

  .log-time {
    color: #888;
    margin-right: 8px;
    display: inline-block;
    min-width: 100px;
  }

  .log-level {
    margin-right: 8px;
    font-weight: bold;
    display: inline-block;
    min-width: 50px;
  }

  .log-message {
    white-space: pre-wrap;
  }

  .log-debug {
    color: #888;
  }

  .log-debug .log-level {
    color: #888;
  }

  .log-info {
    color: #4caf50;
  }

  .log-info .log-level {
    color: #4caf50;
  }

  .log-warn {
    color: #ff9800;
  }

  .log-warn .log-level {
    color: #ff9800;
  }

  .log-error {
    color: #f44336;
    background-color: rgba(244, 67, 54, 0.1);
  }

  .log-error .log-level {
    color: #f44336;
  }

  .log-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    gap: 8px;
  }
</style>
