import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OcrModule } from '../ocr/ocr.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [PrismaModule, OcrModule, LlmModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
