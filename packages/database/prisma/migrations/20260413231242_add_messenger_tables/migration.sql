-- CreateTable
CREATE TABLE "message_queue" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "image_url" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "deal_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_send_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "interval_minutes" INTEGER NOT NULL DEFAULT 30,
    "channels" TEXT NOT NULL DEFAULT 'both',
    "auto_generate_from_deals" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "auto_send_config_pkey" PRIMARY KEY ("id")
);
