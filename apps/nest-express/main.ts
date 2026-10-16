import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { config } from "../../shared/config.js";
import { HOST } from "../../shared/runtime.js";
import { AppModule } from "../nest-common/app.module.js";

const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
app.useBodyParser("json", { limit: "1mb" });
app.useGlobalPipes(new ValidationPipe({ transform: true }));
await app.listen(config.port, HOST);
console.log(`nest-express listening on ${config.port}`);
