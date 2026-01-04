import { DataSource } from "typeorm";
import { PhoneData } from "./entities/PhoneData";
import { SystemConfig } from "./entities/SystemConfig";
import { currentConfig } from "../ipc-handlers/systemSettingsHandler";
import { isEqual } from "lodash";
// @ts-ignore
import type { ObjectLiteral } from "typeorm/common/ObjectLiteral";

let dataSource: DataSource | null = null;
let lastUsedConfig: any = null;

export const getAppDataSource = async (): Promise<DataSource> => {
  const currentDbConfig = currentConfig.database;

  // Check if we need to reconnect
  if (dataSource && dataSource.isInitialized) {
    if (isEqual(currentDbConfig, lastUsedConfig)) {
      return dataSource;
    }
    // Config changed, disconnect
    await dataSource.destroy();
  }

  lastUsedConfig = { ...currentDbConfig };

  const { url, username, password, database } = currentDbConfig || {};

  let host = "localhost";
  let port = 3306;

  const connectionOptions: any = {
    type: "mysql",
    username,
    password,
    database,
    synchronize: false,
    logging: ["error", "warn"],
    entities: [PhoneData, SystemConfig]
  };

  if (url && url.includes("://")) {
    connectionOptions.url = url;
  } else if (url) {
    const parts = url.split(":");
    if (parts.length === 2) {
      host = parts[0];
      port = parseInt(parts[1], 10);
    } else {
      host = url;
    }
    connectionOptions.host = host;
    connectionOptions.port = port;
  } else {
    connectionOptions.host = host;
    connectionOptions.port = port;
  }

  dataSource = new DataSource(connectionOptions);
  await dataSource.initialize();
  return dataSource;
};

export const getRepository = async <T extends ObjectLiteral>(entity: new () => T) => {
  const dataSource = await getAppDataSource();
  return dataSource.getRepository(entity);
};
