<template>
  <div class="h-full flex flex-col gap-4 p-4">
    <!-- 顶部控制区域 -->
    <div class="flex items-center gap-4">
      <span class="text-sm font-medium">平台:</span>
      <div class="flex-1">
        <NSelect :value="platformInfo.currentPlatform" class="min-w-23 max-w-25" :options="codePlatformOptions"
          :loading="loadingObj.codePlatform" placeholder="请选择接码平台" :disabled="loadingObj.codePlatformBalance"
          @update:value="handleCodePlatformChange" />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">余额:</span>
        <NSpace align="center" size="small">
          <span class="text-base font-bold text-green-600">{{ platformInfo.balance }}</span>
          <NButton :loading="loadingObj.codePlatformBalance" size="small" quaternary
            @click="handleGetCodePlatformBalance">
            <template #icon>
              <Refresh />
            </template>
          </NButton>
        </NSpace>
      </div>
    </div>

    <!-- 主要操作区域 -->
    <div class="flex-1 flex flex-col gap-3">
      <!-- 操作按钮区域 -->
      <div class="flex gap-3">
        <NButton :type="platformInfo.running ? 'error' : 'info'" @click="handleToggle">
          {{ platformInfo.running ? "停止" : "启动浏览器" }}
        </NButton>
        <NTag>{{platformInfo.successCount}}</NTag>
      </div>
      <div>
        <NButton @click="handleOpenSuccessFile" :loading="loadingObj.openFile">
          打开成功文件
        </NButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
import LogPanel from "@renderer/components/LogPanel.vue";
import { win } from "@renderer/win";
import { Refresh } from "@vicons/ionicons5";
import { computed, onMounted, reactive, ref } from "vue";
import { TransferData, TransferLog } from "../../../../preload/types/api";
import { useSystemSettingsStore } from "@renderer/stores/systemSettings";
import { XYWorkerBaseInfo } from '../../../../preload/types/XYWorker'

interface Props {
  logPanel: InstanceType<typeof LogPanel>;
}

const systemSettingsStore = useSystemSettingsStore();
const { logPanel } = defineProps<Props>();
const loadingObj = reactive<Record<string, boolean>>({
  codePlatform: false,
  codePlatformBalance: false,
  openFile: false
});
const codePlatform = ref("");
const platformInfo = reactive<Partial<XYWorkerBaseInfo>>({
  running: false,
});
const codePlatformBalance = computed(() => {
  return systemSettingsStore.settings.smsPlatform.find(item => item.name === codePlatform.value)?.balance ?? 0;
});
const codePlatformOptions = computed(() => {
  return systemSettingsStore.settings.smsPlatform.map(item => ({ label: item.name, value: item.name }));
});
const handleCodePlatformChange = (value: string) => {
  win.api.xyScan.update({
    type: "command",
    command: "switchPlatform",
    payload: value
  });
};
const handleOpenSuccessFile = async () => {
  loadingObj.openFile = true;
  await win.api.xyScan.update({
    type: "command",
    command: "openSuccessFile"
  });
  loadingObj.openFile = false;
};
const handleGetCodePlatformBalance = async () => {
  loadingObj.codePlatformBalance = true;
  try {
    await win.api.xyScan.update({
      type: "command",
      command: "getRefresh",
    });
  } catch (e) {
    win.message.error(String(e));
  } finally {
    loadingObj.codePlatformBalance = false;
  }
};

const handleStart = async () => {
  await win.api.xyScan.update({
    type: "command",
    command: "start"
  });
};
const handleStop = async () => {
  await win.api.xyScan.update({
    type: "command",
    command: "stop"
  });
};

const handleToggle = async () => {
  if (platformInfo.running) {
    await handleStop();
  } else {
    await handleStart();
  }
};
onMounted(() => {
  win.api.xyScan.listenLog((logObj: TransferLog) => {
    console.log(logObj);
    logPanel.addLog(logObj.level, logObj.content);
  });
  win.api.xyScan.onUpdated((info: TransferData) => {
    Object.assign(platformInfo, info);
  });
  handleCodePlatformChange('豪猪')
});
</script>
