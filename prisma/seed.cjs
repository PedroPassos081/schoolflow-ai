/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("123456", 10);

  // ADMIN
  await prisma.user.upsert({
    where: { email: "admin@schoolflow.dev" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@schoolflow.dev",
      password,
      role: Role.ADMIN,
    },
  });

  // PROFESSOR
  await prisma.user.upsert({
    where: { email: "prof@schoolflow.dev" },
    update: {},
    create: {
      name: "Professora Ana",
      email: "prof@schoolflow.dev",
      password,
      role: Role.TEACHER,
    },
  });

  // RESPONSÁVEL
  await prisma.user.upsert({
    where: { email: "pai@schoolflow.dev" },
    update: {},
    create: {
      name: "Pai do João",
      email: "pai@schoolflow.dev",
      password,
      role: Role.PARENT,
    },
  });

  console.log("✅ Seed criado com sucesso!");
  console.log("Logins:");
  console.log("  admin@schoolflow.dev / 123456");
  console.log("  prof@schoolflow.dev  / 123456");
  console.log("  pai@schoolflow.dev   / 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
