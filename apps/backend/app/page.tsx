import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex justify-between items-center max-w-6xl mx-auto">
        <span className="text-xl font-bold text-blue-400">KioscApp</span>
        <div className="flex gap-4 items-center">
          <Link href="/auth/login" className="text-slate-300 hover:text-white text-sm transition-colors">
            Ingresar
          </Link>
          <Link
            href="/auth/register"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-block bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm px-4 py-1.5 rounded-full mb-6">
          Para kioscos, almacenes y pequeños comercios
        </div>
        <h1 className="text-5xl font-extrabold leading-tight mb-6 text-white">
          El POS para tu kiosco
          <br />
          <span className="text-blue-400">que funciona sin internet</span>
        </h1>
        <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto">
          Vendé, controlá el stock y gestioná tu caja desde una app rápida y simple. Tus datos se
          sincronizan en la nube cuando tenés conexión, sin perder ninguna venta.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/auth/register"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold text-lg transition-colors"
          >
            Empezar gratis
          </Link>
          <Link
            href="/auth/login"
            className="border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white px-8 py-3.5 rounded-xl font-medium text-lg transition-colors"
          >
            Ingresar
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">Todo lo que necesitás</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '⚡',
              title: 'Ventas offline',
              desc: 'Cobrás aunque no haya internet. La app funciona 100% local con SQLite embebido.',
            },
            {
              icon: '🔄',
              title: 'Sync automático',
              desc: 'Cuando vuelve la conexión, todas tus ventas y movimientos se sincronizan solos.',
            },
            {
              icon: '📊',
              title: 'Dashboard por sucursal',
              desc: 'Mirá cuánto vendiste hoy, esta semana y este mes. Desglose por medio de pago.',
            },
          ].map(f => (
            <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-white mb-3">
            Configurá tu primera sucursal en 5 minutos
          </h2>
          <p className="text-slate-400 mb-8">
            Registrate, creá tu punto de venta y obtené las credenciales para instalar la app en tu kiosco.
          </p>
          <Link
            href="/auth/register"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-colors"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-slate-500 text-sm">
        <span className="text-blue-400 font-semibold">KioscApp</span> — Sistema POS offline-first para comercios argentinos
      </footer>
    </div>
  )
}
