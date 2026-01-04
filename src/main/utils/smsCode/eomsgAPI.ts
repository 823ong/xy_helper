import { axiosRequest, PlatformAPI } from "./smsCodePlatformAPI";

/**
 * 参考: https://www.eomsg.com/api.html
 */
const api: PlatformAPI = {
  name: "eomsg",
  baseURL: "http://api.eomsg.com/zc/data.php",
  projectId: "",
  token: "",
  async init() {
    if (!this.token) {
      throw new Error(`获取token失败,请去获取:https://www.eomsg.com/appweb/signIn.html`);
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
