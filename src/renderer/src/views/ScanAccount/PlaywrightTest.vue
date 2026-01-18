<template>
  <div class="h-full flex flex-col gap-4 p-4">
    <!-- 顶部控制区域 -->
    <div class="flex items-center gap-4">
      <span class="text-sm font-medium">平台:</span>
      <div class="flex-1">
        <NSelect
          :value="platformInfo.currentPlatform"
          class="min-w-23 max-w-25"
          :options="codePlatformOptions"
          :loading="loadingObj.codePlatform"
          placeholder="请选择接码平台"
          :disabled="loadingObj.codePlatformBalance"
          @update:value="handleCodePlatformChange"
        />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">余额:</span>
        <NSpace align="center" size="small">
          <span class="text-base font-bold text-green-600">{{ platformInfo.balance }}</span>
          <NButton
            :loading="loadingObj.codePlatformBalance"
            size="small"
            quaternary
            @click="handleGetCodePlatformBalance"
          >
            <template #icon>
              <Refresh />
            </template>
          </NButton>
        </NSpace>
      </div>
    </div>

    <!-- 主要操作区域 -->
    <div class="flex flex-col gap-3">
      <!-- 操作按钮区域 -->
      <div class="flex gap-3">
        <NButton :type="platformInfo.running ? 'error' : 'info'" @click="handleToggle">
          {{ platformInfo.running ? '停止' : '启动浏览器' }}
        </NButton>
        <NTag>{{ platformInfo.successCount }}</NTag>
        <NButton @click="handleResetContext">
          <NIcon><FingerPrintSharp /></NIcon>
          重置上下文
        </NButton>
      </div>
      <div>
        <NButton @click="handleOpenSuccessFile" :loading="loadingObj.openFile">
          打开成功文件
        </NButton>
      </div>
    </div>

    <!-- 设置区域 -->
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium">获取手机间隔(秒):</span>
        <NInputNumber
          v-model:value="intervalSeconds"
          :min="0.1"
          :step="0.1"
          :precision="1"
          class="w-30"
          @update:value="handleIntervalChange"
        />
      </div>

      <div class="flex items-center gap-4">
        <span class="text-sm font-medium">启用代理:</span>
        <NSwitch v-model:value="platformInfo.enableProxy" @update:value="handleEnableProxyChange" />
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium">代理获取URL:</span>
        <NInput
          :value="platformInfo.fetchProxyUrl"
          type="textarea"
          placeholder="请输入代理获取URL"
          :rows="3"
          disabled
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
  import LogPanel from '@renderer/components/LogPanel.vue'
  import { win } from '@renderer/win'
  import { Refresh, FingerPrintSharp } from '@vicons/ionicons5'
  import { computed, onMounted, reactive, ref } from 'vue'
  import { TransferLog } from '../../../../preload/types/api'
  import { useSystemSettingsStore } from '@renderer/stores/systemSettings'
  import { XYWorkerBaseInfo } from '../../../../preload/types/XYWorker'
  import tipAudio from '@renderer/assets/tip.mp3'

  interface Props {
    logPanel: InstanceType<typeof LogPanel>
  }

  const systemSettingsStore = useSystemSettingsStore()
  const { logPanel } = defineProps<Props>()
  const loadingObj = reactive<Record<string, boolean>>({
    codePlatform: false,
    codePlatformBalance: false,
    openFile: false
  })
  const platformInfo = reactive<Partial<XYWorkerBaseInfo>>({
    running: false
  })
  const intervalSeconds = ref(5)
  const codePlatformOptions = computed(() => {
    return systemSettingsStore.settings.smsPlatform.map((item) => ({
      label: item.name,
      value: item.name
    }))
  })
  const handleCodePlatformChange = (value: string) => {
    win.api.xyScan.update({
      type: 'command',
      command: 'switchPlatform',
      payload: value
    })
  }
  const handleOpenSuccessFile = async () => {
    loadingObj.openFile = true
    await win.api.xyScan.update({
      type: 'command',
      command: 'openSuccessFile'
    })
    loadingObj.openFile = false
  }
  const handleGetCodePlatformBalance = async () => {
    loadingObj.codePlatformBalance = true
    try {
      await win.api.xyScan.update({
        type: 'command',
        command: 'getRefresh'
      })
    } catch (e) {
      win.message.error(String(e))
    } finally {
      loadingObj.codePlatformBalance = false
    }
  }

  const handleStart = async () => {
    await win.api.xyScan.update({
      type: 'command',
      command: 'start'
    })
  }
  const handleStop = async () => {
    await win.api.xyScan.update({
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
  const handleResetContext = async () => {
    await win.api.xyScan.update({
      type: 'command',
      command: 'resetContext'
    })
  }

  const handleIntervalChange = async (value: number | null) => {
    if (value && value > 0) {
      const intervalMs = Math.round(value * 1000)
      await win.api.xyScan.update({
        type: 'command',
        command: 'updateXyScanInfo',
        payload: {
          getPhoneInterval: intervalMs
        }
      })
    }
  }

  const handleEnableProxyChange = async (value: boolean) => {
    await win.api.xyScan.update({
      type: 'command',
      command: 'updateXyScanInfo',
      payload: {
        enableProxy: value
      }
    })
  }

  const handleFetchProxyUrlChange = async () => {
    await win.api.xyScan.update({
      type: 'command',
      command: 'updateXyScanInfo',
      payload: {
        fetchProxyUrl: platformInfo.fetchProxyUrl
      }
    })
  }
  // 处理错误提示音
  const handleErrorAlert = (logObj: TransferLog) => {
    if (logObj.level === 'error' && logObj?.content.includes('惩罚')) {
      const audio = new Audio(tipAudio)
      audio.play().catch((e) => console.error('播放音频失败:', e))
    }
  }

  onMounted(() => {
    win.api.xyScan.listenLog((logObj: TransferLog) => {
      console.log(logObj)
      logPanel.addLog(logObj.level, logObj.content)
      // 检查日志内容,播放提示音
      handleErrorAlert(logObj)
    })
    win.api.xyScan.onUpdated((info: XYWorkerBaseInfo) => {
      Object.assign(platformInfo, info)
      if (info.getPhoneInterval) {
        intervalSeconds.value = info.getPhoneInterval / 1000
      }
    })
    handleCodePlatformChange('豪猪')
  })
</script>
