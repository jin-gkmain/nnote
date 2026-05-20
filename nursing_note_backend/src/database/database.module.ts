import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mariadb from 'mariadb';

/**
 * DB_POOL 토큰으로 mariadb 커넥션 풀을 제공하는 모듈
 *
 * @Global() 덕분에 한번 import하면
 * 다른 모듈에서 별도 import 없이 @Inject('DB_POOL')로 사용 가능
 */
export const DB_POOL = 'DB_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      useFactory: (configService: ConfigService) => {
        return mariadb.createPool({
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 3306),
          database: configService.get<string>('DB_NAME', 'nursing_note'),
          user: configService.get<string>('DB_USER', 'nursing_user'),
          password: configService.get<string>('DB_PASSWORD', 'nursing_pass_1234'),
          connectionLimit: 10,
          bigIntAsNumber: true,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DB_POOL],
})
export class DatabaseModule {}
