import { Injectable } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import * as fs from 'fs/promises';

export interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
}

@Injectable()
export class OcrService {
  async extractText(filePath: string, mimeType?: string): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Check if file exists
      await fs.access(filePath);

      // Handle PDF files
      if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
        const dataBuffer = await fs.readFile(filePath);
        // pdf-parse v2: PDFParse is a class, instantiate with buffer
        const pdfParseModule = require('pdf-parse');
        const PDFParse = pdfParseModule.PDFParse;
        
        if (!PDFParse) {
          throw new Error('pdf-parse PDFParse class not found');
        }
        
        // Create parser instance with data (not buffer)
        const parser = new PDFParse({ data: dataBuffer });
        // Get text using getText() method
        const pdfData = await parser.getText();
        
        const processingTime = Date.now() - startTime;

        return {
          text: pdfData.text ? pdfData.text.trim() : '',
          confidence: 100, // PDF text extraction is typically 100% accurate
          processingTime,
        };
      }

      // Handle image files with Tesseract OCR
      // Create a Tesseract worker
      const worker = await createWorker('eng');

      // Perform OCR
      const {
        data: { text, confidence },
      } = await worker.recognize(filePath);

      // Terminate the worker
      await worker.terminate();

      const processingTime = Date.now() - startTime;

      return {
        text: text.trim(),
        confidence: confidence || 0,
        processingTime,
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      throw new Error(
        `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
