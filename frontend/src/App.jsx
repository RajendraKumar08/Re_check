import './App.css'
import DashBoard from './dashboard.jsx'
import {Routes, Route} from 'react-router'
import Register from './register.jsx'
import Login from './login.jsx'
import Nav from './utils/nav.jsx'
import User from './user.jsx'
import Upload_Resume from './upload-resume.jsx'
import Jobcompactibility from './jobcompactibility.jsx'
function App() {
  return (
    <>
    <Nav/>
    <Routes>
      <Route path='/' element={<DashBoard/>}></Route>
      <Route path='/register' element={<Register/>}></Route>
      <Route path='/login' element={<Login/>}></Route>
      <Route path='/user' element={<User/>}></Route>
      <Route path='/upload-resume' element={<Upload_Resume/>}></Route>
      <Route path='/job-compatibility' element={<Jobcompactibility/>}></Route>
    </Routes>    
    </>
    
  )
}

export default App
