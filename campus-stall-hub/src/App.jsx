import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import AddStall from './pages/AddStall.jsx'
import Admin from './pages/Admin.jsx'
import Home from './pages/Home.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import StallDetail from './pages/StallDetail.jsx'
import Stalls from './pages/Stalls.jsx'
import VerifyAccount from './pages/VerifyAccount.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Stalls />} />
        <Route path="/home" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/add"
          element={
            <RequireAuth requireVerified>
              <AddStall />
            </RequireAuth>
          }
        />
        <Route path="/verify-account" element={<VerifyAccount />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/login" element={<Login />} />
        <Route path="/stalls" element={<Stalls />} />
        <Route path="/stalls/:stallId" element={<StallDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
