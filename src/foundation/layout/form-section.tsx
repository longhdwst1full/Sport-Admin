import type { ReactNode } from 'react';

/**
 * Một nhóm trường trong form dài.
 *
 * Form nhiều chục ô mà không chia khối thì người nhập phải tự đoán ô nào thuộc về nhau. Khối có
 * tiêu đề và một dòng giải thích ngắn làm việc đó thay họ; phần mô tả nằm ở tiêu đề khối để không
 * phải nhét lời giải thích vào `extra` của từng ô.
 */
export function FormSection({
  title,
  description,
  icon,
  extra,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon ? (
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-base text-emerald-700">
              {icon}
            </span>
          ) : null}
          <div>
            <h3 className="m-0 text-sm font-bold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-0.5 mb-0 text-xs leading-5 text-slate-500">{description}</p>
            ) : null}
          </div>
        </div>
        {extra}
      </header>
      {children}
    </section>
  );
}
