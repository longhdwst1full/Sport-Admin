import type { ReactNode } from 'react';

/**
 * Thay cho antd `Result` ở khung app: `Result` nhúng sẵn 3 hình minh hoạ SVG (~30 kB) vào chunk khởi
 * động dù chỉ dùng một. Panel này chỉ có icon/tiêu đề/mô tả/nút.
 */
export function ResultPanel({
  icon,
  title,
  subTitle,
  extra,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subTitle?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-12 text-center" role="status">
      {icon && <div className="mb-4 text-5xl text-slate-400">{icon}</div>}
      <div className="text-xl font-bold text-slate-800">{title}</div>
      {subTitle && <div className="mt-2 text-sm text-slate-500">{subTitle}</div>}
      {extra && <div className="mt-6 flex flex-wrap justify-center gap-2">{extra}</div>}
    </div>
  );
}
