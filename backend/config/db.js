import mongoose  from "mongoose";

const connectDB = async ()=>{
    try {
        let urlDB = process.env.urlDB;
        await mongoose.connect(urlDB);
        console.log("MongoDB Connected..!");
        return true;
    } catch (error) {
       console.log("MongoDB Connection Error.", error);
       process.exit(1);
    }
}

export default connectDB;