import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsEmail, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min, ValidateNested } from "class-validator";

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @Length(1, 100) name!: string;
}

export class PatchUserDto {
  @IsOptional() @IsString() @Length(1, 100) name?: string;
}

export class ListPostsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset: number = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) authorId?: number;
}

export class BulkItemDto {
  @IsInt() id!: number;
  @IsNumber() value!: number;
  @IsString() @MaxLength(500) label!: string;
}

export class BulkDto {
  @IsArray() @ArrayMaxSize(5000) @ValidateNested({ each: true }) @Type(() => BulkItemDto)
  items!: BulkItemDto[];
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @Length(1, 200) password!: string;
}
