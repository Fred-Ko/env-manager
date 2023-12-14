import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  LessThan,
  PrimaryGeneratedColumn,
  Repository,
  Unique,
} from 'typeorm';

import { Cron } from '@nestjs/schedule';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Entity('secrets')
@Unique(['name', 'path'])
export class Secret {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 5000, nullable: true })
  @Index()
  name: string;

  @Column({ length: 5000, nullable: true })
  @Index()
  path: string;

  @Column({ length: 5000, nullable: true })
  @Index()
  value: string;

  @CreateDateColumn({ select: false })
  createdAt: Date;
}

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [Secret],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Secret]),
  ],
  providers: [Repository<Secret>],
  exports: [TypeOrmModule],
})
export class SqliteModule {
  constructor(private readonly secretRepository: Repository<Secret>) {}

  @Cron('*/5 * * * *')
  async handleCron() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      await this.secretRepository.delete({
        createdAt: LessThan(fiveMinutesAgo),
      });

      console.log('Deleted secrets that are older than 5 minutes.');
    } catch (err) {
      console.error(err.message);
    }
  }
}
