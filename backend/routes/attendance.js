const express=require("express");
const router=express.Router();
const db=require("../db");
const fetch=require("node-fetch");

router.post("/",async(req,res)=>{

 const {employee_id,latitude,longitude}=req.body;

 const today=new Date().toISOString().slice(0,10);

 let place="Unknown";

 const geo=await fetch(
  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
 );

 const data=await geo.json();

 if(data.address){
  place=`${data.address.suburb || ""}, ${data.address.city || data.address.town || ""}`;
 }

 const [rows]=await db.query(
  "SELECT * FROM attendance WHERE employee_id=? AND date=?",
  [employee_id,today]
 );

 if(rows.length===0){

  await db.query(
   "INSERT INTO attendance(employee_id,date,clock_in,latitude,longitude,location_name) VALUES(?,?,NOW(),?,?,?)",
   [employee_id,today,latitude,longitude,place]
  );

  return res.json({message:"Clock IN",location:place});
 }

 if(!rows[0].clock_out){

  await db.query(
   "UPDATE attendance SET clock_out=NOW() WHERE id=?",
   [rows[0].id]
  );

  return res.json({message:"Clock OUT",location:place});
 }

 res.json({message:"Attendance already done"});
});

module.exports=router;