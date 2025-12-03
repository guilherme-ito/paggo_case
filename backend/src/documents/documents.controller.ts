import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExplainDocumentDto } from './dto/explain-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
const archiver = require('archiver');

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = process.env.UPLOAD_DEST || './uploads';
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `File type ${file.mimetype} not allowed. Allowed types: ${allowedMimes.join(', ')}`
            ),
            false
          );
        }
      },
    })
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const uploadDir = process.env.UPLOAD_DEST || './uploads';
      // Use absolute path
      const absoluteUploadDir = uploadDir.startsWith('./') 
        ? join(process.cwd(), uploadDir.replace('./', ''))
        : uploadDir;
      const filePath = join(absoluteUploadDir, file.filename);

      console.log('Upload attempt:', {
        userId: user.id,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath,
      });

      const document = await this.documentsService.createDocument(user.id, {
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath,
      });

      console.log('Document created successfully:', document.id);
      return document;
    } catch (error) {
      console.error('Upload error details:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        userId: user?.id,
        fileName: file?.filename,
      });
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to upload document'
      );
    }
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.documentsService.findAll(user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.findOne(id, user.id);
  }

  @Post(':id/explain')
  async explain(
    @Param('id') id: string,
    @Body() explainDto: ExplainDocumentDto,
    @CurrentUser() user: any
  ) {
    return this.documentsService.explainDocument(id, user.id, explainDto);
  }

  @Post(':id/query')
  async query(
    @Param('id') id: string,
    @Body() queryDto: QueryDocumentDto,
    @CurrentUser() user: any
  ) {
    return this.documentsService.queryDocument(id, user.id, queryDto);
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response
  ) {
    try {
      const { fileContent, fileName, textContent } =
        await this.documentsService.downloadDocument(id, user.id);

      // Create a ZIP file containing the original document and extracted data
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      // Set response headers for ZIP download
      const baseFileName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFileName}_with_extracted_data.zip"`);

      // Pipe archive data to response
      archive.pipe(res);

      // Add the original file
      archive.append(Buffer.from(fileContent), { name: fileName });

      // Add the extracted text and LLM interactions as a text file
      archive.append(textContent, { name: `${baseFileName}_extracted_data.txt` });

      // Finalize the archive
      return new Promise<void>((resolve, reject) => {
        archive.on('end', () => resolve());
        archive.on('error', (err: Error) => {
          console.error('Archive error:', err);
          reject(err);
        });
        archive.finalize();
      });
    } catch (error) {
      console.error('Download error:', error);
      throw new BadRequestException(
        `Failed to create download: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  @Get(':id/file')
  async getFile(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res() res: Response
  ) {
    const document = await this.documentsService.findOne(id, user.id);
    
    const { existsSync } = require('fs');
    const { resolve } = require('path');
    
    const filePath = resolve(document.filePath);
    if (!existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }

    // Set CORS headers for PDF viewing
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    
    return res.sendFile(filePath);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.documentsService.deleteDocument(id, user.id);
  }

  @Post(':id/reprocess-ocr')
  async reprocessOCR(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.documentsService.reprocessOCR(id, user.id);
  }
}
