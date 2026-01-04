import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("system_config")
export class SystemConfig {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ name: "config_name", type: "varchar", length: 255, nullable: true })
  configName!: string | null;

  @Column({ type: "json", nullable: true })
  config: any | null;

  @CreateDateColumn({ name: "create_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createAt!: Date;

  @UpdateDateColumn({ name: "update_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updateAt!: Date;
}
