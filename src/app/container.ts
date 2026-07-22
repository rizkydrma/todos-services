import { createDb } from '../db';
import { requireR2Env, type R2Env } from '../lib/r2';
import { buildAuthUseCases, type AuthUseCases } from '../modules/auth';
import { buildAuthDeps } from '../modules/auth/build-deps';
import { D1UserRepository } from '../modules/auth/infrastructure/d1-user.repository';
import { buildCategoriesUseCases, type CategoriesUseCases } from '../modules/categories';
import { D1CategoryRepository } from '../modules/categories/infrastructure/d1-category.repository';
import { buildTagsUseCases, type TagsUseCases } from '../modules/tags';
import { D1TagRepository } from '../modules/tags/infrastructure/d1-tag.repository';
import { buildTodosUseCases, type TodosUseCases } from '../modules/todos';
import { D1TodoRepository } from '../modules/todos/infrastructure/d1-todo.repository';
import { buildUploadsUseCases, type UploadsUseCases } from '../modules/uploads';
import { R2ObjectStorage } from '../modules/uploads/infrastructure/r2-object-storage';
import { buildUsersUseCases, type UsersUseCases } from '../modules/users';
import { AppError } from '../platform/errors/app-error';
import { uuidIdGenerator } from '../shared/ports/id-generator';

/**
 * Composition root — wire infrastructure adapters to use cases.
 */
export type AppContainer = {
  auth: AuthUseCases;
  todos: TodosUseCases;
  categories: CategoriesUseCases;
  tags: TagsUseCases;
  uploads: UploadsUseCases;
  users: UsersUseCases;
};

export type AppBindings = {
  DB: D1Database;
  FIREBASE_PROJECT_ID: string;
  JWT_SECRET: string;
  EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_URL?: string;
};

/**
 * Build the app container from Worker bindings.
 * When bindings are missing (lightweight route unit tests), stubs throw only if invoked.
 */
export function buildContainer(env?: AppBindings | null): AppContainer {
  if (!env?.DB || !env.JWT_SECRET) {
    return {
      auth: unboundAuthUseCases(),
      todos: unboundTodosUseCases(),
      categories: unboundCategoriesUseCases(),
      tags: unboundTagsUseCases(),
      uploads: unboundUploadsUseCases(),
      users: unboundUsersUseCases(),
    };
  }

  const db = createDb(env.DB);
  const todoRepo = new D1TodoRepository(db);
  const categoryRepo = new D1CategoryRepository(db);
  const tagRepo = new D1TagRepository(db);
  const userRepo = new D1UserRepository(db);
  const ids = uuidIdGenerator;
  const r2 = optionalR2(env);

  return {
    auth: buildAuthUseCases(
      buildAuthDeps({
        db,
        jwtSecret: env.JWT_SECRET,
        emailEnv: env,
        r2,
        userRepo,
      }),
    ),
    todos: buildTodosUseCases({
      todoRepo,
      categoryReader: categoryRepo,
      tagReader: tagRepo,
      ids,
    }),
    categories: buildCategoriesUseCases({ categoryRepo, ids }),
    tags: buildTagsUseCases({ tagRepo, ids }),
    uploads: buildUploadsFromEnv(env),
    users: buildUsersUseCases({
      userRepo,
      r2PublicUrl: env.R2_PUBLIC_URL,
    }),
  };
}

function optionalR2(env: AppBindings): R2Env | undefined {
  try {
    return requireR2Env(env);
  } catch {
    return undefined;
  }
}

function buildUploadsFromEnv(env: AppBindings): UploadsUseCases {
  try {
    const r2 = requireR2Env(env);
    return buildUploadsUseCases({ storage: new R2ObjectStorage(r2) });
  } catch {
    return unboundUploadsUseCases(true);
  }
}

function unboundAuthUseCases(): AuthUseCases {
  const missing = async () => {
    throw new Error('DB/JWT bindings are required for auth use cases');
  };
  return {
    register: missing as AuthUseCases['register'],
    login: missing as AuthUseCases['login'],
    verifyEmail: missing as AuthUseCases['verifyEmail'],
    resendVerification: missing as AuthUseCases['resendVerification'],
    loginWithGoogle: missing as AuthUseCases['loginWithGoogle'],
    refresh: missing as AuthUseCases['refresh'],
    logout: missing as AuthUseCases['logout'],
    getProfile: missing as AuthUseCases['getProfile'],
    updateProfile: missing as AuthUseCases['updateProfile'],
    resolveAccessUser: missing as AuthUseCases['resolveAccessUser'],
  };
}

function unboundTodosUseCases(): TodosUseCases {
  const missing = async () => {
    throw new Error('DB binding is required for todos use cases');
  };
  return {
    list: missing as TodosUseCases['list'],
    get: missing as TodosUseCases['get'],
    create: missing as TodosUseCases['create'],
    update: missing as TodosUseCases['update'],
    delete: missing as TodosUseCases['delete'],
    batch: missing as TodosUseCases['batch'],
  };
}

function unboundCategoriesUseCases(): CategoriesUseCases {
  const missing = async () => {
    throw new Error('DB binding is required for categories use cases');
  };
  return {
    list: missing as CategoriesUseCases['list'],
    create: missing as CategoriesUseCases['create'],
    update: missing as CategoriesUseCases['update'],
    delete: missing as CategoriesUseCases['delete'],
  };
}

function unboundTagsUseCases(): TagsUseCases {
  const missing = async () => {
    throw new Error('DB binding is required for tags use cases');
  };
  return {
    list: missing as TagsUseCases['list'],
    create: missing as TagsUseCases['create'],
    update: missing as TagsUseCases['update'],
    delete: missing as TagsUseCases['delete'],
  };
}

function unboundUploadsUseCases(r2Missing = false): UploadsUseCases {
  const missing = async () => {
    if (r2Missing) throw AppError.internal('R2 is not configured');
    throw new Error('R2/DB binding is required for uploads use cases');
  };
  return {
    getSingleUrl: missing as UploadsUseCases['getSingleUrl'],
    initMultipart: missing as UploadsUseCases['initMultipart'],
    getPartUrl: missing as UploadsUseCases['getPartUrl'],
    completeUpload: missing as UploadsUseCases['completeUpload'],
    abortUpload: missing as UploadsUseCases['abortUpload'],
  };
}

function unboundUsersUseCases(): UsersUseCases {
  const missing = async () => {
    throw new Error('DB binding is required for users use cases');
  };
  return {
    list: missing as UsersUseCases['list'],
    get: missing as UsersUseCases['get'],
    updateRole: missing as UsersUseCases['updateRole'],
    delete: missing as UsersUseCases['delete'],
  };
}
