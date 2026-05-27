import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: "POS Terminal",
    desc: "Tezkor buyurtma qabul qilish, savat boshqaruvi, naqd va qarzga sotish — bir ekranda.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: "Mahsulotlar Boshqaruvi",
    desc: "Menyu yaratish, narx va kategoriya bo'yicha tartib, rasm yuklash va mavjudlik holati.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Mijozlar Bazasi",
    desc: "Har bir mijozni ro'yxatdan o'tkazish, qidiruv va qarz holati tarixini kuzatish.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    title: "Qarz Daftar",
    desc: "Qarzga bergan buyurtmalarni kuzatish, qisman yoki to'liq to'lash imkoniyati.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    title: "Ko'p Filial",
    desc: "Bir nechta restoran va kafe filiallarini bitta tizimdan boshqaring.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Hisobot va Tahlil",
    desc: "Kunlik daromad, eng ko'p sotilgan mahsulotlar va qarz statistikasi.",
  },
];

const stats = [
  { value: "2x", label: "Tezroq xizmat" },
  { value: "100%", label: "O'zbek tilida" },
  { value: "0", label: "Yo'qolgan buyurtma" },
  { value: "24/7", label: "Ishlash vaqti" },
];

const steps = [
  { num: "01", title: "Tizimga kiring", desc: "Egasi yoki admin akkauntingiz bilan kirish qiling." },
  { num: "02", title: "Menyu tuzing", desc: "Mahsulotlar va kategoriyalarni qo'shing, narxlarni belgilang." },
  { num: "03", title: "Sotishni boshlang", desc: "POS terminaldan buyurtma qabul qiling va chek chiqaring." },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();

  const handleGoToDashboard = () => {
    const role = user?.role;
    if (role === "owner") setLocation("/owner/dashboard");
    else if (role === "admin") setLocation("/admin/dashboard");
    else if (role === "waiter") setLocation("/waiter/tables");
    else setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">R</div>
            <span className="font-semibold text-lg tracking-tight">RestoCRM</span>
          </div>
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setLocation("/")}
              className="px-4 py-2 text-sm font-medium text-foreground hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5"
            >
              Bosh sahifa
            </button>
            <button
              onClick={isAuthenticated ? handleGoToDashboard : () => setLocation("/login")}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {isAuthenticated ? "Boshqaruv paneli" : "Kirish"}
            </button>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Restoran va Kafe uchun zamonaviy tizim
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
            Biznesingizni<br />
            <span className="text-blue-500">tartibli boshqaring</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            RestoCRM — restoran va kafe uchun to'liq CRM va POS tizimi. Buyurtmalar, mahsulotlar,
            mijozlar va qarzlarni bitta joydan boshqaring.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={isAuthenticated ? handleGoToDashboard : () => setLocation("/login")}
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm"
            >
              {isAuthenticated ? "Panelga o'tish" : "Tizimga kirish"}
            </button>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 border border-border text-foreground font-medium rounded-xl transition-colors text-sm text-center"
            >
              Imkoniyatlarni ko'rish
            </a>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-12 border-y border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-blue-500 mb-1">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Barcha kerakli vositalar</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Biznesingizni samarali yuritish uchun zarur bo'lgan barcha funksiyalar bir tizimda.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-blue-500/40 hover:bg-blue-600/5 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-20 sm:py-24 bg-card/30 border-y border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Qanday ishlaydi?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Uch oddiy qadamda biznesingizni raqamlashtiring.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.num} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-7 left-1/2 w-full h-px bg-border" />
                )}
                <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-400 font-bold text-lg mb-5">
                  {step.num}
                </div>
                <h3 className="font-semibold text-base mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── POS advantages ─── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-600/10 border border-green-500/20 text-green-400 text-xs font-medium mb-6">
                POS Terminal
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight">
                Tezkor va qulay<br />savdo tizimi
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Zamonaviy POS terminal orqali har bir buyurtmani sekundlar ichida qayta ishlang.
                Xodimlaringiz kamroq vaqt sarflaydi — mijozlaringiz esa tezroq xizmat oladi.
              </p>
              <ul className="space-y-3">
                {[
                  "Naqd va qarzga sotish imkoniyati",
                  "Zal va stol bo'yicha buyurtma boshqaruvi",
                  "Avtomatik chek va hisob-faktura",
                  "Ofitsiantlar uchun alohida panel",
                  "Qarz to'lash va kuzatib borish",
                  "Kunlik daromad hisoboti",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/5 rounded-3xl blur-2xl" />
              <div className="relative bg-card border border-border rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="font-semibold text-sm">Buyurtma #24</span>
                  <span className="text-xs bg-green-600/15 text-green-400 px-2 py-0.5 rounded-full">Faol</span>
                </div>
                {[
                  { name: "Lag'mon", qty: 2, price: "28 000" },
                  { name: "Choy (limon)", qty: 3, price: "9 000" },
                  { name: "Non", qty: 2, price: "4 000" },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.name} × {item.qty}</span>
                    <span>{item.price} so'm</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Jami</span>
                    <span className="text-blue-400">41 000 so'm</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="py-2 rounded-xl bg-green-600/10 text-green-400 text-center text-xs font-medium border border-green-500/20">
                    Naqd ✓
                  </div>
                  <div className="py-2 rounded-xl bg-orange-600/10 text-orange-400 text-center text-xs font-medium border border-orange-500/20">
                    Qarzga
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 sm:py-24 border-t border-border/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-5">
            Biznesingizni bugun boshlang
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Restoran va kafeingizni raqamlashtiring — vaqtni tejang, daromadni oshiring.
          </p>
          <button
            onClick={isAuthenticated ? handleGoToDashboard : () => setLocation("/login")}
            className="inline-flex items-center gap-2 px-10 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            {isAuthenticated ? "Boshqaruv paneliga o'tish" : "Tizimga kirish"}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">R</div>
            <span>RestoCRM</span>
          </div>
          <span>© 2026 RestoCRM. Barcha huquqlar himoyalangan.</span>
        </div>
      </footer>
    </div>
  );
}
