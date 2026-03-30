import { NavLink, Outlet } from 'react-router-dom'
import logo from '../assets/azera-logo.png'
import Footer from './Footer.jsx'

export default function Layout() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#c9f000] pb-28 sm:pb-0">
      <header className="sticky top-0 z-20 bg-[#c9f000]/80 backdrop-blur">
        <div className="app-container py-4">
          <div className="flex items-center justify-center">
            <NavLink to="/" className="frame inline-flex items-center px-6 py-3">
              <img
                src={logo}
                alt="Azera"
                className="h-12 w-auto object-contain"
                loading="eager"
              />
            </NavLink>
          </div>
        </div>
      </header>

      <main className="app-container py-8">
        <Outlet />
      </main>

      <Footer />

      <nav className="fixed bottom-4 left-0 right-0 z-30 animate-slide-up sm:hidden">
        <div className="app-container">
          <div className="frame px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="grid grid-cols-2 gap-3">
              <NavLink
                to="/stalls"
                className={({ isActive }) =>
                  ['btn w-full', isActive ? 'btn-primary' : 'btn-secondary'].join(' ')
                }
              >
                Expo
              </NavLink>
              <NavLink
                to="/add"
                className={({ isActive }) =>
                  ['btn w-full', isActive ? 'btn-primary' : 'btn-secondary'].join(' ')
                }
              >
                Add Yours
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
    </div>
  )
}
