import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class QueryDocumentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  query: string;
}
