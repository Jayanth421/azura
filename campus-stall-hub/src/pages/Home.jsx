import { Link } from 'react-router-dom'
import { getCategoryGradient } from '../lib/placeholders.js'
import { STALL_CATEGORIES } from '../lib/stalls.js'

const CATEGORY_TAGLINES = {
  Food: 'Snacks, chai, desserts, and more',
  Games: 'Challenges, fun, and prizes',
  Crafts: 'Handmade art, gifts, and creations',
  Tech: 'Demos, gadgets, and student builds',
  Books: 'Second-hand and new reads',
  Services: 'Help desks, tutoring, and skills',
  Other: 'Anything unique and creative',
}

function PromoCard({ category, label = 'Featured category' }) {
  const { from, to } = getCategoryGradient(category)
  const tagline = CATEGORY_TAGLINES[category] ?? CATEGORY_TAGLINES.Other

  return (
    <Link
      to={`/stalls?category=${encodeURIComponent(category)}`}
      className="card-outer group"
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white/10 p-6 text-white ring-1 ring-white/15">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/25" />
        <div className="absolute bottom-6 right-6 h-12 w-12 rotate-12 rounded-2xl bg-white/15" />
        <div className="absolute left-6 top-16 h-2 w-14 rounded-full bg-white/35" />
        <div className="relative">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold ring-1 ring-white/20">
            {label}
          </span>
          <h3 className="mt-3 text-xl font-extrabold tracking-tight">{category}</h3>
          <p className="mt-2 text-sm text-white/90">{tagline}</p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold">
            Explore <span className="transition duration-300 group-hover:translate-x-1">-&gt;</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function Home() {
  const featured = STALL_CATEGORIES.filter((c) => c !== 'Other').slice(0, 6)

  return (
    <div className="space-y-10 animate-fade-up">
      <section className="frame overflow-hidden">
        <div className="relative p-8 sm:p-12">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-fuchsia-600 opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_55%)] opacity-35" />

          <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-xs font-extrabold text-white ring-1 ring-white/20">
                <span>Browse freely</span>
                <span className="opacity-60">|</span>
                <span>Email login to post</span>
                <span className="opacity-60">|</span>
                <span>Modern cards</span>
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Azera
              </h1>
              <p className="mt-4 max-w-xl text-base text-white/90 sm:text-lg">
                Add your stall details and help students discover food, games, crafts, and more
                in a clean, frame-based layout.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/stalls" className="btn btn-primary">
                  Explore Stalls
                </Link>
                <Link
                  to="/add"
                  className="btn rounded-xl bg-white/15 px-4 py-2 font-extrabold text-white ring-1 ring-white/25 hover:bg-white/25"
                >
                  Add Your Stall
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PromoCard category="Food" />
              <PromoCard category="Games" />
              <div className="card-outer group sm:col-span-2 bg-gradient-to-br from-slate-900 to-slate-700">
                <div className="relative overflow-hidden rounded-2xl bg-white p-6">
                  <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-600/15" />
                  <div className="absolute -left-14 bottom-0 h-48 w-48 rounded-full bg-fuchsia-600/10" />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <span className="badge">Quick tip</span>
                      <span className="text-xs font-extrabold text-slate-500">
                        Looks best with an image
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-extrabold text-slate-900">
                      Make your stall stand out
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Add a short description and one contact method. Students can tap to contact
                      instantly.
                    </p>
                    <Link to="/add" className="btn btn-primary mt-5 w-full">
                      Post a Stall
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Featured Categories</h2>
            <p className="mt-1 text-sm text-slate-600">
              Explore stalls by category in a colorful, card-first layout.
            </p>
          </div>
          <Link to="/stalls" className="btn btn-secondary">
            View all stalls
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((c) => (
            <PromoCard key={c} category={c} label="Tap to filter" />
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="frame p-6">
          <div className="text-xs font-extrabold text-slate-500">Step 1</div>
          <h2 className="mt-2 text-lg font-extrabold text-slate-900">Login with email</h2>
          <p className="mt-2 text-sm text-slate-600">
            Simple local login so your stall is linked to an email address.
          </p>
        </div>
        <div className="frame p-6">
          <div className="text-xs font-extrabold text-slate-500">Step 2</div>
          <h2 className="mt-2 text-lg font-extrabold text-slate-900">Post your stall</h2>
          <p className="mt-2 text-sm text-slate-600">
            Fill the form in a framed card. It appears instantly in the stall grid.
          </p>
        </div>
        <div className="frame p-6">
          <div className="text-xs font-extrabold text-slate-500">Step 3</div>
          <h2 className="mt-2 text-lg font-extrabold text-slate-900">Students contact you</h2>
          <p className="mt-2 text-sm text-slate-600">
            Tap to call, WhatsApp, email, or open Instagram in one click.
          </p>
        </div>
      </section>
    </div>
  )
}
