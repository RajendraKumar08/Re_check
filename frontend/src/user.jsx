import axios from "axios";
import { useState, useEffect } from "react";

function User(){
    const [user, setUser] = useState(null);

    const fetchUser = () => {
        axios.get("http://localhost:8000/api/user/me", {
            withCredentials: true
        })
        .then((res) => {
            // backend returns user object directly or res.data.user
            setUser(res.data.user || res.data);
        })
        .catch(() => {
            setUser(null);
        })
        .finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchUser();
    }, []);

    if (!user) return <div>Loading...</div>;
    
    return (
        <div>
            <h1>hello {user.full_name}</h1>
        </div>
    )
}

export default User;