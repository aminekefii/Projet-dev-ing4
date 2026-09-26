import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { Preloader } from './components/Preloader'
import { router } from './router'

export default function App() {
  return (
    <AuthProvider>
      <Preloader />
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
