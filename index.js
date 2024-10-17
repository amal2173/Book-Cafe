import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pkg from "pg";
const {Pool}= pkg;
import axios from "axios";
import dotenv from "dotenv";


dotenv.config();

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});

db.connect();


const api_key=process.env.API_KEY;
const app= express();
const port = process.env.PORT || 3000; 
const __filename= fileURLToPath(import.meta.url);
const __dirname= dirname(__filename);



app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, 'public')));


let reviews= [ 
    {
        id: 1,
        isbn: '9781250156945',
        rating: 5,
        title: 'Discipline Equals Freedom: Field Manual',
        author: 'Jocko Willink',
        summary: 'Mastery through discipline',
        review: 'This book is about mastering discipline into your life and bringing the best version of you. Joko willink is a retired seal. Here he tell about how discipline increases mental toughness and physical strength and how they are interlinked.This book is powerful and has somuch to tell and turn you into a badass.It is filled with quotations and pictures you can start from anywhere. This book will be highly recommended ,if you are going through sufferings and have to struggle each day.'
    }
];


app.get("/", async (req,res)=>{
    try {
        const result= await db.query("SELECT * FROM book");
        const data= result.rows;
        reviews= data;
        res.render("index.ejs",{
            books: reviews
        });
    } catch (error) {
        res.status(404);
    }
});

app.get("/create",(req,res)=>{
    res.render("create.ejs")
});

app.get("/reviews", (req,res)=>{
    res.render("review.ejs",{
        books: reviews,
        numberOfBooks: reviews.length
    })
});

app.get("/asc", async (req,res)=>{
    try {
        const data= await db.query("SELECT * FROM book ORDER BY title ASC");
        const ascOrder= data.rows;
        res.render("review.ejs",{
            books: ascOrder,
            numberOfBooks: ascOrder.length
        })
    } catch (error) {
        res.send(error);
    }
});

app.get("/latestBook",async (req,res)=>{
    try {
        const data= await db.query("SELECT * FROM book ORDER BY id DESC");
        const latestBooks= data.rows;
        res.render("review.ejs",{
            books: latestBooks,
            numberOfBooks: latestBooks.length
        });
    } catch (error) {
        res.send(error);
    }
});

app.get("/bestBook",async (req,res)=>{
    try {
        const data= await db.query("SELECT * FROM book ORDER BY rating DESC");
        const bestBook= data.rows;
        res.render("review.ejs",{
            books: bestBook,
            numberOfBooks: bestBook.length
        })
    } catch (error) {
        res.send(error);
    }
});


app.post("/delete", async (req,res)=>{
    try {
        const bookId= parseInt(req.body.delete);
        await db.query("DELETE FROM book WHERE id=($1)",[bookId]);
        res.redirect("/");
    } catch (error) {
        console.log(error);
    }
})
app.get("/moreReview/:id", (req,res)=>{
    try {
        const bookId=  parseInt(req.params.id);
        const specificBook= reviews.find((review)=>review.id===bookId);
        
        if(!specificBook){
            res.status(404).send("Book not found");
        }
        res.render("review.ejs",{
            books: [specificBook],
            numberOfBooks: [specificBook].length
        });

    } catch (error) {
        res.status(404); 
    }
});

async function getbookCover(isbnNumber) {
    
    try {
        const response= await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnNumber}&key=${api_key}`);
        
        if(response.data.items && response.data.items.length > 0) {
            const data = response.data.items[0];
        
            let img_path= "/images/noimage.jpeg";
             
            const api_img= data.volumeInfo.imageLinks && data.volumeInfo.imageLinks.thumbnail ?
            data.volumeInfo.imageLinks.thumbnail : null ;

            return img_path= api_img || "/images/noimage.jpeg";
        }else{
            return "/images/noimage.jpeg";
        }
        
    } catch (error) {
        console.log(error);
        return "/images/noimage.jpeg"; 
    }
}

app.post("/addReview", async (req,res)=>{
    
    try {
        const isbn= req.body.isbn;
        const rating= req.body.rating;
        const title= req.body.title;
        const author= req.body.author;
        const summary= req.body.summary;
        const review= req.body.fullReview;
    
        const img_path= await getbookCover(isbn);
        console.log(img_path);

        await db.query("INSERT INTO book (isbn,rating,title,author,summary,review,img_path) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *;",
        [isbn,rating,title,author,summary,review,img_path]);
       
        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.status(404);
    }
});

app.post("/updateReview", async (req,res)=>{
    try {
        const bookId= parseInt(req.body.currentBookId);
        const isbn= req.body.isbn;
        const rating= req.body.rating;
        const title= req.body.title;
        const author= req.body.author;
        const summary= req.body.summary;
        const review= req.body.fullReview;
        
        const img_path= await getbookCover(isbn);
        
        const result= await db.query("UPDATE book SET isbn = $1, rating = $2, title = $3, author = $4, summary = $5, review = $6, img_path= $7 WHERE id = $8 RETURNING *;" ,
        [isbn, rating, title, author, summary, review, img_path, bookId]);
        const updatedBook= result.rows[0];

        res.render("review.ejs",{
        books:[updatedBook],
        numberOfBooks: [updatedBook].length
        })

    } catch (error) {
        res.status(404);
    }
});

app.post("/search",async (req,res)=>{

    try {
        const searchBook= req.body.searchbook;
        console.log(searchBook);
        const result= await db.query("SELECT * FROM book WHERE title ILIKE $1",[`%${searchBook}%`]);
        const bookFound=result.rows;

        res.render("review.ejs",{
            books: bookFound,
            numberOfBooks: bookFound.length
        });
    } catch (error) { 
        console.log(error);
    }
});

app.listen(port,(error)=>{
    if(error){
        console.log("Server is'nt running!");
    }else{
        console.log(`Server is running on port ${port}!`);
    }
});

