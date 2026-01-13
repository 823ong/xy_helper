import { ipcMain } from "electron";
import { getAppDataSource } from "../database/dataSource";
import { PhoneData } from "../database/entities/PhoneData";
import { IpcMainInvokeEvent } from "electron";
import { getAPI } from "../utils/smsCode/smsCodePlatformAPI";

export function registerPhoneDataHandler(): void {
  ipcMain.handle("phone-data:get-list", getPhoneDataList);
  ipcMain.handle("phone-data:save", savePhoneData);
  ipcMain.handle("phone-data:delete", deletePhoneData);
  ipcMain.handle("phone-data:get-by-id", getPhoneDataById);
  ipcMain.handle("phone-data:block-phone", blockPhone);
}

const getPhoneDataList = async (_event: IpcMainInvokeEvent, { page = 1, pageSize = 10, phone, status }: { page: number; pageSize: number; phone?: string; status?: number }) => {
  const dataSource = await getAppDataSource();
  const repo = dataSource.getRepository(PhoneData);

  const queryBuilder = repo.createQueryBuilder("phone_data");

  if (phone) {
    queryBuilder.where("phone_data.phone LIKE :phone", { phone: `%${phone}%` });
  }

  if (status !== undefined) {
    queryBuilder.andWhere("phone_data.status = :status", { status });
  }

  queryBuilder
    .orderBy("phone_data.updateAt", "DESC")
    .skip((page - 1) * pageSize)
    .take(pageSize);

  const [items, total] = await queryBuilder.getManyAndCount();

  return {
    items,
    total,
    page,
    pageSize
  };
};

const savePhoneData = async (_event: IpcMainInvokeEvent, data: Partial<PhoneData>) => {
  const dataSource = await getAppDataSource();
  const repo = dataSource.getRepository(PhoneData);
  return await repo.save(data);
};

const deletePhoneData = async (_event: IpcMainInvokeEvent, id: number) => {
  const dataSource = await getAppDataSource();
  const repo = dataSource.getRepository(PhoneData);
  return await repo.delete(id);
};

const getPhoneDataById = async (_event: IpcMainInvokeEvent, id: number) => {
  const dataSource = await getAppDataSource();
  const repo = dataSource.getRepository(PhoneData);
  return await repo.findOneBy({ id });
};

const blockPhone = async (_event: IpcMainInvokeEvent, { phone, platform }: { phone: string; platform: string }) => {
  try {
    const api = getAPI(platform);
    const result = await api.blockPhone(phone);
    return { success: result };
  } catch (error) {
    console.error('Block phone error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
