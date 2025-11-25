import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function getInitials(name?: string | null, email?: string | null) {
  const base = name && name.trim().length > 0 ? name : email ?? "";
  if (!base) return "?";

  const parts = base.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();

  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const user = session.user as {
    name?: string | null;
    email?: string | null;
    role?: "ADMIN" | "TEACHER" | "PARENT";
  };

  // métricas para admin
  let adminMetrics: {
    totalStudents: number;
    totalClasses: number;
    riskStudents: number;
  } | null = null;

  if (user.role === "ADMIN") {
    const [totalStudents, totalClasses, riskStudents] = await Promise.all([
      prisma.student.count(),
      prisma.class.count(),
      prisma.grade.count({
        where: {
          value: { lt: 6 }, // alunos "em risco" com nota < 6
        },
      }),
    ]);

    adminMetrics = { totalStudents, totalClasses, riskStudents };
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 lg:px-6 lg:py-8">
        {/* HEADER */}
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
              Luma Class
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight lg:text-3xl">
              Painel da escola
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Bem-vindo(a),{" "}
              <span className="font-medium">{user.name ?? user.email}</span>.{" "}
              Aqui é onde você acompanha tudo o que importa no seu dia a dia.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/90 text-sm font-semibold">
              {getInitials(user.name, user.email)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight">
                {user.name}
              </span>
              <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-300">
                {user.role === "ADMIN" && "Administrador"}
                {user.role === "TEACHER" && "Professor(a)"}
                {user.role === "PARENT" && "Responsável"}
              </span>
            </div>
          </div>
        </header>

        {/* MAIN GRID */}
        <main className="mt-6 grid flex-1 gap-6 lg:grid-cols-[2fr,1.1fr]">
          {/* COLUNA ESQUERDA – CONTEÚDO PRINCIPAL POR PAPEL */}
          <section className="space-y-4">
            {user.role === "ADMIN" && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-emerald-500/5 backdrop-blur">
                <h2 className="text-lg font-semibold tracking-tight">
                  Visão geral da escola
                </h2>
                <p className="mt-1 text-sm text-slate-200/80">
                  Aqui você vai acompanhar matrículas, engajamento dos alunos,
                  desempenho das turmas e relatórios gerados pela IA.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                    <p className="text-xs text-slate-300">Alunos ativos</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {adminMetrics ? adminMetrics.totalStudents : "—"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Total de estudantes cadastrados no sistema.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                    <p className="text-xs text-slate-300">Turmas</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {adminMetrics ? adminMetrics.totalClasses : "—"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Resumo das turmas cadastradas.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                    <p className="text-xs text-slate-300">
                      Alertas da inteligência
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-amber-300">
                      {adminMetrics ? adminMetrics.riskStudents : "—"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Alunos com nota abaixo de 6, que podem precisar de
                      atenção.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {user.role === "TEACHER" && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-emerald-500/5 backdrop-blur">
                <h2 className="text-lg font-semibold tracking-tight">
                  Sua sala de aula digital
                </h2>
                <p className="mt-1 text-sm text-slate-200/80">
                  Aqui você acompanha rapidamente o desempenho das turmas,
                  atividades recentes e alertas enviados pela IA.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                    <p className="text-xs text-slate-300">
                      Turmas sob sua responsabilidade
                    </p>
                    <p className="mt-1 text-2xl font-semibold">—</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Em breve: listagem de turmas com acesso rápido.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                    <p className="text-xs text-slate-300">
                      Alunos que precisam de atenção
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-amber-300">
                      —
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Alunos com queda de notas, faltas ou engajamento baixo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {user.role === "PARENT" && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-emerald-500/5 backdrop-blur">
                <h2 className="text-lg font-semibold tracking-tight">
                  Acompanhamento do seu filho(a)
                </h2>
                <p className="mt-1 text-sm text-slate-200/80">
                  Aqui você acompanha boletim, presença, recados e recomendações
                  da IA para apoiar o desenvolvimento do seu filho.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                    <p className="text-xs text-slate-300">Boletim</p>
                    <p className="mt-1 text-2xl font-semibold">—</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Em breve: notas por disciplina com evolução visual.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                    <p className="text-xs text-slate-300">Presença</p>
                    <p className="mt-1 text-2xl font-semibold">—</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Gráfico simples de presença e atrasos.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* COLUNA DIREITA – ATALHOS / PRÓXIMOS PASSOS */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-emerald-500/5 backdrop-blur">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Atalhos rápidos
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                Comece pelas ações que mais fazem diferença no seu dia.
              </p>

              <div className="mt-4 space-y-2 text-sm">
                {user.role === "ADMIN" && (
                  <>
                    <button className="w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-left font-medium text-emerald-100 transition hover:bg-emerald-500/20">
                      + Cadastrar nova turma
                    </button>
                    <button className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-slate-100 transition hover:bg-black/30">
                      Ver relatórios da IA
                    </button>
                    <button className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-slate-100 transition hover:bg-black/30">
                      Gerenciar permissões de acesso
                    </button>
                  </>
                )}

                {user.role === "TEACHER" && (
                  <>
                    <button className="w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-left font-medium text-emerald-100 transition hover:bg-emerald-500/20">
                      Registrar notas da turma
                    </button>
                    <button className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-slate-100 transition hover:bg-black/30">
                      Ver recomendações da IA por aluno
                    </button>
                    <button className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-slate-100 transition hover:bg-black/30">
                      Enviar recado para responsáveis
                    </button>
                  </>
                )}

                {user.role === "PARENT" && (
                  <>
                    <button className="w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-left font-medium text-emerald-100 transition hover:bg-emerald-500/20">
                      Ver boletim atualizado
                    </button>
                    <button className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-slate-100 transition hover:bg-black/30">
                      Ler recomendações da IA
                    </button>
                    <button className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-slate-100 transition hover:bg-black/30">
                      Enviar mensagem para a escola
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-100 backdrop-blur">
              <p className="font-semibold text-[11px] uppercase tracking-[0.18em]">
                Próximos passos do Luma Class
              </p>
              <p className="mt-2 text-[13px] leading-relaxed">
                Esta é a primeira versão do painel. Em breve, você verá
                dashboards vivos com dados reais da escola e análises geradas
                pela IA para apoiar decisões no dia a dia.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
