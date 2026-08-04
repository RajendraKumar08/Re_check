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
                formdata
            )

            alert("Registation successfull");
            navigate('/login');
        }
        catch(error){
            console.log(error);
            alert(error.response?.data?.message || "registraton failed");
        }
    }
    return(
        <div>
            <h1>Register</h1>
            <form onSubmit={handlesubmit}>
                <input type="text" name="fullname" id="" placeholder="full name" onChange={handlechange}/>
                <input type="text" name="email" id="" placeholder="email" onChange={handlechange}/>
                <input type="text" name="password" id="" placeholder="password" onChange={handlechange}/>
                <button type="submit">Register</button> 
                <p>already have an accoount</p> 
                <Link to="/login" >login</Link>
            </form>
        </div>
    )
}
export default Register