import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  Body, CanActivate, Controller, ExecutionContext, Get, Header, HttpCode, Injectable,
  MiddlewareConsumer, Module, NestMiddleware, NotFoundException, Param, ParseIntPipe, Patch, Post, Query, Req,
  RequestMethod, UnauthorizedException, UseGuards,
} from "@nestjs/common";
import cors from "cors";
import { logger } from "../../shared/logger.js";
import * as svc from "../../shared/service.js";
import { BulkDto, CreateUserDto, ListPostsQuery, LoginDto, PatchUserDto } from "./dto.js";

@Injectable()
export class JwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = await svc.authenticate(req.headers.authorization);
    if (userId === null) throw new UnauthorizedException();
    req.userId = userId;
    return true;
  }
}

/** Request id -> logger -> CORS. Written against raw node req/res so it runs under both adapters. */
@Injectable()
export class FeedMiddleware implements NestMiddleware {
  private readonly corsHandler = cors();
  use(req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) {
    const reqId = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
    res.setHeader("x-request-id", reqId);
    const started = performance.now();
    res.on("finish", () => logger.info({ reqId, method: req.method, url: req.url, status: res.statusCode, ms: performance.now() - started }));
    this.corsHandler(req as never, res as never, next);
  }
}

@Controller()
export class AppController {
  @Get("health") @Header("content-type", "text/plain") health() { return "ok"; }
  @Get("plaintext") @Header("content-type", "text/plain") plaintext() { return "Hello, World!"; }
  @Get("json") json() { return { message: "Hello, World!" }; }
  @Get("large-json") largeJson() { return svc.buildLargePayload(); }

  @Get("users/:id")
  async getUser(@Param("id", ParseIntPipe) id: number) {
    const user = await svc.getUser(id);
    if (!user) throw new NotFoundException();
    return user;
  }

  @Post("users")
  createUser(@Body() dto: CreateUserDto) { return svc.createUser(dto); }

  @Patch("users/:id")
  async patchUser(@Param("id", ParseIntPipe) id: number, @Body() dto: PatchUserDto) {
    const user = await svc.patchUser(id, dto.name);
    if (!user) throw new NotFoundException();
    return user;
  }

  @Get("posts")
  listPosts(@Query() q: ListPostsQuery) { return svc.listPosts(q); }

  @Get("cache/posts/:id")
  async cachedPost(@Param("id", ParseIntPipe) id: number) {
    const post = await svc.cachedPost(id);
    if (!post) throw new NotFoundException();
    return post;
  }

  @Post("bulk") @HttpCode(200)
  bulk(@Body() dto: BulkDto) { return svc.bulk(dto); }

  @Post("auth/login") @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const result = await svc.login(dto);
    if (!result) throw new UnauthorizedException();
    return result;
  }

  @Get("me/feed") @UseGuards(JwtGuard)
  feed(@Req() req: { userId: number }) { return svc.feed(req.userId); }
}

@Module({ controllers: [AppController], providers: [JwtGuard, FeedMiddleware] })
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FeedMiddleware).forRoutes({ path: "me/feed", method: RequestMethod.GET });
  }
}
