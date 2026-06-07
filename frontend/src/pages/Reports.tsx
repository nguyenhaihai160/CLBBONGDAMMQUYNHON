import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, RefreshCcw, WalletCards } from 'lucide-react';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';

type RevenueRow = {
  month: string;
  label: string;
  tuitionRevenue: number;
  uniformRevenue: number;
  totalRevenue: number;
  paidPayments: number;
  paidUniformOrders: number;
};

type RevenueReport = {
  months: number;
  rows: RevenueRow[];
  summary: {
    totalRevenue: number;
    totalTuitionRevenue: number;
    totalUniformRevenue: number;
    totalDebt: number;
    debtStudents: number;
    bestMonth?: RevenueRow;
  };
};

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

export function Reports() {
  const [months, setMonths] = useState(12);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.get(`/reports/revenue-monthly?months=${months}`);
      setReport(res.data);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không tải được báo cáo doanh thu.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [months]);

  const maxRevenue = useMemo(() => Math.max(1, ...(report?.rows || []).map(row => row.totalRevenue)), [report]);

  function exportExcel() {
    if (!report) return;
    const rows = report.rows.map(row => `
      <tr>
        <td>${row.label}</td>
        <td>${row.tuitionRevenue}</td>
        <td>${row.uniformRevenue}</td>
        <td>${row.totalRevenue}</td>
        <td>${row.paidPayments}</td>
        <td>${row.paidUniformOrders}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head><meta charset="utf-8" /></head>
        <body>
          <h2>Báo cáo doanh thu theo tháng</h2>
          <table border="1">
            <tr><th colspan="2">Tổng doanh thu</th><td colspan="4">${report.summary.totalRevenue}</td></tr>
            <tr><th colspan="2">Doanh thu học phí</th><td colspan="4">${report.summary.totalTuitionRevenue}</td></tr>
            <tr><th colspan="2">Doanh thu đồng phục</th><td colspan="4">${report.summary.totalUniformRevenue}</td></tr>
            <tr><th colspan="2">Công nợ hiện tại</th><td colspan="4">${report.summary.totalDebt}</td></tr>
            <tr><th colspan="2">Học viên còn nợ</th><td colspan="4">${report.summary.debtStudents}</td></tr>
          </table>
          <br />
          <table border="1">
            <thead>
              <tr>
                <th>Tháng</th>
                <th>Doanh thu học phí</th>
                <th>Doanh thu đồng phục</th>
                <th>Tổng doanh thu</th>
                <th>Số khoản học phí đã thu</th>
                <th>Số đơn đồng phục đã thu</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-doanh-thu-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (loading && !report) return <div>Đang tải báo cáo...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><BarChart3 /> Báo cáo doanh thu</h1>
          <p className="text-slate-500">Biểu đồ doanh thu theo tháng, tách học phí và đồng phục, có xuất file Excel.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select className="input w-full sm:w-44" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            <option value={6}>6 tháng gần nhất</option>
            <option value={12}>12 tháng gần nhất</option>
            <option value={24}>24 tháng gần nhất</option>
            <option value={36}>36 tháng gần nhất</option>
          </select>
          <button className="btn-soft flex items-center justify-center gap-2" onClick={load}><RefreshCcw size={17} /> Tải lại</button>
          <button className="btn-primary flex items-center justify-center gap-2" onClick={exportExcel} disabled={!report}><Download size={17} /> Xuất Excel</button>
        </div>
      </div>

      {message && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</div>}

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Tổng doanh thu" value={money(report.summary.totalRevenue)} icon={WalletCards} hint={`${report.months} tháng`} />
            <StatCard title="Học phí" value={money(report.summary.totalTuitionRevenue)} icon={WalletCards} hint="Khoản học phí đã xác nhận" />
            <StatCard title="Đồng phục" value={money(report.summary.totalUniformRevenue)} icon={WalletCards} hint="Đơn đồng phục đã thanh toán" />
            <StatCard title="Công nợ hiện tại" value={money(report.summary.totalDebt)} icon={WalletCards} hint={`${report.summary.debtStudents} học viên còn nợ`} />
          </div>

          <div className="card">
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-lg font-black">Biểu đồ doanh thu theo tháng</h2>
                <p className="text-sm text-slate-500">Cột xanh đậm: tổng doanh thu. Phần chi tiết bên dưới tách học phí và đồng phục.</p>
              </div>
              {report.summary.bestMonth && (
                <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
                  Cao nhất: {report.summary.bestMonth.label} · {money(report.summary.bestMonth.totalRevenue)}
                </div>
              )}
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-[780px] items-end gap-3 rounded-2xl bg-slate-50 p-4">
                {report.rows.map((row) => {
                  const height = Math.max(8, Math.round((row.totalRevenue / maxRevenue) * 220));
                  return (
                    <div key={row.month} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-60 w-full items-end justify-center rounded-xl bg-white px-2 py-2 shadow-sm">
                        <div
                          className="w-full rounded-t-xl bg-pitch transition-all"
                          style={{ height }}
                          title={`${row.label}: ${money(row.totalRevenue)}`}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-slate-800">{money(row.totalRevenue)}</p>
                        <p className="text-[11px] text-slate-500">{row.label.replace('Tháng ', 'T')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="border-b px-4 py-3">
              <h2 className="font-black">Chi tiết doanh thu</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tháng</th>
                    <th className="px-4 py-3">Học phí</th>
                    <th className="px-4 py-3">Đồng phục</th>
                    <th className="px-4 py-3">Tổng</th>
                    <th className="px-4 py-3">Khoản học phí</th>
                    <th className="px-4 py-3">Đơn đồng phục</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.rows.map(row => (
                    <tr key={row.month} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold">{row.label}</td>
                      <td className="px-4 py-3">{money(row.tuitionRevenue)}</td>
                      <td className="px-4 py-3">{money(row.uniformRevenue)}</td>
                      <td className="px-4 py-3 font-black text-emerald-700">{money(row.totalRevenue)}</td>
                      <td className="px-4 py-3">{row.paidPayments}</td>
                      <td className="px-4 py-3">{row.paidUniformOrders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
