import { axiosRequest, PlatformAPI } from "./smsCodePlatformAPI";

/**
 * 参考: https://www.d1jiema.com/api.html
 */
const api: PlatformAPI = {
  name: "d1jiema",
  baseURL: "http://api.d1jiema.com/zc/data.php",
  projectId: "",
  token: "",
  async init(): Promise<void> {
    if (!this.token) {
      throw new Error(`获取token失败,请去获取:https://www.d1jiema.com/appweb/signIn.html`);
    }
  },
  async getMoney(): Promise<string> {
    await this.init();
    const response = await axiosRequest({
      url: `${this.baseURL}?code=leftAmount&token=${this.token}`
    });
    return response.data;
  },
  async getPhone(): Promise<string> {
    await this.init();
    const response = await axiosRequest({
      url: `${this.baseURL}?code=getPhone&token=${this.token}`
    });
    return response.data + "";
  },
  async blockPhone(phone: string) {
    await this.init();
    const response = await axiosRequest({
      url: `${this.baseURL}?code=block&token=${this.token}&phone=${phone}`
    });
    return (
      (response.data as string).includes("成功") || (response.data as string).includes("success")
    );
  }
};

export default api;
