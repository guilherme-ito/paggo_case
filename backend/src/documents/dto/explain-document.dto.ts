import { IsOptional, IsString } from 'class-validator';

export class ExplainDocumentDto {
  @IsOptional()
  @IsString()
  context?: string;
}
