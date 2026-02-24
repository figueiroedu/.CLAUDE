---
name: node-fastify
description: Node.js + Fastify API patterns with TypeScript, SOLID principles, and clean architecture (services, repositories, domain). This skill should be used when building Fastify APIs, creating backend services, or reviewing Node.js server code.
allowed-tools: Read, Glob, Grep
---

# Node.js + Fastify Best Practices (2025)

## Architecture Overview

```
src/
├── domain/           # Business entities and value objects
├── repositories/     # Data access layer (interfaces + implementations)
├── services/         # Business logic orchestration
├── routes/           # Fastify route handlers (thin controllers)
├── plugins/          # Fastify plugins (auth, db, etc.)
├── schemas/          # JSON Schema / Zod validation
└── config/           # Environment and app configuration
```

## Domain Layer

Pure business entities with no framework dependencies.

```ts
type User = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

type CreateUserInput = {
  email: string;
  name: string;
}

type UserFilters = {
  email?: string;
  name?: string;
  limit?: number;
  offset?: number;
}
```

## Repository Layer

Data access abstraction. Interface defines contract, implementation handles persistence.

### Repository Interface

```ts
type UserRepository = {
  findById: (id: string) => Promise<User | null>;
  findMany: (filters: UserFilters) => Promise<User[]>;
  create: (input: CreateUserInput) => Promise<User>;
  update: (id: string, input: Partial<CreateUserInput>) => Promise<User>;
  delete: (id: string) => Promise<void>;
}
```

### Repository Implementation

```ts
import { eq } from "drizzle-orm";
import { db } from "../plugins/database";
import { users } from "../schemas/db";
import type { UserRepository, CreateUserInput, UserFilters } from "../domain/user";

export function createUserRepository(): UserRepository {
  return {
    async findById(id) {
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0] ?? null;
    },

    async findMany(filters) {
      let query = db.select().from(users);
      if (filters.email) query = query.where(eq(users.email, filters.email));
      if (filters.limit) query = query.limit(filters.limit);
      if (filters.offset) query = query.offset(filters.offset);
      return query;
    },

    async create(input) {
      const [user] = await db.insert(users).values({
        id: crypto.randomUUID(),
        ...input,
        createdAt: new Date(),
      }).returning();
      return user;
    },

    async update(id, input) {
      const [user] = await db.update(users)
        .set(input)
        .where(eq(users.id, id))
        .returning();
      return user;
    },

    async delete(id) {
      await db.delete(users).where(eq(users.id, id));
    },
  };
}
```

## Service Layer

Business logic orchestration. Services use repositories and other services.

```ts
import type { UserRepository, User, CreateUserInput } from "../domain/user";

type UserServiceDeps = {
  userRepository: UserRepository;
}

export function createUserService({ userRepository }: UserServiceDeps) {
  return {
    async getUser(id: string): Promise<User | null> {
      return userRepository.findById(id);
    },

    async createUser(input: CreateUserInput): Promise<User> {
      const existing = await userRepository.findMany({ email: input.email });
      if (existing.length > 0) {
        throw new Error("Email already in use");
      }
      return userRepository.create(input);
    },

    async updateUser(id: string, input: Partial<CreateUserInput>): Promise<User> {
      const user = await userRepository.findById(id);
      if (!user) {
        throw new Error("User not found");
      }
      return userRepository.update(id, input);
    },

    async deleteUser(id: string): Promise<void> {
      const user = await userRepository.findById(id);
      if (!user) {
        throw new Error("User not found");
      }
      return userRepository.delete(id);
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
```

## Route Handlers

Thin controllers that delegate to services. Handle HTTP concerns only.

```ts
import { FastifyPluginAsync } from "fastify";
import { createUserSchema, userParamsSchema, userResponseSchema } from "../schemas/user";
import type { UserService } from "../services/user";

type UserRoutesOpts = {
  userService: UserService;
}

export const userRoutes: FastifyPluginAsync<UserRoutesOpts> = async (fastify, opts) => {
  const { userService } = opts;

  fastify.get<{ Params: { id: string } }>("/:id", {
    schema: {
      params: userParamsSchema,
      response: { 200: userResponseSchema },
    },
  }, async (request, reply) => {
    const user = await userService.getUser(request.params.id);
    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }
    return user;
  });

  fastify.post<{ Body: { email: string; name: string } }>("/", {
    schema: {
      body: createUserSchema,
      response: { 201: userResponseSchema },
    },
  }, async (request, reply) => {
    const user = await userService.createUser(request.body);
    return reply.status(201).send(user);
  });
};
```

