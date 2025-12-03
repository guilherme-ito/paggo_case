import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { PrismaModule } from './prisma/prisma.module';
import { OcrModule } from './ocr/ocr.module';
import { LlmModule } from './llm/llm.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    DocumentsModule,
    OcrModule,
    LlmModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
