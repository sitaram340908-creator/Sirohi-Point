import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

function toArray(value: unknown): unknown {
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(','));
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return value;
}

export class CatalogQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  // Kept for backwards compatibility with existing clients.
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  subcategoryIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsIn(['newest', 'price-asc', 'price-desc'])
  sort?: 'newest' | 'price-asc' | 'price-desc';

  @IsOptional()
  @IsIn(['true', 'false'])
  inStock?: 'true' | 'false';
}
