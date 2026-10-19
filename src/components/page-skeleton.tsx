/**
 * Esqueleto mostrado na hora em que se toca no menu, enquanto os dados da tela chegam
 * (loading.tsx de cada seção). Mostra o título de verdade e blocos neutros no lugar do conteúdo.
 */
export function PageSkeleton({
  eyebrow,
  title,
  blocks = 4,
}: {
  eyebrow?: string;
  title: string;
  blocks?: number;
}) {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-6 pb-24 md:px-6" aria-busy="true" aria-live="polite">
      <header>
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl text-gray-900">{title}</h1>
      </header>
      <span className="sr-only">Carregando</span>
      <div className="mt-6 space-y-3 motion-safe:animate-pulse">
        <div className="h-11 w-2/3 rounded-full bg-gray-100" />
        {Array.from({ length: blocks }, (_, i) => (
          <div key={i} className="h-20 rounded-xl border border-gray-200 bg-white" />
        ))}
      </div>
    </div>
  );
}
