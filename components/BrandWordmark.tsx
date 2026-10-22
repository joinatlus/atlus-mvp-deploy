export function BrandWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-display font-extrabold leading-none ${className}`} aria-label="Atlus">
      <span aria-hidden="true">Atl<span className="brand-u">u</span>s</span>
    </span>
  );
}
