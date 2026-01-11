import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("system_config")
export class SystemConfig {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "config_name", type: "varchar", length: 255, nullable: true })
  configName!: string | null;

  @Column({
    type: "text",
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: string) => value ? JSON.parse(value) : null
    }
  })
  config: any | null;

  @CreateDateColumn({ name: "create_at" })
  createAt!: Date;

  @UpdateDateColumn({ name: "update_at" })
  updateAt!: Date;
}
