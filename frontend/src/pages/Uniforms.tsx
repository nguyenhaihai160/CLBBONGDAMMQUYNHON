import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArchiveRestore, Edit3, PackageCheck, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const typeLabels: Record<string, string> = {
  SHIRT: 'Áo',
  SHORTS: 'Quần',
  SOCKS: 'Tất',
  KIT: 'Bộ đồng phục',
  BALL: 'Bóng',
  CONE: 'Cone / chóp',
  BIB: 'Áo bib',
  LADDER: 'Thang dây',
  MARKER: 'Dụng cụ đánh dấu',
  OTHER: 'Khác',
};

const typeOptions = Object.entries(typeLabels);

const emptyProduct = { name: '', type: 'SHIRT', size: 'M', sku: '', note: '', price: 180000, stock: 10, minStock: 3 };

export function Uniforms() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [productForm, setProductForm] = useState<any>(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState({ studentId: '', productId: '', quantity: 1 });
  const [stockForm, setStockForm] = useState({ productId: '', type: 'IMPORT', quantity: 1, note: '' });
  const [showInactive, setShowInactive] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const productUrl = user?.role === 'ADMIN' ? `/uniforms/products?includeInactive=${showInactive}` : '/uniforms/products';
    const [p, o, s] = await Promise.all([api.get(productUrl), api.get('/uniforms/orders'), api.get('/students')]);
    setProducts(p.data); setOrders(o.data); setStudents(s.data);
    if (user?.role === 'ADMIN') {
      const [sum, tx] = await Promise.all([api.get('/uniforms/summary'), api.get('/uniforms/transactions')]);
      setSummary(sum.data); setTransactions(tx.data);
    }
  }

  useEffect(() => { load(); }, [showInactive]);

  const activeProducts = useMemo(() => products.filter(p => p.isActive), [products]);
  const lowStockProducts = useMemo(() => activeProducts.filter(p => p.stock <= p.minStock), [activeProducts]);

  function resetProductForm() {
    setProductForm(emptyProduct);
    setEditingId(null);
  }

  function editProduct(product: any) {
    setEditingId(product.id);
    setProductForm({
      name: product.name || '',
      type: product.type || 'SHIRT',
      size: product.size || 'Không size',
      sku: product.sku || '',
      note: product.note || '',
      price: Number(product.price) || 0,
      stock: Number(product.stock) || 0,
      minStock: Number(product.minStock) || 0,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveProduct(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      minStock: Number(productForm.minStock),
      sku: productForm.sku || null,
      note: productForm.note || null,
    };
    try {
      if (editingId) {
        await api.put(`/uniforms/products/${editingId}`, payload);
        setMessage('Đã cập nhật hàng tồn.');
      } else {
        await api.post('/uniforms/products', payload);
        setMessage('Đã thêm hàng tồn mới.');
      }
      resetProductForm();
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể lưu hàng tồn. Kiểm tra tên + size có bị trùng không.');
    }
  }

  async function updateStock(e: FormEvent) {
    e.preventDefault();
    if (!stockForm.productId) return;
    setMessage('');
    try {
      await api.patch(`/uniforms/products/${stockForm.productId}/stock`, { ...stockForm, quantity: Number(stockForm.quantity) });
      setStockForm({ productId: '', type: 'IMPORT', quantity: 1, note: '' });
      setMessage('Đã cập nhật tồn kho.');
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể cập nhật tồn kho.');
    }
  }

  async function deleteProduct(product: any) {
    const ok = window.confirm(`Xóa hàng tồn: ${product.name} size ${product.size}? Tồn hiện tại sẽ về 0 và sản phẩm bị ẩn khỏi danh sách bán.`);
    if (!ok) return;
    try {
      await api.delete(`/uniforms/products/${product.id}`);
      setMessage('Đã xóa/ẩn hàng tồn khỏi kho bán.');
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể xóa hàng tồn.');
    }
  }

  async function restoreProduct(product: any) {
    await api.patch(`/uniforms/products/${product.id}/stock`, { type: 'RESTORE', quantity: 0, note: 'Khôi phục hàng tồn' });
    setMessage('Đã khôi phục hàng tồn.');
    await load();
  }

  async function createOrder(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/uniforms/orders', { studentId: orderForm.studentId, status: 'PAID', items: [{ productId: orderForm.productId, quantity: Number(orderForm.quantity) }] });
      setOrderForm({ studentId: '', productId: '', quantity: 1 });
      setMessage('Đã tạo đơn bán và tự trừ tồn kho.');
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Không thể tạo đơn bán.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-black">Kho đồng phục & dụng cụ</h1>
          <p className="text-slate-500">Admin quản lý tồn kho, dụng cụ tập luyện, xóa hàng tồn, xuất/nhập kho. HLV chỉ tạo đơn trong lớp được gán.</p>
        </div>
        {user?.role === 'ADMIN' && (
          <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> Hiện hàng đã xóa
          </label>
        )}
      </div>

      {message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div>}

      {user?.role === 'ADMIN' && summary && (
        <div className="grid gap-3 md:grid-cols-4">
          <MiniStat title="Tổng tồn" value={`${summary.totalItems || 0} món`} />
          <MiniStat title="Giá trị kho" value={`${Number(summary.totalValue || 0).toLocaleString('vi-VN')}đ`} />
          <MiniStat title="Sắp hết" value={`${summary.lowStock || 0}`} tone="warning" />
          <MiniStat title="Hết hàng" value={`${summary.outOfStock || 0}`} tone="danger" />
        </div>
      )}

      {user?.role === 'ADMIN' && lowStockProducts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Cảnh báo sắp hết hàng:</b> {lowStockProducts.map(p => `${p.name} size ${p.size} còn ${p.stock}`).join(' • ')}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {user?.role === 'ADMIN' && (
          <form onSubmit={saveProduct} className="card grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <h2 className="font-bold">{editingId ? 'Sửa hàng tồn' : 'Thêm đồng phục / dụng cụ'}</h2>
              {editingId && <button type="button" className="btn-soft" onClick={resetProductForm}>Hủy sửa</button>}
            </div>
            <input className="input" placeholder="Tên hàng: Áo CLB, bóng số 4..." value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} required />
            <select className="input" value={productForm.type} onChange={e => setProductForm({ ...productForm, type: e.target.value, size: ['BALL','CONE','BIB','LADDER','MARKER','OTHER'].includes(e.target.value) ? 'Không size' : productForm.size })}>
              {typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input className="input" placeholder="Size / phân loại" value={productForm.size} onChange={e => setProductForm({ ...productForm, size: e.target.value })} />
            <input className="input" placeholder="Mã SKU nếu có" value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} />
            <input className="input" type="number" placeholder="Giá" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: Number(e.target.value) })} />
            <input className="input" type="number" placeholder="Tồn kho" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: Number(e.target.value) })} />
            <input className="input" type="number" placeholder="Mức cảnh báo sắp hết" value={productForm.minStock} onChange={e => setProductForm({ ...productForm, minStock: Number(e.target.value) })} />
            <input className="input" placeholder="Ghi chú" value={productForm.note} onChange={e => setProductForm({ ...productForm, note: e.target.value })} />
            <button className="btn-primary flex items-center justify-center gap-2 md:col-span-2"><Plus size={18} /> {editingId ? 'Lưu cập nhật' : 'Thêm vào kho'}</button>
          </form>
        )}

        {user?.role === 'ADMIN' && (
          <form onSubmit={updateStock} className="card grid gap-3 md:grid-cols-2">
            <h2 className="md:col-span-2 font-bold">Nhập / xuất / chỉnh tồn kho</h2>
            <select className="input" value={stockForm.productId} onChange={e => setStockForm({ ...stockForm, productId: e.target.value })} required>
              <option value="">Chọn hàng tồn</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} size {p.size} - còn {p.stock} {p.isActive ? '' : '(đã xóa)'}</option>)}
            </select>
            <select className="input" value={stockForm.type} onChange={e => setStockForm({ ...stockForm, type: e.target.value })}>
              <option value="IMPORT">Nhập thêm</option>
              <option value="EXPORT">Xuất khỏi kho</option>
              <option value="ADJUST">Chỉnh tồn thực tế</option>
            </select>
            <input className="input" type="number" min={0} value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: Number(e.target.value) })} />
            <input className="input" placeholder="Lý do / ghi chú" value={stockForm.note} onChange={e => setStockForm({ ...stockForm, note: e.target.value })} />
            <button className="btn-primary md:col-span-2">Cập nhật kho</button>
          </form>
        )}

        <form onSubmit={createOrder} className="card grid gap-3 md:grid-cols-2 xl:col-span-2">
          <h2 className="md:col-span-2 font-bold">Bán đồng phục / dụng cụ cho học viên</h2>
          <select className="input" value={orderForm.studentId} onChange={e => setOrderForm({ ...orderForm, studentId: e.target.value })} required>
            <option value="">Chọn học viên</option>{students.map(s => <option key={s.id} value={s.id}>{s.fullName} {s.class?.name ? `- ${s.class.name}` : ''}</option>)}
          </select>
          <select className="input" value={orderForm.productId} onChange={e => setOrderForm({ ...orderForm, productId: e.target.value })} required>
            <option value="">Chọn hàng bán</option>{activeProducts.map(p => <option key={p.id} value={p.id}>{p.name} size {p.size} - còn {p.stock}</option>)}
          </select>
          <input className="input" type="number" min={1} value={orderForm.quantity} onChange={e => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })} />
          <button className="btn-primary">Tạo đơn & trừ kho</button>
        </form>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center gap-2"><PackageCheck className="text-pitch" /><h2 className="font-bold">Danh sách hàng tồn</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Tên hàng</th><th>Loại</th><th>Size</th><th>Giá</th><th>Tồn</th><th>Cảnh báo</th><th>Trạng thái</th>{user?.role === 'ADMIN' && <th>Thao tác</th>}</tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 font-semibold">{p.name}<p className="text-xs font-normal text-slate-400">{p.sku || p.note || ''}</p></td>
                  <td>{typeLabels[p.type] || p.type}</td>
                  <td>{p.size}</td>
                  <td>{Number(p.price).toLocaleString('vi-VN')}đ</td>
                  <td><b>{p.stock}</b></td>
                  <td>{p.minStock}</td>
                  <td><InventoryBadge status={p.inventoryStatus} /></td>
                  {user?.role === 'ADMIN' && (
                    <td className="space-x-2">
                      {p.isActive ? <button className="btn-soft inline-flex items-center gap-1" onClick={() => editProduct(p)}><Edit3 size={15} /> Sửa</button> : null}
                      {p.isActive ? <button className="rounded-xl bg-red-50 px-3 py-2 font-semibold text-red-700" onClick={() => deleteProduct(p)}><Trash2 className="inline" size={15} /> Xóa</button> : <button className="rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-700" onClick={() => restoreProduct(p)}><ArchiveRestore className="inline" size={15} /> Khôi phục</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><h2 className="mb-3 font-bold">Đơn bán gần đây</h2>{orders.slice(0, 20).map(o => <div key={o.id} className="flex justify-between border-b py-2 text-sm"><span>{o.student?.fullName}</span><b>{Number(o.totalAmount).toLocaleString('vi-VN')}đ</b></div>)}</div>
        {user?.role === 'ADMIN' && <div className="card"><h2 className="mb-3 font-bold">Lịch sử xuất nhập kho</h2>{transactions.slice(0, 20).map(t => <div key={t.id} className="border-b py-2 text-sm"><div className="flex justify-between"><span>{t.product?.name} size {t.product?.size}</span><b>{t.quantityChange > 0 ? '+' : ''}{t.quantityChange}</b></div><p className="text-xs text-slate-500">{t.type} • {t.createdBy?.fullName || 'Hệ thống'} • {new Date(t.createdAt).toLocaleString('vi-VN')} {t.note ? `• ${t.note}` : ''}</p></div>)}</div>}
      </div>
    </div>
  );
}

function MiniStat({ title, value, tone }: { title: string; value: string; tone?: 'warning' | 'danger' }) {
  const cls = tone === 'danger' ? 'bg-red-50 text-red-700' : tone === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-white text-slate-900';
  return <div className={`rounded-2xl border border-slate-100 p-4 shadow-sm ${cls}`}><p className="text-sm opacity-70">{title}</p><b className="text-xl">{value}</b></div>;
}

function InventoryBadge({ status }: { status: string }) {
  const cls = status === 'Hết hàng' ? 'bg-red-100 text-red-700' : status === 'Sắp hết' ? 'bg-amber-100 text-amber-700' : status === 'Đã xóa/ẩn' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700';
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>{status}</span>;
}