## Fastify Plugins

### Dependency Injection Plugin

```ts
import fp from "fastify-plugin";
import { createUserRepository } from "../repositories/user";
import { createUserService } from "../services/user";

declare module "fastify" {
  interface FastifyInstance {
    userService: ReturnType<typeof createUserService>;
  }
}

export default fp(async (fastify) => {
  const userRepository = createUserRepository();
  const userService = createUserService({ userRepository });

  fastify.decorate("userService", userService);
});
```

### Database Plugin

```ts
import fp from "fastify-plugin";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

declare module "fastify" {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle>;
  }
}

export default fp(async (fastify) => {
  const client = postgres(fastify.config.DATABASE_URL);
  const db = drizzle(client);

  fastify.decorate("db", db);
  fastify.addHook("onClose", async () => {
    await client.end();
  });
});
```

## Schema Validation

Use Zod with fastify-type-provider-zod or JSON Schema.

### Zod Approach

```ts
import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export const userParamsSchema = z.object({
  id: z.string().uuid(),
});

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.date(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

### App Setup with Zod

```ts
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";

const app = Fastify().withTypeProvider<ZodTypeProvider>();
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
```

## Error Handling

### Custom Error Classes

```ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}
```

### Error Handler Plugin

```ts
import fp from "fastify-plugin";
import { AppError } from "../domain/errors";

export default fp(async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }

    fastify.log.error(error);
    return reply.status(500).send({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  });
});
```

## Configuration

```ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
```

## App Bootstrap

```ts
import Fastify from "fastify";
import { config } from "./config";
import databasePlugin from "./plugins/database";
import servicesPlugin from "./plugins/services";
import errorHandlerPlugin from "./plugins/error-handler";
import { userRoutes } from "./routes/user";

async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(databasePlugin);
  await app.register(servicesPlugin);
  await app.register(errorHandlerPlugin);

  await app.register(userRoutes, {
    prefix: "/api/users",
    userService: app.userService,
  });

  return app;
}

async function start() {
  const app = await buildApp();
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
}

start();
```

## SOLID Principles Applied

### Single Responsibility
- Domain: Define entities and types only
- Repository: Data access only
- Service: Business logic only
- Routes: HTTP handling only

### Open/Closed
- Add new features by creating new services/repositories
- Extend behavior through composition, not modification

### Liskov Substitution
- Repository implementations are interchangeable
- Mock repositories for testing

### Interface Segregation
- Small, focused repository interfaces
- Services depend only on what they use

### Dependency Inversion
- Services depend on repository interfaces, not implementations
- Factory functions inject dependencies

## Testing

### Service Tests

```ts
import { describe, it, expect, vi } from "vitest";
import { createUserService } from "../services/user";

describe("UserService", () => {
  const mockRepository = {
    findById: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const service = createUserService({ userRepository: mockRepository });

  it("creates user when email is unique", async () => {
    mockRepository.findMany.mockResolvedValue([]);
    mockRepository.create.mockResolvedValue({ id: "1", email: "test@test.com", name: "Test" });

    const user = await service.createUser({ email: "test@test.com", name: "Test" });

    expect(user.email).toBe("test@test.com");
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it("throws when email exists", async () => {
    mockRepository.findMany.mockResolvedValue([{ id: "1", email: "test@test.com" }]);

    await expect(service.createUser({ email: "test@test.com", name: "Test" }))
      .rejects.toThrow("Email already in use");
  });
});
```

### Route Tests

```ts
import { describe, it, expect } from "vitest";
import { buildApp } from "../app";

describe("User Routes", () => {
  it("GET /api/users/:id returns user", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/users/123",
    });

    expect(response.statusCode).toBe(200);
  });
});
```

## Common Mistakes

❌ **Avoid:**
- Business logic in route handlers
- Direct database access in services
- Circular dependencies between layers
- God services that do everything
- Skipping validation at API boundaries
- Premature abstractions (one entity = one interface is enough)

✅ **Do:**
- Keep route handlers thin (delegate to services)
- Use factory functions for dependency injection
- Validate input at route level with schemas
- Test services in isolation with mocked repositories
- Use TypeScript types to enforce contracts
- Start simple, extract when patterns emerge
