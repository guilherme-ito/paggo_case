import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OcrService } from '../ocr/ocr.service';
import { LlmService } from '../llm/llm.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ExplainDocumentDto } from './dto/explain-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private ocrService: OcrService,
    private llmService: LlmService
  ) {}

  async createDocument(userId: string, uploadDto: UploadDocumentDto) {
    const document = await this.prisma.document.create({
      data: {
        userId,
        ...uploadDto,
        uploadStatus: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Trigger OCR processing asynchronously
    this.processOCR(document.id).catch((error) => {
      console.error(`OCR processing failed for document ${document.id}:`, error);
    });

    return document;
  }

  async findAll(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      include: {
        ocrResult: {
          select: {
            id: true,
            status: true,
            confidence: true,
            extractedText: true,
            summary: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            llmInteractions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        ocrResult: true,
        llmInteractions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return document;
  }

  async explainDocument(id: string, userId: string, explainDto: ExplainDocumentDto) {
    const document = await this.findOne(id, userId);

    if (!document.ocrResult || document.ocrResult.status !== 'COMPLETED') {
      throw new BadRequestException('OCR processing not completed yet');
    }

    const explanation = await this.llmService.generateExplanation(
      document.ocrResult.extractedText,
      explainDto.context
    );

    const interaction = await this.prisma.lLMInteraction.create({
      data: {
        documentId: id,
        type: 'EXPLANATION',
        prompt: explainDto.context || 'Explain this document',
        response: explanation.text,
        tokensUsed: explanation.tokensUsed,
        model: explanation.model,
      },
    });

    return interaction;
  }

  async queryDocument(id: string, userId: string, queryDto: QueryDocumentDto) {
    const document = await this.findOne(id, userId);

    if (!document.ocrResult || document.ocrResult.status !== 'COMPLETED') {
      throw new BadRequestException('OCR processing not completed yet');
    }

    // Get previous interactions for context
    const previousInteractions = await this.prisma.lLMInteraction.findMany({
      where: { documentId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const response = await this.llmService.answerQuery(
      document.ocrResult.extractedText,
      queryDto.query,
      previousInteractions
    );

    const interaction = await this.prisma.lLMInteraction.create({
      data: {
        documentId: id,
        type: 'QUERY',
        prompt: queryDto.query,
        response: response.text,
        tokensUsed: response.tokensUsed,
        model: response.model,
      },
    });

    return interaction;
  }

  async downloadDocument(id: string, userId: string) {
    const document = await this.findOne(id, userId);

    // Resolve file path - handle both relative and absolute paths
    let filePath: string;
    if (path.isAbsolute(document.filePath)) {
      filePath = document.filePath;
    } else {
      // If relative, resolve from project root
      filePath = path.resolve(process.cwd(), document.filePath);
    }

    let fileContent: Buffer;

    try {
      // Check if file exists first
      await fs.access(filePath);
      fileContent = await fs.readFile(filePath);
    } catch (error) {
      console.error('Download error - file not found:', {
        requestedPath: document.filePath,
        resolvedPath: filePath,
        error: error instanceof Error ? error.message : error,
      });
      throw new NotFoundException(
        `File not found on server. Path: ${document.filePath}`
      );
    }

    // Get OCR result and LLM interactions
    const ocrResult = document.ocrResult;
    const llmInteractions = document.llmInteractions;

    // Create a text document with all information
    let textContent = `═══════════════════════════════════════════════════════\n`;
    textContent += `DOCUMENT INFORMATION\n`;
    textContent += `═══════════════════════════════════════════════════════\n\n`;
    textContent += `Document Name: ${document.originalName}\n`;
    textContent += `File Size: ${(document.fileSize / 1024).toFixed(2)} KB\n`;
    textContent += `File Type: ${document.mimeType}\n`;
    textContent += `Uploaded: ${document.createdAt.toISOString()}\n`;
    textContent += `Status: ${document.uploadStatus}\n\n`;

    if (ocrResult && ocrResult.status === 'COMPLETED') {
      textContent += `═══════════════════════════════════════════════════════\n`;
      textContent += `EXTRACTED TEXT (OCR)\n`;
      textContent += `═══════════════════════════════════════════════════════\n\n`;
      if (ocrResult.confidence) {
        textContent += `OCR Confidence: ${ocrResult.confidence.toFixed(2)}%\n`;
        textContent += `Processing Time: ${ocrResult.processingTime ? (ocrResult.processingTime / 1000).toFixed(2) + 's' : 'N/A'}\n\n`;
      }
      if (ocrResult.summary) {
        textContent += `Summary: ${ocrResult.summary}\n\n`;
      }
      textContent += `${ocrResult.extractedText}\n\n`;
    } else if (ocrResult && ocrResult.status === 'FAILED') {
      textContent += `═══════════════════════════════════════════════════════\n`;
      textContent += `OCR STATUS: FAILED\n`;
      textContent += `═══════════════════════════════════════════════════════\n\n`;
      if (ocrResult.error) {
        textContent += `Error: ${ocrResult.error}\n\n`;
      }
    }

    if (llmInteractions.length > 0) {
      textContent += `═══════════════════════════════════════════════════════\n`;
      textContent += `AI INTERACTIONS (${llmInteractions.length} total)\n`;
      textContent += `═══════════════════════════════════════════════════════\n\n`;
      llmInteractions.forEach((interaction, index) => {
        textContent += `───────────────────────────────────────────────────────\n`;
        textContent += `Interaction #${index + 1} - ${interaction.type}\n`;
        textContent += `───────────────────────────────────────────────────────\n`;
        textContent += `Date: ${new Date(interaction.createdAt).toLocaleString()}\n`;
        if (interaction.model) {
          textContent += `Model: ${interaction.model}\n`;
        }
        if (interaction.tokensUsed) {
          textContent += `Tokens Used: ${interaction.tokensUsed}\n`;
        }
        textContent += `\n`;
        if (interaction.type === 'QUERY') {
          textContent += `QUESTION:\n${interaction.prompt}\n\n`;
        }
        textContent += `RESPONSE:\n${interaction.response}\n\n\n`;
      });
    } else {
      textContent += `═══════════════════════════════════════════════════════\n`;
      textContent += `AI INTERACTIONS\n`;
      textContent += `═══════════════════════════════════════════════════════\n\n`;
      textContent += `No AI interactions yet.\n`;
      textContent += `You can generate explanations or ask questions about this document.\n\n`;
    }

    return {
      fileContent,
      fileName: document.originalName,
      textContent,
      mimeType: document.mimeType,
    };
  }

  private async processOCR(documentId: string) {
    try {
      // Update status to processing
      await this.prisma.document.update({
        where: { id: documentId },
        data: { uploadStatus: 'PROCESSING' },
      });

      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // Create or update OCR result status
      await this.prisma.oCRResult.upsert({
        where: { documentId },
        create: {
          documentId,
          status: 'PROCESSING',
          extractedText: '',
        },
        update: {
          status: 'PROCESSING',
        },
      });

      // Process OCR (pass mimeType to handle PDFs vs images)
      const ocrResult = await this.ocrService.extractText(document.filePath, document.mimeType);

      // Generate summary using LLM
      let summary: string | null = null;
      if (ocrResult.text && ocrResult.text.trim().length > 0) {
        try {
          const summaryPrompt = `Based on this document, create a very brief, concise summary (one sentence, maximum 20 words) that describes what this document is about. Focus on the key purpose, subject, or main content. Examples:
- "Case for the company Charla for the JR AI Engineer role"
- "Invoice from Company ABC for services totaling $X"
- "Student academic transcript from University XYZ"
- "Notebook purchase receipt from Store X for $Y"
Keep it very short and descriptive. Only describe what the document is, not all its details.`;
          const summaryText = ocrResult.text.substring(0, 3000);
          const summaryResponse = await this.llmService.generateExplanation(
            summaryText,
            summaryPrompt,
          );
          // Clean up the summary - remove quotes, extra whitespace, and limit length
          summary = summaryResponse.text
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .trim()
            .substring(0, 150); // Limit to 150 characters
        } catch (error) {
          console.warn('Failed to generate summary, continuing without it:', error);
          // Continue without summary if LLM fails
        }
      }

      // Update OCR result
      await this.prisma.oCRResult.update({
        where: { documentId },
        data: {
          extractedText: ocrResult.text,
          ...(summary && { summary: summary }),
          confidence: ocrResult.confidence,
          processingTime: ocrResult.processingTime,
          status: 'COMPLETED',
        } as any, // Type assertion for summary field until Prisma client is regenerated
      });

      // Update document status
      await this.prisma.document.update({
        where: { id: documentId },
        data: { uploadStatus: 'COMPLETED' },
      });
    } catch (error) {
      console.error('OCR processing error:', error);

      // Update status to failed
      await this.prisma.document.update({
        where: { id: documentId },
        data: { uploadStatus: 'FAILED' },
      });

      await this.prisma.oCRResult.update({
        where: { documentId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }      );
    }
  }

  async deleteDocument(id: string, userId: string) {
    // Verify document exists and belongs to user
    const document = await this.findOne(id, userId);

    // Delete the physical file
    try {
      const filePath = document.filePath;
      const { existsSync, unlinkSync } = require('fs');
      const { resolve } = require('path');
      const resolvedPath = resolve(filePath);
      
      if (existsSync(resolvedPath)) {
        unlinkSync(resolvedPath);
      }
    } catch (error) {
      console.warn(`Failed to delete file for document ${id}:`, error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database (cascading will handle OCR results and LLM interactions)
    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Document deleted successfully' };
  }

  async reprocessOCR(id: string, userId: string) {
    // Verify document exists and belongs to user
    await this.findOne(id, userId);

    // Delete existing OCR result if any
    await this.prisma.oCRResult.deleteMany({
      where: { documentId: id },
    });

    // Trigger OCR processing again
    this.processOCR(id).catch((error) => {
      console.error(`OCR reprocessing failed for document ${id}:`, error);
    });

    return { message: 'OCR reprocessing started' };
  }
}
