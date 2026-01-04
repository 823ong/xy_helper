import { getRepository } from '../../database/dataSource'
import { PhoneData } from "../../database/entities/PhoneData";
import { xyScanInfo, xySendLog2UI } from "./index";
import { getAPI } from "../../utils/smsCode/smsCodePlatformAPI";
import { currentConfig } from "../systemSettingsHandler";


/**
 * 获取一条已认证的号码 用来获取cookie2
 */
export const getCertifiedPhone = async (): Promise<string> => {
  const phoneDataRepository = await getRepository(PhoneData)
  const phone  = await phoneDataRepository.findOne({
    where: {
      status: 2
    }
  })
  return phone?.phone || "";
}
/**
 * 每个可用平台拿一条然后入库
 */
export const fastGetNewThenSave = async () => {
  const smsPlatformList = currentConfig.smsPlatform;
  const platformInfos = smsPlatformList.filter(p => !!p.enable);
  if (!platformInfos.length) {
    xySendLog2UI({
      type: "log",
      level: "warn",
      content: "没有可用平台"
    });
    return;
  }
  const tasks = platformInfos.map(async (info) => {
    try {
      const res = await getNoCheckedPhonesThenSaveDB(info.name, 1);
      if (res) {
        return true;
      } else {
        throw new Error(`${info.name} get phone fail`);
      }
    } catch (err) {
      console.warn(`Fast task failed for ${info.name}:`, (err as any).message || err);
      throw err;
    }
  });
  try {
    await Promise.any(tasks);
    console.log(`Fast getThenSave At least one phone fetched and saved successfully.`);
    return true;
  } catch (err) {
    console.error(`fast getThenSave all fail .`, err);
    return false;
  }
};
/**
 * 获取未测试过的手机号码并保存到数据库
 * @param platform
 * @param concurrentCount 调用获取号码并发数
 */
export const getNoCheckedPhonesThenSaveDB = async (platform: string, concurrentCount = 10) => {
  const numbers = Array.from({ length: concurrentCount }, (_, i) => i);

  const api = getAPI(platform);
  if (!api) {
    console.error(`${platform} api is null, fetch phone fail`);
    return;
  }

  const phoneDataRepository = await getRepository(PhoneData);

  // 构造所有任务
  const tasks = numbers.map(async () => {
    try {
      const p = await api.getPhone();
      const phoneEntity = phoneDataRepository.create({
        phone: p,
        pt: api.name,
        xmid: api.projectId,
        status: 0
      });
      await phoneDataRepository.save(phoneEntity);
      return true; // 成功信号
    } catch (err) {
      // 关键：捕获错误，避免 unhandledRejection
      console.warn(`Task failed for ${platform}:`, (err as any).message || err);
      throw err; // 重新抛出，让 Promise.any 能判断是否全失败
    }
  });

  try {
    // 只要一个成功，就立即返回（函数结束）
    await Promise.any(tasks);
    console.log(`${platform}: At least one phone fetched and saved successfully.`);
    // 此时函数返回，但其他 tasks 仍在后台运行（如果还没完成）
    return true;
  } catch (err) {
    // 所有都失败了
    console.error(`${platform}: All ${concurrentCount} attempts failed.`, err);
    return false;
  }
};

export const updatePhoneStatus = async (phone: string, platform: string, status: number,reason?: string) => {
  const repository = await getRepository(PhoneData);
  await repository.update({ phone, pt: platform }, { status, reason });
};
export const blockPhone = async ({ phone, platform, reason }: { phone: string; platform: string, reason: string }) => {
  const api = getAPI(platform);
  if (!api) {
    console.error(`${platform} api is null, block phone fail`);
    return;
  }
  const [_o, smsBlockRes] = await Promise.all([
    api.blockPhone(phone),
    // (() => {
    //   console.log(`api ban-${phone} pt-${platform}`)
    //   return 1
    // })(),
    // IIFE, 立即执行函数. (async()=>do) 调用后返回一个Promise函数, 后面的()表示执行.
    (async () => {
      const phoneDataRepository = await getRepository(PhoneData);
      return phoneDataRepository.update({ phone, pt: platform }, { status: 3, reason });
    })()
  ]);
  return smsBlockRes;
};

export const getPhoneFromDBToCache = async () => {
  const phoneDataRepository = await getRepository(PhoneData);
  xyScanInfo.phoneList = await phoneDataRepository.find({
    where: {
      status: 0
    }
  });
};

export const getCheckPhone = async () => {
  const repository = await getRepository(PhoneData);
  return repository
    .createQueryBuilder("phone")
    .where("phone.status = :status", { status: 0 })
    .orderBy("phone.id", "ASC")
    .limit(1) // 或 .take(1)
    .getOne();
};
