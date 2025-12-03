import { IsNotEmpty, IsString } from 'class-validator';

export class UploadDocumentDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  originalName: string;

  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @IsNotEmpty()
  fileSize: number;

  @IsNotEmpty()
  @IsString()
  filePath: string;
}
