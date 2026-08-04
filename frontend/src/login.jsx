import {Link} from 'react-router'
function Login(){
    return(
        <div>
            <h1>Login</h1>
            <from>
                <input type="text" name="" id="" placeholder="enter your name" />
                <input type="text" name="" id="" placeholder="enter your password" />
                <button>Login</button>
                <p>don't have an account</p>
                <Link to="/register" >register</Link>
            </from>
        </div>
    )
}
export default Login