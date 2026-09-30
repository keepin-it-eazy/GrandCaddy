// src/App.tsx
import { Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import BrowseTasks from './pages/BrowseTasks.tsx'

import PostTask from './pages/PostTask.tsx'
import MyTasks from './pages/MyTasks.tsx'
import TaskDetail from './pages/TaskDetail.tsx'

import HelperSignup from './pages/HelperSignup.tsx'
import MyBookings from './pages/MyBookings.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      <Route path="/post-task" element={<PostTask />} />
      <Route path="/my-tasks" element={<MyTasks />} />
      <Route path="/tasks/:id" element={<TaskDetail />} />

      <Route path="/browse-tasks" element={<BrowseTasks />} />
      <Route path="/helper/signup" element={<HelperSignup />} />
      <Route path="/helper/bookings" element={<MyBookings />} />
    </Routes>
  )
}

export default App