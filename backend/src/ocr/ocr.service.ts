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
      // Check if file exists (handle both /tmp and regular paths)
      try {
        await fs.access(filePath);
      } catch (error) {
        // If file doesn't exist, it might be in /tmp (Vercel) or already processed
        // Try to continue anyway - the file might be accessible
        console.warn(`File access check failed for ${filePath}, attempting to read anyway`);
      }

      // Handle PDF files
      if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
        try {
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
        } catch (pdfError) {
          console.error('PDF parsing failed:', pdfError);
          throw new Error(
            `PDF text extraction failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`
          );
        }
      }

      // Handle image files with Tesseract OCR
      // Read file as buffer for Node.js environment
      const imageBuffer = await fs.readFile(filePath);
      
      try {
        // Create a Tesseract worker - use the correct API for Node.js
        const worker = await createWorker('eng', 1, {
          logger: () => {}, // Suppress logs
        });

        // Perform OCR with buffer (works in Node.js)
        const {
          data: { text, confidence },
        } = await worker.recognize(imageBuffer);

        // Terminate the worker
        await worker.terminate();

        const processingTime = Date.now() - startTime;

        return {
          text: text.trim(),
          confidence: confidence || 0,
          processingTime,
        };
      } catch (tesseractError) {
        // If Tesseract fails (e.g., DOMMatrix error in Node.js), provide a fallback
        console.error('Tesseract OCR failed, this might be a Node.js compatibility issue:', tesseractError);
        throw new Error(
          `OCR processing failed: Tesseract.js encountered an error. This may be due to Node.js environment compatibility. Error: ${tesseractError instanceof Error ? tesseractError.message : 'Unknown error'}`
        );
      }

      const processingTime = Date.now() - startTime;

      } catch (error) {
        console.error('OCR processing error:', error);
        throw new Error(
          `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
  }
}
