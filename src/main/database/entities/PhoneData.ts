import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("phone_data")
export class PhoneData {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index("phone_data_phone_index")
  @Column({ type: "varchar" })
  phone!: string;

  @Column({ type: "varchar", length: 255, nullable: true})
  pt!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  xmid!: string | null;

  // -1: 不可用 0: 未检查,1:检查中,2:已认证,3:未认证,
  @Column({ type: "int" })
  status!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: "create_at" })
  createAt!: Date;

  @UpdateDateColumn({ name: "update_at" })
  updateAt!: Date;
}
