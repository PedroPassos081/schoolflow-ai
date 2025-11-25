/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

/**
 * Cria os 3 usuários base: admin, professor, responsável
 */
async function seedUsers() {
  const password = await bcrypt.hash("123456", 10);

  // ADMIN
  await prisma.user.upsert({
    where: { email: "admin@schoolflow.dev" },
    update: {},
    create: {
      name: "Admin SchoolFlow",
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

  console.log("✅ Usuários criados.");
}

/**
 * Cria turmas, alunos, matérias e notas fake
 * (precisa ter os models Class, Student, Enrollment, Subject e Grade no schema.prisma)
 */
async function seedSchool() {
  const teacher = await prisma.user.findUnique({
    where: { email: "prof@schoolflow.dev" },
  });

  if (!teacher) {
    console.log("⚠️ Professor não encontrado, verifique o seed de usuários.");
    return;
  }

  // Turmas
  const turma6A = await prisma.class.create({
    data: {
      name: "6º Ano A",
      year: 2025,
      teacherId: teacher.id,
    },
  });

  const turma7B = await prisma.class.create({
    data: {
      name: "7º Ano B",
      year: 2025,
      teacherId: teacher.id,
    },
  });

  // Matérias
  const [matematica, portugues] = await Promise.all([
    prisma.subject.create({ data: { name: "Matemática" } }),
    prisma.subject.create({ data: { name: "Português" } }),
  ]);

  // Alunos
  const alunos = await prisma.$transaction([
    prisma.student.create({ data: { name: "João Silva" } }),
    prisma.student.create({ data: { name: "Maria Oliveira" } }),
    prisma.student.create({ data: { name: "Lucas Santos" } }),
    prisma.student.create({ data: { name: "Ana Costa" } }),
  ]);

  // Matrículas
  await prisma.$transaction([
    prisma.enrollment.create({
      data: { studentId: alunos[0].id, classId: turma6A.id },
    }),
    prisma.enrollment.create({
      data: { studentId: alunos[1].id, classId: turma6A.id },
    }),
    prisma.enrollment.create({
      data: { studentId: alunos[2].id, classId: turma7B.id },
    }),
    prisma.enrollment.create({
      data: { studentId: alunos[3].id, classId: turma7B.id },
    }),
  ]);

  // Notas
  const gradesData = [
    {
      student: alunos[0],
      classId: turma6A.id,
      subjectId: matematica.id,
      value: 8.5,
    },
    {
      student: alunos[0],
      classId: turma6A.id,
      subjectId: portugues.id,
      value: 7.0,
    },
    {
      student: alunos[1],
      classId: turma6A.id,
      subjectId: matematica.id,
      value: 6.0,
    },
    {
      student: alunos[1],
      classId: turma6A.id,
      subjectId: portugues.id,
      value: 9.0,
    },
    {
      student: alunos[2],
      classId: turma7B.id,
      subjectId: matematica.id,
      value: 5.5,
    },
    {
      student: alunos[2],
      classId: turma7B.id,
      subjectId: portugues.id,
      value: 6.5,
    },
    {
      student: alunos[3],
      classId: turma7B.id,
      subjectId: matematica.id,
      value: 9.2,
    },
    {
      student: alunos[3],
      classId: turma7B.id,
      subjectId: portugues.id,
      value: 8.8,
    },
  ];

  await prisma.grade.createMany({
    data: gradesData.map((g) => ({
      studentId: g.student.id,
      classId: g.classId,
      subjectId: g.subjectId,
      value: g.value,
      term: 1,
    })),
  });

  console.log("📚 Dados de escola criados (turmas, alunos, matérias, notas).");
}

/**
 * Execução principal
 */
async function main() {
  await seedUsers();
  await seedSchool();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
