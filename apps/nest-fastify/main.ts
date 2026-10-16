import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { config } from "../../shared/config.js";
import { HOST } from "../../shared/runtime.js";
import { AppModule } from "../nest-common/app.module.js";

const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ bodyLimit: 1024 * 1024 }), { logger: false });
app.useGlobalPipes(new ValidationPipe({ transform: true }));
await app.listen(config.port, HOST);
console.log(`nest-fastify listening on ${config.port}`);
