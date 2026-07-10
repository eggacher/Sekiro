-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "nickname" VARCHAR(32) NOT NULL,
    "email" VARCHAR(128),
    "phone" VARCHAR(20),
    "avatar" VARCHAR(512),
    "dept_id" INTEGER,
    "status" VARCHAR(16) NOT NULL DEFAULT 'enabled',
    "locked_until" TIMESTAMP(3),
    "login_fail_count" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "description" VARCHAR(255),
    "data_scope" VARCHAR(32) NOT NULL DEFAULT 'self',
    "status" VARCHAR(16) NOT NULL DEFAULT 'enabled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "title" VARCHAR(32) NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "path" VARCHAR(128),
    "component" VARCHAR(128),
    "icon" VARCHAR(64),
    "permission" VARCHAR(128),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "cache" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(16) NOT NULL DEFAULT 'enabled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dept" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "name" VARCHAR(32) NOT NULL,
    "leader" VARCHAR(32),
    "phone" VARCHAR(20),
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'enabled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'enabled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_menu" (
    "role_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,

    CONSTRAINT "role_menu_pkey" PRIMARY KEY ("role_id","menu_id")
);

-- CreateTable
CREATE TABLE "user_position" (
    "user_id" INTEGER NOT NULL,
    "position_id" INTEGER NOT NULL,

    CONSTRAINT "user_position_pkey" PRIMARY KEY ("user_id","position_id")
);

-- CreateTable
CREATE TABLE "role_dept" (
    "role_id" INTEGER NOT NULL,
    "dept_id" INTEGER NOT NULL,

    CONSTRAINT "role_dept_pkey" PRIMARY KEY ("role_id","dept_id")
);

-- CreateTable
CREATE TABLE "dict_type" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "remark" VARCHAR(255),
    "status" VARCHAR(16) NOT NULL DEFAULT 'enabled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dict_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dict_item" (
    "id" SERIAL NOT NULL,
    "type_id" INTEGER NOT NULL,
    "label" VARCHAR(64) NOT NULL,
    "value" VARCHAR(64) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(16) NOT NULL DEFAULT 'enabled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "dict_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" VARCHAR(128) NOT NULL,
    "value" TEXT NOT NULL,
    "remark" VARCHAR(255),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "login_log" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "ip" VARCHAR(64) NOT NULL,
    "location" VARCHAR(128),
    "browser" VARCHAR(64),
    "os" VARCHAR(64),
    "result" VARCHAR(16) NOT NULL,
    "message" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_log" (
    "id" SERIAL NOT NULL,
    "operator" VARCHAR(32) NOT NULL,
    "module" VARCHAR(64) NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "method" VARCHAR(8) NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "ip" VARCHAR(64) NOT NULL,
    "cost" INTEGER NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "role_code_key" ON "role"("code");

-- CreateIndex
CREATE INDEX "menu_parent_id_idx" ON "menu"("parent_id");

-- CreateIndex
CREATE INDEX "dept_parent_id_idx" ON "dept"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "position_name_key" ON "position"("name");

-- CreateIndex
CREATE UNIQUE INDEX "position_code_key" ON "position"("code");

-- CreateIndex
CREATE INDEX "user_role_role_id_idx" ON "user_role"("role_id");

-- CreateIndex
CREATE INDEX "role_menu_menu_id_idx" ON "role_menu"("menu_id");

-- CreateIndex
CREATE INDEX "user_position_position_id_idx" ON "user_position"("position_id");

-- CreateIndex
CREATE INDEX "role_dept_dept_id_idx" ON "role_dept"("dept_id");

-- CreateIndex
CREATE UNIQUE INDEX "dict_type_name_key" ON "dict_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dict_type_code_key" ON "dict_type"("code");

-- CreateIndex
CREATE INDEX "dict_item_type_id_idx" ON "dict_item"("type_id");

-- CreateIndex
CREATE UNIQUE INDEX "dict_item_type_id_value_key" ON "dict_item"("type_id", "value");

-- CreateIndex
CREATE INDEX "login_log_username_idx" ON "login_log"("username");

-- CreateIndex
CREATE INDEX "login_log_created_at_idx" ON "login_log"("created_at");

-- CreateIndex
CREATE INDEX "operation_log_operator_idx" ON "operation_log"("operator");

-- CreateIndex
CREATE INDEX "operation_log_created_at_idx" ON "operation_log"("created_at");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "dept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu" ADD CONSTRAINT "menu_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dept" ADD CONSTRAINT "dept_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "dept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_menu" ADD CONSTRAINT "role_menu_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_menu" ADD CONSTRAINT "role_menu_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_position" ADD CONSTRAINT "user_position_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_position" ADD CONSTRAINT "user_position_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_dept" ADD CONSTRAINT "role_dept_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_dept" ADD CONSTRAINT "role_dept_dept_id_fkey" FOREIGN KEY ("dept_id") REFERENCES "dept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dict_item" ADD CONSTRAINT "dict_item_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "dict_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

