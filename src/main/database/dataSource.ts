import { DataSource } from "typeorm";
import { PhoneData } from "./entities/PhoneData";
import { SystemConfig } from "./entities/SystemConfig";
import { app } from "electron";
import path from "path";
// @ts-ignore
import type { ObjectLiteral } from "typeorm/common/ObjectLiteral";

let dataSource: DataSource | null = null;

export const getAppDataSource = async (): Promise<DataSource> => {
  // 如果已经初始化，直接返回
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  // SQLite数据库文件路径
  const dbPath = path.join(app.getPath('userData'), 'database.sqlite');

  const connectionOptions: any = {
    type: "sqlite",
    database: dbPath,
    synchronize: true, // 自动同步表结构
    logging: ["error", "warn"],
    entities: [PhoneData, SystemConfig]
  };

  dataSource = new DataSource(connectionOptions);
  await dataSource.initialize();
  return dataSource;
};

export const getRepository = async <T extends ObjectLiteral>(entity: new () => T) => {
  const dataSource = await getAppDataSource();
  return dataSource.getRepository(entity);
};
