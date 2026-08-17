import axios from "axios"
import {useState} from "react"
import {Link, useNavigate} from 'react-router'

function Register(){
    const [formdata, setformdata] = useState({
        fullname:"",
        email:"",
        password:""
    })
    const navigate = useNavigate()
    function handlechange(e){
        setformdata({
            ...formdata,
            [e.target.name]: e.target.value
        })
    }
    const handlesubmit = async (e) => {
        e.preventDefault();

        try{
            const res = await axios.post(
                "http://localhost:8000/api/user/register",
                formdata,
                { withCredentials: true }
            )

            alert("Registration successful");
            window.location.href = '/login';
        }
        catch(error){
            console.log(error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Registration failed";
            alert(errMsg);
        }
    }
    return(
        <div>
            <h1>Register</h1>
            <form onSubmit={handlesubmit}>
                <input type="text" name="fullname" id="" placeholder="full name" value={formdata.fullname} onChange={handlechange}/>
                <input type="text" name="email" id="" placeholder="email" value={formdata.email} onChange={handlechange}/>
                <input type="password" name="password" id="" placeholder="password" value={formdata.password} onChange={handlechange}/>
                <button type="submit">Register</button> 
                <p>already have an account</p> 
                <Link to="/login" >login</Link>
            </form>
        </div>
    )
}
export default Register