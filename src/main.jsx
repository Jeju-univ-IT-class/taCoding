import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import db from './services/db'

// DB 초기화
db.init().then(() => {
  console.log('DB 초기화 완료');
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}).catch((err) => {
  console.error('DB 초기화 실패:', err);
  // DB 초기화 실패해도 앱은 실행
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
