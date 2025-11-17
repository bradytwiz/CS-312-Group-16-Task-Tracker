import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "blog",
  password: "password",
  port: 5432,
});
db.connect();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// task page
app.get('/task/new', (req, res) => {
    res.render("task-form.ejs", { task: null, action: "create" });
});

// create task - POST
app.post('/task/create', async (req, res) => {
    try {
        const { title, description, due_date, priority, status } = req.body;
        await db.query(
            [title, description || null, due_date || null, priority || 'medium', status || 'open']
        );
        res.redirect('/');
    } catch (error) {
        console.log("Error creating task:", error);
        res.render("task-form.ejs", { task: req.body, action: "create", error: "Failed to create task" });
    }
});

// edit task page
app.get('/task/edit/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM tasks WHERE task_id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.redirect('/');
        }
        const task = result.rows[0];
        if (task.due_date) {
            task.due_date = task.due_date.toISOString().split('T')[0];
        }
        res.render("task-form.ejs", { task: task, action: "edit" });
    } catch (error) {
        console.log("Error loading task:", error);
        res.redirect('/');
    }
});

// update task
app.post('/task/update/:id', async (req, res) => {
    try {
        const { title, description, due_date, priority, status } = req.body;
        await db.query(
            'UPDATE tasks SET title = $1, description = $2, due_date = $3, priority = $4, status = $5 WHERE task_id = $6',
            [title, description || null, due_date || null, priority, status, req.params.id]
        );
        res.redirect('/');
    } catch (error) {
        console.log("Error updating task:", error);
        res.redirect('/task/edit/' + req.params.id);
    }
});

// delete task
app.post('/task/delete/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM tasks WHERE task_id = $1', [req.params.id]);
        res.redirect('/');
    } catch (error) {
        console.log("Error deleting task:", error);
        res.redirect('/');
    }
});

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

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
