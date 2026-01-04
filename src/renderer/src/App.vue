<script setup lang="ts">
import {
  darkTheme,
  lightTheme,
  NConfigProvider,
  NDialogProvider,
  NGlobalStyle,
  NMessageProvider,
  useOsTheme
} from "naive-ui";
import { computed, onMounted } from "vue";
import { useSystemSettingsStore } from "@renderer/stores/systemSettings";
import { win } from "@renderer/win";
import { themeOverrides } from "./theme/overrides";

const systemSettingsStore = useSystemSettingsStore();
const osTheme = useOsTheme();
const theme = computed(() => {
  if (systemSettingsStore.settings.theme === "auto") {
    return osTheme.value === "light" ? lightTheme : darkTheme;
  }
  return systemSettingsStore.settings.theme === "light" ? lightTheme : darkTheme;
});
onMounted(async () => {
  const config = await win.api.systemSettings.get();
  systemSettingsStore.setSystemSettings(config);
  win.api.systemSettings.onChange((config) => {
    systemSettingsStore.setSystemSettings(config);
  })
});
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-global-style />
    <n-message-provider>
      <n-dialog-provider>
        <router-view />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
/* Global styles if needed, but Tailwind is preferred */
body {
  margin: 0;
  font-family: 'Inter', sans-serif;
}
</style>
