import { NavLinks } from "@/components/layout/NavLinks";

interface AppShellProps {
  children: React.ReactNode;
}

function TaskLocalMark() {
  return (
    <p className="w-fit bg-tl-text px-3 py-1.5 font-sans text-lg font-bold tracking-tight text-white">
      TaskLocal
    </p>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-zinc-50">
      <div className="mx-auto flex h-full max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-6 md:block">
          <div className="mb-8">
            <TaskLocalMark />
            <h1 className="mt-2 text-lg font-semibold text-zinc-900">
              Trust & Safety
            </h1>
          </div>
          <NavLinks />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="border-b border-zinc-200 bg-white px-6 py-4 md:hidden">
            <TaskLocalMark />
            <h1 className="mt-2 text-lg font-semibold text-zinc-900">
              Trust & Safety
            </h1>
            <div className="mt-4">
              <NavLinks />
            </div>
          </header>

          <main className="flex flex-1 min-h-0 flex-col overflow-hidden px-6 py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
