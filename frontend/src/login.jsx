import {Link, useNavigate} from 'react-router'
import {useState} from 'react'
import axios from 'axios'


function Login(){
    
    const [user, setUser] = useState({
        name: "",
        email: "",
        password: "",
    })
    const navigate = useNavigate();

    const handleInput = (e) => {
        const name = e.target.name;
        const value = e.target.value;
        setUser({
            ...user,
            [name] : value,
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try{
            const res = await axios.post('http://localhost:8000/api/user/login', user, {withCredentials:true});
            console.log("response", res.data);
            if (res.status === 200){
                window.location.href = "/user";
            }
        }
        catch(error){
            alert(error.response?.data?.error || error.response?.data?.message || "login failed");
            console.log("error", error.response?.data)
        }
    }
    
    return(
        <div>
            <h1>Login</h1>
            <form onSubmit={handleSubmit}> 
                <input type="text" name="email" id="" placeholder="enter your email" value={user.email} onChange={handleInput} />
                <input type="password" name="password" id="" placeholder="enter your password" value={user.password} onChange={handleInput} />
                <button type="submit">Login</button>
                <p>don't have an account</p>
                <Link to="/register" >register</Link>
            </form>
        </div>
    )
}
export default Login;