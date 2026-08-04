const mongoose = require("mongoose");
const { Schema, model } = require('mongoose');
const {createHmac, randomBytes} = require("crypto");
const {createTokenForUser} = require("../services/auth")


const userSchema = Schema.create({
    full_name : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true,
        unique: true
        
    },
    password : {
        type : String,
        required : true
        
    },
    salt : {
        type : String,
    },    
})

userSchema.pre('save', async function (){
  const user = this;

  if (!user.isModified("password")) return;

  const salt = randomBytes(16).toString("hex");
  const hashedPassword = createHmac("sha256", salt)
      .update(user.password)
      .digest("hex");

  user.salt = salt;
  user.password = hashedPassword;
})


userSchema.statics.matchPasswordAndGenerateToken = async function(email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error("User Not found");

    const providedHashedPassword = createHmac("sha256", user.salt)
        .update(password)
        .digest("hex");

    if (user.password !== providedHashedPassword) throw new Error("Incorrect Password");

    const token = createTokenForUser(user);
    return token;


}; 

const User = model('user', userSchema);

module.exports = User;