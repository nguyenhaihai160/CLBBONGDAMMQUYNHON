export function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card">
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mt-2 text-slate-500">{desc}</p>
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        Module backend đã có API nền. Giao diện chi tiết có thể phát triển tiếp trong đúng thư mục hiện tại mà không đổi cấu trúc.
      </div>
    </div>
  );
}
