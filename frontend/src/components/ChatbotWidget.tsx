import { Bot, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type ChatCard = {
  title: string;
  subtitle?: string;
  meta?: string;
  status?: string;
};

type ChatResponse = {
  reply: string;
  cards?: ChatCard[];
  suggestedActions?: string[];
};

type ChatMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  cards?: ChatCard[];
  suggestedActions?: string[];
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const defaultActions = ['Học viên còn nợ học phí', 'Học viên gần hết buổi', 'Lịch tập hôm nay', 'Tình hình điểm danh hôm nay'];

export function ChatbotWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickActions, setQuickActions] = useState(defaultActions);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: uid(),
      role: 'bot',
      text: 'Chào anh, tôi là trợ lý CLB. Anh có thể hỏi nhanh về học viên, học phí, lịch tập, điểm danh, kho đồ và doanh thu.',
      suggestedActions: defaultActions,
    },
  ]);

  const title = useMemo(() => user?.role === 'ADMIN' ? 'Trợ lý Admin' : 'Trợ lý HLV', [user?.role]);

  useEffect(() => {
    api.get('/chatbot/quick-actions')
      .then((res) => {
        if (Array.isArray(res.data?.actions) && res.data.actions.length) setQuickActions(res.data.actions);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  async function ask(message: string) {
    const text = message.trim();
    if (!text || loading) return;

    setMessages((current) => [...current, { id: uid(), role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<ChatResponse>('/chatbot/message', { message: text });
      const botMessage: ChatMessage = {
        id: uid(),
        role: 'bot',
        text: res.data.reply,
        cards: res.data.cards,
        suggestedActions: res.data.suggestedActions,
      };
      setMessages((current) => [...current, botMessage]);
      if (res.data.suggestedActions?.length) setQuickActions(res.data.suggestedActions);
    } catch (error: any) {
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: 'bot',
          text: error?.response?.data?.message || 'Tôi chưa xử lý được câu hỏi này. Anh thử hỏi ngắn hơn, ví dụ: “Học viên còn nợ học phí” hoặc “Lịch tập hôm nay”.',
          suggestedActions: quickActions,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-orange-500 text-white shadow-2xl shadow-emerald-900/30 transition hover:scale-105 lg:bottom-7 lg:right-7"
        aria-label="Mở chatbot"
      >
        <MessageCircle size={26} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-brandForest/35 p-3 backdrop-blur-sm sm:items-center sm:justify-end sm:p-6" onClick={() => setOpen(false)}>
          <section
            className="flex h-[78vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:h-[720px]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="bg-gradient-to-br from-brandForest to-emerald-950 p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                    <Bot size={23} />
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-sm font-bold text-emerald-100"><Sparkles size={14} /> {title}</p>
                    <h3 className="text-lg font-black">Chatbot quản lý CLB</h3>
                  </div>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-white/10 p-2 hover:bg-white/20" aria-label="Đóng chatbot">
                  <X size={20} />
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-emerald-50/90">
                Hỏi nhanh về công nợ, gói buổi, lịch tập, điểm danh, lớp học, kho đồ và doanh thu. HLV chỉ xem dữ liệu lớp được Admin gán.
              </p>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200'}`}>
                    <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
                    {!!message.cards?.length && (
                      <div className="mt-3 space-y-2">
                        {message.cards.map((card, index) => (
                          <div key={`${message.id}-card-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-800">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold">{card.title}</p>
                              {card.status && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">{card.status}</span>}
                            </div>
                            {card.subtitle && <p className="mt-1 text-xs text-slate-600">{card.subtitle}</p>}
                            {card.meta && <p className="mt-1 text-xs font-semibold text-slate-700">{card.meta}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {!!message.suggestedActions?.length && message.role === 'bot' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestedActions.slice(0, 4).map((action) => (
                          <button
                            key={action}
                            type="button"
                            onClick={() => ask(action)}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
                    <Loader2 className="animate-spin" size={16} /> Đang kiểm tra dữ liệu...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t bg-white p-3">
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {quickActions.slice(0, 5).map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => ask(action)}
                    className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    {action}
                  </button>
                ))}
              </div>
              <form onSubmit={submit} className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Nhập câu hỏi..."
                  className="h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                />
                <button type="submit" disabled={loading || !input.trim()} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brandForest text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                  <Send size={18} />
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
