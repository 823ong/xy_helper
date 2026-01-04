import { ipcMain } from "electron";
import { getAppDataSource } from "../database/dataSource";
import { PhoneData } from "../database/entities/PhoneData";
import { IpcMainInvokeEvent } from "electron";

export function registerPhoneDataHandler(): void {
  ipcMain.handle("phone-data:get-list", getPhoneDataList);
  ipcMain.handle("phone-data:save", savePhoneData);
  ipcMain.handle("phone-data:delete", deletePhoneData);
  ipcMain.handle("phone-data:get-by-id", getPhoneDataById);
}

const getPhoneDataList = async (_event: IpcMainInvokeEvent, { page = 1, pageSize = 10, phone }: { page: number; pageSize: number; phone?: string }) => {
  const dataSource = await getAppDataSource();
  const repo = dataSource.getRepository(PhoneData);

  const queryBuilder = repo.createQueryBuilder("phone_data");

  if (phone) {
    queryBuilder.where("phone_data.phone LIKE :phone", { phone: `%${phone}%` });
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
