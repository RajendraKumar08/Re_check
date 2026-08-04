import './App.css'
import DashBoard from './dashboard.jsx'
import {Routes, Route} from 'react-router'
import Register from './register.jsx'
import Login from './login.jsx'
import Nav from './utils/nav.jsx'

function App() {
  return (
    <>
    <Nav/>
    <Routes>
      <Route path='/' element={<DashBoard/>}></Route>
      <Route path='/register' element={<Register/>}></Route>
      <Route path='/login' element={<Login/>}></Route>
    </Routes>    
    </>
    
  )
}

export default App
