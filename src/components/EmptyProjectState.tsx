import { FolderPlus } from "lucide-react";

interface EmptyProjectStateProps {
  onCreate: () => void;
}

export function EmptyProjectState({ onCreate }: EmptyProjectStateProps) {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-950/60 p-6">
      <section className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <FolderPlus className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-white">Comece sua área de trabalho</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          Cadastre o projeto que será acompanhado. Os dados financeiros aparecerão depois que os arquivos forem
          importados e processados.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
        >
          Criar primeiro projeto
        </button>
      </section>
    </main>
  );
}
