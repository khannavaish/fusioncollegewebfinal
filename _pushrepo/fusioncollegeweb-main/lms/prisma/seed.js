import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/* ---------------------------------------------------
   UPDATE THESE VALUES BEFORE RUNNING THE SCRIPT
   --------------------------------------------------- */
const ADMIN_USER_ID = "YOUR_SUPABASE_USER_ID"; // Supabase "auth.users.id"
const ADMIN_EMAIL = "your@email.com";
const ADMIN_NAME = "Your Name";
/* --------------------------------------------------- */

async function main() {
  // This script creates a database profile for an existing Supabase user
  // Users should be created in Supabase Dashboard first, then use this script
  // to create the corresponding database profile

  await prisma.user.upsert({
    where: { authId: ADMIN_USER_ID },
    update: { email: ADMIN_EMAIL, role: "ADMIN" },
    create: {
      id: ADMIN_USER_ID,
      authId: ADMIN_USER_ID,
      email: ADMIN_EMAIL,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // Insert (or update) the Admin profile linked to that user
  await prisma.admin.upsert({
    where: { userId: ADMIN_USER_ID },
    update: { name: ADMIN_NAME },
    create: {
      id: ADMIN_USER_ID,
      userId: ADMIN_USER_ID,
      name: ADMIN_NAME,
    },
  });

  console.log("✅ Admin database profile created/updated");
  console.log("User ID:", ADMIN_USER_ID);
  console.log("Email:", ADMIN_EMAIL);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
