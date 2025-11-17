import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

// const db = new pg.Client({
//   user: "postgres",
//   host: "localhost",
//   database: "blog",
//   password: "password",
//   port: 5432,
// });
// db.connect();


const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.render("index.ejs");
});

app.get('/analytics', (req, res) => {
    res.render("analytics.ejs");
});

app.get('/signup', (req, res) => {
    res.render("signup.ejs");
});

app.get('/signin', (req, res) => {
    res.render("signin.ejs");
});

app.post("/signup", async (req, res) => {
    const {user_id, password, fname, lname} = req.body;
    console.log(user_id, password, fname, lname)
    res.redirect("/")
});

app.post("/signin", async (req, res) => {
    const {user_id, password} = req.body;
    console.log(user_id, password)
    res.redirect("/")
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});