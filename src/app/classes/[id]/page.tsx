import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";

function getInitials(name?: string | null, email?: string | null) {
  const base = name && name.trim().length > 0 ? name : email ?? "";
  if (!base) return "?";

  const parts = base.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();

  const first = parts[0]![0] ?? "";
  const last = parts[parts.length - 1]![0] ?? "";
  return (first + last).toUpperCase();
}

// SERVER ACTION – adicionar aluno à turma
async function addStudentToClass(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user as {
    id?: string | null;
    role?: "ADMIN" | "TEACHER" | "PARENT";
  };

  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    throw new Error("Only admins or teachers can add students");
  }

  const classId = String(formData.get("classId") || "").trim();
  const studentName = String(formData.get("studentName") || "").trim();

  if (!classId || !studentName) {
    throw new Error("Missing fields");
  }

  const student = await prisma.student.create({
    data: { name: studentName },
  });

  await prisma.enrollment.create({
    data: {
      studentId: student.id,
      classId,
    },
  });

  revalidatePath(`/classes/${classId}`);
}

// SERVER ACTION – remover aluno da turma
async function removeStudentFromClass(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user as {
    id?: string | null;
    role?: "ADMIN" | "TEACHER" | "PARENT";
  };

  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    throw new Error("Only admins or teachers can remove students");
  }

  const classId = String(formData.get("classId") || "").trim();
  const enrollmentId = String(formData.get("enrollmentId") || "").trim();

  if (!classId || !enrollmentId) {
    throw new Error("Missing fields");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) {
    return;
  }

  await prisma.grade.deleteMany({
    where: {
      classId,
      studentId: enrollment.studentId,
    },
  });

  await prisma.enrollment.delete({
    where: { id: enrollmentId },
  });

  revalidatePath(`/classes/${classId}`);
}

