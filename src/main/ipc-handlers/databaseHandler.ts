import { ipcMain } from "electron";
import { getAppDataSource } from "../database/dataSource";
import { DataSource } from "typeorm";
import { PhoneData } from "../database/entities/PhoneData";
import { SystemConfig } from "../database/entities/SystemConfig";
import { DBParams } from "../../preload/types/api";
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;

export function registerDatabaseHandler(): void {
  ipcMain.handle("db:test-connection", testConnection);
  ipcMain.handle("db:test-exec", exec);
}


export const exec = async (_event: IpcMainInvokeEvent, param: DBParams) => {
  const dataSource = await getAppDataSource();
  const rawData = await dataSource.query(param.sql, param.args);
  if (param.entity) {
    const repository = dataSource.getRepository(param.entity);
    if (rawData instanceof Array) {
      return rawData.map(item => repository.create(item));
    } else {
      return repository.create(rawData);
    }
  }
  return rawData;
};

const testConnection = async (_event: IpcMainInvokeEvent, config: any) => {
  try {
    if (config) {
      // Create a temporary connection to test provided config
      const { url, username, password, database } = config.database || {};
      const connectionOptions: any = {
        type: "mysql",
        username,
        password,
        database,
        synchronize: false,
        logging: false,
        entities: [PhoneData, SystemConfig]
      };

      let host = "localhost";
      let port = 3306;

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

      const tempDataSource = new DataSource(connectionOptions);
      await tempDataSource.initialize();
      await tempDataSource.destroy();
      return { success: true, message: "Connection successful" };
    } else {
      // Use existing or establish new connection using current global config
      await getAppDataSource();
      return { success: true, message: "Connection successful" };
    }
  } catch (error: any) {
    console.error("Database connection failed:", error);
    return { success: false, error: error.message || String(error) };
  }
};
