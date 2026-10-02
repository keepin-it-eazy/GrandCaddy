// src/App.tsx
import { Routes, Route } from 'react-router-dom'

import Navbar from './components/home/Navbar'

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
import Messages from './pages/Messages'
import MessageThread from './pages/MessageThread'

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route path="/post-task" element={<PostTask />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/profile" element={<Profile />} />

        <Route path="/browse-tasks" element={<BrowseTasks />} />
        <Route path="/browse" element={<BrowseTasks />} />

        <Route path="/helper" element={<HelperHome />} />
        <Route path="/helper/signup" element={<HelperSignup />} />
        <Route path="/helper/bookings" element={<MyBookings />} />

        <Route path="/helpers/:id" element={<HelperProfile />} />

        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:threadId" element={<MessageThread />} />
      </Routes>
    </>
  )
}

export default App