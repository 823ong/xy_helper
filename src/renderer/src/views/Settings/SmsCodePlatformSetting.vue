<template>
  <n-space vertical>
    <NButton @click="refreshAllBalance" :loading="loadObj.refreshAllLoading">
      刷新全部余额
    </NButton>
    <n-table :bordered="false" :single-line="false" size="small">
      <thead>
      <tr>
        <th>名称</th>
        <th>基地址</th>
        <th>项目ID</th>
        <th>Token</th>
        <th>账户</th>
        <th>密码</th>
        <th>余额</th>
        <th style="width: 50px">操作</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(item, index) in model" :key="index">
        <td>
          <n-input v-model:value="item.name" placeholder="Name" />
        </td>
        <td>
          <n-input v-model:value="item.baseURL" placeholder="Base URL" />
        </td>
        <td>
          <n-input v-model:value="item.projectId" placeholder="Project ID" />
        </td>
        <td>
          <n-input v-model:value="item.token" placeholder="Token" />
        </td>
        <td>
          <n-input v-model:value="item.username" placeholder="Username" />
        </td>
        <td>
          <n-input
            v-model:value="item.password"
            placeholder="Password"
          />
        </td>
        <td>
          <n-input v-model:value="item.balance" placeholder="Balance" />
        </td>
        <td>
          <div class="flex items-center gap-2">
            <n-switch v-model:value="item.enable" size="small" />
            <n-button type="error" size="small" @click="removeItem(index)">
              删除
            </n-button>
          </div>
        </td>
      </tr>
      </tbody>
    </n-table>
    <n-button type="primary" dashed block @click="addItem">
      增加平台
    </n-button>
  </n-space>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { NButton, NInput, NSpace, NSwitch, NTable } from "naive-ui";
import type { SmsPlatformInfo } from "../../../../main/utils/smsCode/smsCodePlatformAPI";
import { useSystemSettingsStore } from "@renderer/stores/systemSettings";
import { win } from "@renderer/win";

const systemSettingsStore = useSystemSettingsStore();
const loadObj = reactive<Record<string, boolean>>({
  refreshAllLoading: false
});
const model = ref<SmsPlatformInfo[]>([]);

const set = (data: SmsPlatformInfo[]) => {
  model.value = JSON.parse(JSON.stringify(data));
};

const get = () => {
  return model.value;
};

const addItem = () => {
  model.value.push({
    name: "",
    baseURL: "",
    projectId: "",
    token: "",
    username: "",
    password: "",
    balance: "",
    enable: false
  });
};
const refreshAllBalance = async () => {
  loadObj.refreshAllLoading = true;
  try {
    await win.api.systemSettings.refreshAllBalance();
  } catch (e) {
    console.error(e);
  } finally {
    loadObj.refreshAllLoading = false;
  }
};

const removeItem = (index: number) => {
  model.value.splice(index, 1);
};

defineExpose({
  set,
  get
});
onMounted(() => {
  set(systemSettingsStore.settings.smsPlatform);
  win.api.systemSettings.onChange(() => {
    set(systemSettingsStore.settings.smsPlatform);
  });
});
</script>
