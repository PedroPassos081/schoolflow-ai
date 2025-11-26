import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
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

// SERVER ACTION – criar turma (apenas ADMIN)
async function createClass(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user as {
    id?: string | null;
    role?: "ADMIN" | "TEACHER" | "PARENT";
  };

  if (user.role !== "ADMIN") {
    throw new Error("Only admins can create classes");
  }

  const name = String(formData.get("name") || "").trim();
  const year = Number(formData.get("year"));
  const teacherId = String(formData.get("teacherId") || "").trim();

  if (!name || !year || !teacherId) {
    throw new Error("Missing fields");
  }

  await prisma.class.create({
    data: {
      name,
      year,
      teacherId,
    },
  });

  revalidatePath("/classes");
}

// SERVER ACTION – excluir turma (apenas ADMIN)
async function deleteClass(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user as {
    id?: string | null;
    role?: "ADMIN" | "TEACHER" | "PARENT";
  };

  if (user.role !== "ADMIN") {
    throw new Error("Only admins can delete classes");
  }

  const classId = String(formData.get("classId") || "").trim();
  if (!classId) {
    throw new Error("Missing classId");
  }

  // Apaga notas da turma
  await prisma.grade.deleteMany({
    where: { classId },
  });

  // Apaga matrículas da turma
  await prisma.enrollment.deleteMany({
    where: { classId },
  });

  // Apaga a turma em si
  await prisma.class.delete({
    where: { id: classId },
  });

  revalidatePath("/classes");
}

export default async function ClassesPage() {
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

  const isAdmin = user.role === "ADMIN";

  // Admin vê todas; Professor vê apenas as dele
  const where =
    user.role === "TEACHER" ? { teacherId: user.id ?? undefined } : undefined;

  const [classes, teachers] = await Promise.all([
    prisma.class.findMany({
      where,
      include: {
        teacher: true,
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "TEACHER" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 lg:px-6 lg:py-8">
        {/* HEADER */}
        <header className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
              Luma Class
            </p>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
                  Turmas
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  {isAdmin
                    ? "Gerencie as turmas da escola, responsáveis e quantidade de alunos."
                    : "Veja as turmas sob sua responsabilidade e acompanhe seus alunos."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {/* Botão para voltar ao dashboard */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-900/80 px-4 py-1.5 text-[11px] font-medium text-emerald-100 shadow-sm shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-slate-900 hover:shadow-lg hover:shadow-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <span className="text-xs">←</span>
              <span>Voltar para o dashboard</span>
            </Link>

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
          </div>
        </header>

        <main className="mt-6 grid flex-1 gap-6 lg:grid-cols-[2fr,1.1fr]">
          {/* LISTA DE TURMAS */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-emerald-500/5 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Turmas cadastradas
                </h2>
                <p className="mt-1 text-sm text-slate-200/80">
                  {classes.length === 0
                    ? "Ainda não há turmas cadastradas."
                    : "Veja as turmas, responsáveis e número de alunos."}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/20">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Turma</th>
                    <th className="px-4 py-3">Ano</th>
                    <th className="px-4 py-3">Professor(a)</th>
                    <th className="px-4 py-3 text-right">Alunos</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {classes.length === 0 && (
                    <tr>
                      <td
                        colSpan={isAdmin ? 5 : 4}
                        className="px-4 py-6 text-center text-sm text-slate-400"
                      >
                        Nenhuma turma cadastrada ainda.
                      </td>
                    </tr>
                  )}

                  {classes.map((cls) => (
                    <tr
                      key={cls.id}
                      className="border-t border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-50">
                        {cls.name}
                      </td>
                      <td className="px-4 py-3 text-slate-200/80">
                        {cls.year}
                      </td>
                      <td className="px-4 py-3 text-slate-200/80">
                        {cls.teacher?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-200/80">
                        {cls._count.students}
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <form action={deleteClass}>
                            <input
                              type="hidden"
                              name="classId"
                              value={cls.id}
                            />
                            <button
                              type="submit"
                              className="text-xs text-red-300 hover:text-red-200 underline underline-offset-2"
                            >
                              Excluir
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

          {/* FORM DE CRIAÇÃO – APENAS ADMIN */}
          <aside className="space-y-4">
            {isAdmin && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 backdrop-blur">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  Nova turma
                </h3>
                <p className="mt-1 text-xs text-emerald-100/80">
                  Defina o nome da turma, ano letivo e atribua um professor.
                </p>

                <form
                  action={createClass}
                  className="mt-4 space-y-3 text-sm text-slate-900"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-emerald-50">
                      Nome da turma
                    </label>
                    <input
                      name="name"
                      placeholder="Ex: 6º Ano A"
                      className="w-full rounded-lg border border-emerald-500/50 bg-slate-950/60 px-3 py-2 text-sm text-emerald-50 outline-none placeholder:text-emerald-200/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-emerald-50">
                      Ano letivo
                    </label>
                    <input
                      type="number"
                      name="year"
                      defaultValue={2025}
                      className="w-full rounded-lg border border-emerald-500/50 bg-slate-950/60 px-3 py-2 text-sm text-emerald-50 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-emerald-50">
                      Professor responsável
                    </label>
                    <select
                      name="teacherId"
                      className="w-full rounded-lg border border-emerald-500/50 bg-slate-950/60 px-3 py-2 text-sm text-emerald-50 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      defaultValue=""
                      required
                    >
                      <option value="" disabled>
                        Selecione um professor
                      </option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name ?? t.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="mt-2 w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Cadastrar turma
                  </button>
                </form>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-100/90 backdrop-blur">
              <p className="font-semibold text-[11px] uppercase tracking-[0.18em] text-slate-300">
                Próximos passos
              </p>
              <p className="mt-2 text-[13px] leading-relaxed">
                Em breve, cada turma terá sua própria página com alunos, notas e
                relatórios da IA. Este é o primeiro passo para transformar o
                Luma Class em um painel completo de gestão escolar.
              </p>

              <div className="mt-3 md:hidden"></div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
