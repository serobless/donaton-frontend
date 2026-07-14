import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'ckeditor5/ckeditor5.css'
import 'ckeditor5-premium-features/ckeditor5-premium-features.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
