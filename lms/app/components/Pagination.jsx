import Link from 'next/link';

export default function Pagination({ page, total, pageSize, basePath }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);

  // Build page window: always show first, last, current ±2
  const pages = new Set([1, totalPages, page]);
  for (let i = page - 2; i <= page + 2; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-zinc-500">
        Page <span className="text-zinc-300 font-semibold">{page}</span> of{' '}
        <span className="text-zinc-300 font-semibold">{totalPages}</span> &nbsp;·&nbsp;{' '}
        <span className="text-zinc-300 font-semibold">{total}</span> total
      </p>

      <nav className="flex items-center gap-1">
        {page > 1 && (
          <Link
            href={`${basePath}?page=${prev}`}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1e233d] border border-[#2b3052] text-zinc-300 hover:text-white hover:bg-[#2b3052] transition-colors"
          >
            ← Prev
          </Link>
        )}

        {sorted.map((p, i) => {
          const prevP = sorted[i - 1];
          const gap = prevP && p - prevP > 1;
          return (
            <span key={p} className="flex items-center gap-1">
              {gap && <span className="text-zinc-600 px-1 text-xs">…</span>}
              <Link
                href={`${basePath}?page=${p}`}
                className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-colors ${
                  p === page
                    ? 'bg-cyan-600 text-white border border-cyan-500'
                    : 'bg-[#1e233d] border border-[#2b3052] text-zinc-400 hover:text-white hover:bg-[#2b3052]'
                }`}
              >
                {p}
              </Link>
            </span>
          );
        })}

        {page < totalPages && (
          <Link
            href={`${basePath}?page=${next}`}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1e233d] border border-[#2b3052] text-zinc-300 hover:text-white hover:bg-[#2b3052] transition-colors"
          >
            Next →
          </Link>
        )}
      </nav>
    </div>
  );
}
