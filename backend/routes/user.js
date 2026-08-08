const {Router} = require("express");
const User = require("../models/user");
const router = Router();
const {createTokenForUser, validateToken} = require("../services/auth");
// const {matchPasswordAndGenerateToken} = require("../models/user")

router.post("/register", async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        if (!fullname || !email || !password) {
            return res.status(400).json({
                error: "All fields are required",
            });
        }

        // console.log("fullname", fullname);
        // console.log("email", email);
        // console.log("password", password);

        const user = await User.create({
            full_name : fullname,
            email : email,
            password : password,
        });

        const token = createTokenForUser(user);

        return res.cookie("token", token, {
            httpOnly : true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 900000,
        }).json({
            message: "User created successfully",
            user : {
                id : user._id,
                email : user.email,
                full_name : user.full_name,
            }
        });

    } catch (err) {
        return res.status(500).json({
            error: err.message,
        });
    }
});

router.post('/login', async (req, res) => {
    const {email, password} = req.body;
    
    try {
        const token = await User.matchPasswordAndGenerateToken(email, password);
        const payload = validateToken(token);
        const user = await User.findById(payload._id).select("-password -salt")  
        return res.cookie("token", token, {
            httpOnly : true,
            secure: process.env.NODE_ENV === "production",   
            maxAge: 900000,
        }).json({
            message: "Login successfully",
            user
        })
    } catch (err) {
        return res.status(500).json({
            error: err.message,
        });
    }
});

router.get('/me', async (req, res) => {
    try{
        console.log("cookies", req.cookies)
        const token = req.cookies.token;
        console.log("token", token);
        if(!token){
            return res.status(401).json({
                error: "Unauthorized"
            })
        }
        const payload = validateToken(token);
        if(!payload){
            return res.status(401).json({
                error: "Unauthorized"
            })
        }
        const user = await User.findById(payload._id).select("-password -salt")
        return res.json(user)
    } catch(err){
        return res.status(500).json({
            error: err.message,
        });
    }
});

router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    });

    return res.json({
        message: "Logout successfully",
    });
});

module.exports = router;