// SERVER ACTION – registrar nota para um aluno da turma
async function addGradeToStudent(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user as {
    id?: string | null;
    role?: "ADMIN" | "TEACHER" | "PARENT";
  };

  // Só ADMIN e TEACHER podem lançar nota
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    throw new Error("Only admins or teachers can add grades");
  }

  const classId = String(formData.get("classId") || "").trim();
  const studentId = String(formData.get("studentId") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const valueRaw = String(formData.get("value") || "").replace(",", ".");
  const value = Number(valueRaw);

  // Captura o Bimestre (term) do formulário
  const termRaw = formData.get("term");
  const term = termRaw ? Number(termRaw) : 1;

  if (!classId || !studentId || !subject || Number.isNaN(value)) {
    throw new Error("Missing or invalid fields");
  }

  await prisma.grade.create({
    data: {
      classId,
      studentId,
      subjectId: subject, // CORRIGIDO: Usa subjectId para passar o ID
      value,
      term: term, // CORRIGIDO: Passa o bimestre capturado
    },
  });

  revalidatePath(`/classes/${classId}`);
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user as {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    role?: "ADMIN" | "TEACHER" | "PARENT";
  };

  const { id } = await params;
  const classId = id;

  if (!classId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <div className="text-center space-y-2">
          <p>Class detail debug</p>
          <p>params.id vazio – verifique se o link está /classes/ID</p>
          <Link
            href="/classes"
            className="mt-4 inline-flex text-sm underline underline-offset-4"
          >
            ← Voltar para turmas
          </Link>
        </div>
      </div>
    );
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      teacher: true,
      students: {
        include: { student: true },
        orderBy: { student: { name: "asc" } },
      },
    },
  });

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
  });

  if (!cls) {
    notFound();
  }

  const isAdminOrTeacher = user.role === "ADMIN" || user.role === "TEACHER";
  const totalStudents = cls.students.length;

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 lg:px-6 lg:py-8">
        {/* HEADER */}
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-col gap-2">
            <Link
              href="/classes"
              className="text-xs font-medium text-slate-300 underline underline-offset-4 hover:text-slate-50"
            >
              ← Voltar para turmas
            </Link>

            <div>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
                Luma Class
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight lg:text-3xl">
                {cls.name}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Ano letivo {cls.year} •{" "}
                {cls.teacher
                  ? `Professor(a): ${cls.teacher.name}`
                  : "Professor não definido"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/90 text-sm font-semibold">
              {getInitials(user.name, user.email)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight">
                {user.name ?? user.email}
              </span>
              <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-300">
                {user.role === "ADMIN" && "Administrador"}
                {user.role === "TEACHER" && "Professor(a)"}
                {user.role === "PARENT" && "Responsável"}
              </span>
            </div>
          </div>
        </header>

        <main className="mt-6 grid flex-1 gap-6 lg:grid-cols-[2fr,1.1fr]">
          {/* LISTA DE ALUNOS */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-emerald-500/5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Alunos da turma
                </h2>
                <p className="mt-1 text-sm text-slate-200/80">
                  {totalStudents === 0
                    ? "Ainda não há alunos cadastrados nesta turma."
                    : `Esta turma tem ${totalStudents} aluno${
                        totalStudents > 1 ? "s" : ""
                      } matriculado${totalStudents > 1 ? "s" : ""}.`}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/20">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Aluno</th>
                    {isAdminOrTeacher && (
                      <th className="px-4 py-3 text-right">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {cls.students.length === 0 && (
                    <tr>
                      <td
                        colSpan={isAdminOrTeacher ? 2 : 1}
                        className="px-4 py-6 text-center text-sm text-slate-400"
                      >
                        Nenhum aluno matriculado ainda.
                      </td>
                    </tr>
                  )}

                  {cls.students.map((enrollment) => (
                    <tr
                      key={enrollment.id}
                      className="border-t border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-50">
                        {enrollment.student.name}
                      </td>

                      {isAdminOrTeacher && (
                        <td className="px-4 py-3 text-right align-top">
                          {/* Remover aluno */}
                          <form action={removeStudentFromClass}>
                            <input
                              type="hidden"
                              name="classId"
                              value={cls.id}
                            />
                            <input
                              type="hidden"
                              name="enrollmentId"
                              value={enrollment.id}
                            />
                            <button
                              type="submit"
                              className="text-xs text-red-300 hover:text-red-200 underline underline-offset-2 mb-2"
                            >
                              Remover
                            </button>
                          </form>

                          {/* Lançar nota */}
                          <form
                            action={addGradeToStudent}
                            className="mt-2 flex flex-col gap-2 text-xs text-slate-900"
                          >
                            <input
                              type="hidden"
                              name="classId"
                              value={cls.id}
                            />
                            <input
                              type="hidden"
                              name="studentId"
                              value={enrollment.student.id}
                            />

                            {/* SELECT DE BIMESTRE (NOVO) */}
                            <select
                              name="term"
                              className="w-full rounded-md border border-emerald-500/40 bg-slate-950/60 px-2 py-1 text-[11px] text-emerald-50 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            >
                              <option value="1">1º Bimestre</option>
                              <option value="2">2º Bimestre</option>
                              <option value="3">3º Bimestre</option>
                              <option value="4">4º Bimestre</option>
                            </select>

                            <select
                              name="subject"
                              required
                              className="w-full rounded-md border border-emerald-500/40 bg-slate-950/60 px-2 py-1 text-[11px] text-emerald-50 focus:border-emerald-400 focus:outline-none"
                              defaultValue=""
                            >
                              <option value="" disabled>
                                Selecione a matéria
                              </option>
                              {subjects.map((sub) => (
                                <option
                                  key={sub.id}
                                  value={sub.id}
                                  className="text-slate-900"
                                >
                                  {sub.name}
                                </option>
                              ))}
                            </select>

                            <input
                              name="value"
                              type="number"
                              step="0.1"
                              min={0}
                              max={10}
                              placeholder="Nota (0–10)"
                              className="w-full rounded-md border border-emerald-500/40 bg-slate-950/60 px-2 py-1 text-[11px] text-emerald-50 placeholder:text-emerald-200/50 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              required
                            />

                            <button
                              type="submit"
                              className="rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
                            >
                              Lançar nota
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* FORM – ADICIONAR ALUNO */}
          <aside className="space-y-4">
            {isAdminOrTeacher && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 backdrop-blur">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  Adicionar aluno à turma
                </h3>
                <p className="mt-1 text-xs text-emerald-100/80">
                  Cadastre um novo aluno já vinculado a esta turma.
                </p>

                <form
                  action={addStudentToClass}
                  className="mt-4 space-y-3 text-sm text-slate-900"
                >
                  <input type="hidden" name="classId" value={cls.id} />

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-emerald-50">
                      Nome do aluno
                    </label>
                    <input
                      name="studentName"
                      placeholder="Ex: João da Silva"
                      className="w-full rounded-lg border border-emerald-500/50 bg-slate-950/60 px-3 py-2 text-sm text-emerald-50 outline-none placeholder:text-emerald-200/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-2 w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Adicionar aluno
                  </button>
                </form>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-100/90 backdrop-blur">
              <p className="font-semibold text-[11px] uppercase tracking-[0.18em] text-slate-300">
                Próximos passos da turma
              </p>
              <p className="mt-2 text-[13px] leading-relaxed">
                Em breve, esta página mostrará notas por disciplina, presença e
                relatórios gerados pela IA para cada aluno da turma.
              </p>
              <div className="mt-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center text-[11px] text-slate-200/90 underline underline-offset-4 hover:text-slate-50"
                >
                  ← Voltar para o dashboard
                </Link>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
