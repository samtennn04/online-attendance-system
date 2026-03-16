const express = require("express")
const router = express.Router()
const db = require("../db")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const SECRET="secret123"

router.post("/register",async(req,res)=>{

 const {name,email,password}=req.body

 const hash = await bcrypt.hash(password,10)

 await db.query(
 "INSERT INTO employees(name,email,password) VALUES(?,?,?)",
 [name,email,hash]
 )

 res.json({message:"Registered"})
})

router.post("/login",async(req,res)=>{

 const {email,password}=req.body

 const [rows] = await db.query(
 "SELECT * FROM employees WHERE email=?",
 [email]
 )

 if(rows.length===0)
 return res.status(400).json({message:"User not found"})

 const user=rows[0]

 const valid = await bcrypt.compare(password,user.password)

 if(!valid)
 return res.status(400).json({message:"Wrong password"})

 const token = jwt.sign(
 {id:user.id,name:user.name},
 SECRET
 )

 res.json({token,user:{id:user.id,name:user.name}})
})

module.exports=router