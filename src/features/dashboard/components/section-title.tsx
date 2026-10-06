export function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="text-base font-bold text-slate-900">{title}</div>
      <div className="mt-0.5 text-xs font-normal text-slate-500">{description}</div>
    </div>
  );
}
