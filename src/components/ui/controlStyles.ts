/** Shared text-input / select styling. The border colour meets 3:1 non-text contrast on white. */
export const controlClassName =
  'w-full rounded-[var(--radius-control)] border border-control bg-surface px-3 text-[15px] text-ink placeholder:text-[#6b7888] transition-colors duration-150 hover:border-muted focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted aria-[invalid=true]:border-error'

/** Native <select> with the shared control look and a custom chevron. */
export const selectClassName = `${controlClassName} cursor-pointer appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9 bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%235d6b7c%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")]`
