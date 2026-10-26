// src/App.tsx
import { Routes, Route } from 'react-router-dom'

import Navbar from './components/home/Navbar'
import RequireAuth from './components/RequireAuth'

import Home from './pages/Home'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import BrowseTasks from './pages/BrowseTasks'
import PostTask from './pages/PostTask'
import MyTasks from './pages/MyTasks'
import MyBookings from './pages/MyBookings'
import TaskDetail from './pages/TaskDetail'
import HelperSignup from './pages/HelperSignupComplete'
import HelperHome from './pages/HelperHome'
import HelperProfile from './pages/HelperProfile'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import AdminHelperApprovals from './pages/AdminHelperApprovals'
import AdminCustomerApprovals from './pages/AdminCustomerApprovals'
import RequireAdmin from './components/RequireAdmin'
import Messages from './pages/Messages'
import MessageThread from './pages/MessageThread'

function App() {
  const protectedRoute = (element: React.ReactNode) => (
    <RequireAuth>{element}</RequireAuth>
  )

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route path="/post-task" element={protectedRoute(<PostTask />)} />
        <Route path="/my-tasks" element={protectedRoute(<MyTasks />)} />
        <Route path="/my-bookings" element={protectedRoute(<MyBookings />)} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/profile" element={protectedRoute(<Profile />)} />

        <Route path="/browse-tasks" element={<BrowseTasks />} />
        <Route path="/browse" element={<BrowseTasks />} />

        <Route path="/helper" element={protectedRoute(<HelperHome />)} />
        <Route path="/helper/signup" element={protectedRoute(<HelperSignup />)} />
        <Route path="/helper/bookings" element={protectedRoute(<MyBookings />)} />
        <Route path="/admin" element={protectedRoute(<RequireAdmin><AdminDashboard /></RequireAdmin>)} />
        <Route path="/admin/verifications" element={protectedRoute(<RequireAdmin><AdminHelperApprovals /></RequireAdmin>)} />
        <Route path="/admin/helper-verifications" element={protectedRoute(<RequireAdmin><AdminHelperApprovals /></RequireAdmin>)} />
        <Route path="/admin/customer-verifications" element={protectedRoute(<RequireAdmin><AdminCustomerApprovals /></RequireAdmin>)} />

        <Route path="/helpers/:id" element={<HelperProfile />} />

        <Route path="/messages" element={protectedRoute(<Messages />)} />
        <Route path="/messages/:threadId" element={protectedRoute(<MessageThread />)} />
      </Routes>
    </>
  )
}

export default App