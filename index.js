import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import pg from "pg";
import axios from 'axios';
const { Client } = pg;

dotenv.config();

const fetchBookCover = (isbn) => {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
};

async function checkCoverImage(url) {
  try {
    const response = await axios.head(url);
    // Check if the response headers exist and have a content-type property
    if (response.status === 200 && response.headers['content-type'] && response.headers['content-type'].startsWith('image/')) {
      return true;
    }
  } catch (error) {
    // Log error or handle it as needed
    console.error(error);
  }
  return false;
}


const app = express();
const port = process.env.PORT || 3000;


// PostgreSQL client setup
const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", path.join(path.resolve(), "views"));

// Route to serve the landing page of the application

app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books ORDER BY id DESC LIMIT 3");
    const books = result.rows;
    
    // Check for each book if the cover image exists and set it accordingly
    for (const book of books) {
      const coverExists = await checkCoverImage(fetchBookCover(book.isbn));
      book.coverImageUrl = coverExists ? fetchBookCover(book.isbn) : "/images/standard_cover.jpg";
    }

    res.render("index", {
      listTitle: "Book Catalog",
      listItems: books,
    });
  } catch (err) {
    console.error("Error on the main page:", err);
    res.status(500).send("Error " + err);
  }
});

// Route to display all books in the database

app.get("/books", async (req, res) => {
  try {
    const { rows: books } = await db.query("SELECT * FROM books");
    for (const book of books) {
      const coverExists = await checkCoverImage(fetchBookCover(book.isbn));
      book.coverImageUrl = coverExists ? fetchBookCover(book.isbn) : "/images/standard_cover.jpg";
    }
    res.render("books", { books });
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to serve the form to add a new book

app.get("/books/new", (req, res) => {
    res.render("add-book");
});

// Route to display the details of a specific book by its ID

app.get("/books/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
    if (result.rows.length > 0) {
      const book = result.rows[0];
      const coverExists = await checkCoverImage(fetchBookCover(book.isbn));
      const coverImageUrl = coverExists ? fetchBookCover(book.isbn) : "/images/standard_cover.jpg";
      res.render("book-details", { book, coverImageUrl });
    } else {
      res.send("Book not found");
    }
  } catch (error) {
    console.error("Error fetching book details:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to serve the form to edit a book by its ID

app.get("/books/edit/:id", async (req, res) => {
  const { id } = req.params;
  try {
      const { rows } = await db.query("SELECT * FROM books WHERE id = $1", [id]);
      if (rows.length > 0) {
          const book = rows[0];
          res.render("edit-book", { book });
      } else {
          res.send("Book not found");
      }
  } catch (error) {
      console.error(error);
      res.send("Error " + error);
  }
});

// Route to handle the submission of the form to add a new book

app.post("/add", async (req, res) => {
  const { title, author, subject, rating, unique_description, isbn } = req.body;
  let cover_image_url = await fetchBookCover(isbn); // Use the async function directly here

  const coverExists = await checkCoverImage(cover_image_url);
  if (!coverExists) {
    cover_image_url = "/images/standard_cover.jpg"; // Use the standard cover if the original does not exist
  }

  try {
    await db.query("INSERT INTO books (title, author, subject, rating, cover_image_url, unique_description, isbn) VALUES ($1, $2, $3, $4, $5, $6, $7)", 
      [title, author, subject, rating, cover_image_url, unique_description, isbn]);
    res.redirect("/books");
  } catch (err) {
    console.error("Error adding new book:", err);
    res.status(500).send("Error adding new book: " + err.message);
  }
});

// Route to handle the submission of the form to add a book (this seems to be redundant and may be a duplicate of the /add route above)

app.post("/books", async (req, res) => {
  const { title, author, subject, rating, unique_description, isbn } = req.body;
  const cover_image_url = fetchBookCover(isbn); // Using the function directly here

  try {
    await db.query("INSERT INTO books (title, author, subject, rating, cover_image_url, unique_description, isbn) VALUES ($1, $2, $3, $4, $5, $6, $7)", 
      [title, author, subject, rating, cover_image_url, unique_description, isbn]);
    res.redirect("/books");
  } catch (err) {
    console.error("Error adding new book:", err);
    res.status(500).send("Error adding new book: " + err.message);
  }
});
  
// Route to handle the submission of the form to update a book's details

app.post("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { title, author, subject, rating, isbn, unique_description } = req.body;
  let cover_image_url = fetchBookCover(isbn);

  try {
    const imageExists = await checkCoverImage(cover_image_url);
    if (!imageExists) {
      cover_image_url = "/images/standard_cover.jpg";
    }
    
    await db.query(
      "UPDATE books SET title = $1, author = $2, subject = $3, rating = $4, isbn = $5, cover_image_url = $6, unique_description = $7 WHERE id = $8",
      [title, author, subject, rating, isbn, cover_image_url, unique_description, id]
    );
    res.redirect("/books");
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).send("Error updating book");
  }
});

// Route to handle the request to delete a book by its ID

app.post("/books/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
      await db.query("DELETE FROM books WHERE id = $1", [id]);
      res.redirect("/books");
  } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).send("Internal Server Error");
  }
});

// Route to serve the 'About' page of the application

app.get("/about", (req, res) => {
    res.render("about");
});

// Start the server and listen on the defined port

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});