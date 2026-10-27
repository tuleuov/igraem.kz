-- CreateTable: play_proposals
CREATE TABLE "play_proposals" (
    "id" TEXT NOT NULL,
    "organizer_id" TEXT NOT NULL,
    "sport_type" TEXT NOT NULL,
    "event_date" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT,
    "location_text" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "max_participants" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "play_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: proposal_participants
CREATE TABLE "proposal_participants" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposal_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: proposal_messages
CREATE TABLE "proposal_messages" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "play_proposals_event_date_status_idx" ON "play_proposals"("event_date", "status");
CREATE INDEX "play_proposals_sport_type_status_idx" ON "play_proposals"("sport_type", "status");
CREATE INDEX "play_proposals_organizer_id_idx" ON "play_proposals"("organizer_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_participants_proposal_id_user_id_key" ON "proposal_participants"("proposal_id", "user_id");
CREATE INDEX "proposal_participants_proposal_id_status_idx" ON "proposal_participants"("proposal_id", "status");

-- CreateIndex
CREATE INDEX "proposal_messages_proposal_id_created_at_idx" ON "proposal_messages"("proposal_id", "created_at");

-- AddForeignKey
ALTER TABLE "play_proposals" ADD CONSTRAINT "play_proposals_organizer_id_fkey"
    FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_participants" ADD CONSTRAINT "proposal_participants_proposal_id_fkey"
    FOREIGN KEY ("proposal_id") REFERENCES "play_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_participants" ADD CONSTRAINT "proposal_participants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_messages" ADD CONSTRAINT "proposal_messages_proposal_id_fkey"
    FOREIGN KEY ("proposal_id") REFERENCES "play_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proposal_messages" ADD CONSTRAINT "proposal_messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
