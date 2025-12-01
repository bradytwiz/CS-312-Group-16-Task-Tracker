import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import pg from "pg";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "taskDB",
  password: "password",
  port: 5432,
});

db.connect()
  .then(() => console.log("DB connected"))
  .catch(err => console.error("Uh Oh... DB failed", err));


const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

// session info to save user data on log in
app.use(session({secret: "webDevRulez123",resave: false,saveUninitialized: false}));

// set the view engine for proper error display
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// function to redirect to default home page
app.get('/', async (req, res) => {
    //check for user signed in
    if( !req.session.user )
    {
        return res.redirect("/signin");
    }

    // get session info on user
    var userLoggedIn = req.session.user.user_id;

    // attempt to access all assigned user tasks
    try
    {
        var users = await db.query("SELECT user_id, first_name FROM users");
        console.log(users.rows)
        // access DB
        var taskSearch = await db.query( "SELECT * FROM tasks WHERE assigned_user = $1 ORDER BY task_id ASC",[userLoggedIn]);

        // render the task page
        res.render("index.ejs", { user: req.session.user,tasks: taskSearch.rows, users: users.rows });
    }
    // otherwise assume error
    catch (error)
    {
        console.log(error)
        // display error
        console.error("Uh oh... we couldn't find any tasks :(");
    }
});

// left largely blank for this submission
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

    // attempt to check for users present
    try
    {
        var userExistTest = await db.query("SELECT * FROM users WHERE user_id = $1", [user_id]);

        // check to see if there is an existing user
        if( userExistTest.rows.length >0 )
        {
            // return error if user exists
            return res.render("signup", {error: "Uh oh! Username already taken :("});
        }

        // assume new user by this point
        await db.query("INSERT INTO users (user_id, password, first_name, last_name) VALUES ($1, $2, $3, $4)", [user_id, password, fname, lname]);
        // redirect to signin page
        res.redirect("/signin")
    }
    // otherwise assume database error
    catch(error)
    {
        console.error(error);
        res.render("signup", {error: "Uh oh.. please try again."});
    }
});

app.post("/signin", async (req, res) => {
    const {user_id, password} = req.body;

    // attempt to access database to 
    try
    {
        var dbAccessResult = await db.query("SELECT * FROM users WHERE user_id = $1", [user_id]);

        //verify if user exists
        if( dbAccessResult.rows.length === 0 || dbAccessResult.rows[0].password !== password )
        {
            //display invalid login error
            return res.render("signin", {error: "Error: Invalid log in credentials!"});
        }

        // create user variable
        var user = dbAccessResult.rows[0]

        // save log in data to session
        req.session.user = {user_id: user.user_id,fname: user.first_name,lname: user.last_name};

        // redirect to user's task page
        res.redirect("/");
    }
    // otherwise assume database access error
    catch (error)
    {
        // display error to the console
        console.error(error)
        //update the sign in page with the error
        res.render("signin", {error: "Uh oh... something broke :("});
    }
});

app.post("/task/create", async (req, res) => {

    // attempt to access the DB
    try
    {
        // check if session has user id
        if(!req.session.user)
        {
            // redirect back to sign in
            return res.redirect("/signin");
        }
        // otherwise assume user in session

        // get the submitted task info
        var { title, description, due_date, priority, status, assignement } = req.body;
        // get user data
        var user = req.session.user.user_id;
        // insert the data into the task DB
        await db.query(
            "INSERT INTO tasks (title, description, due_date, priority, status, assigned_user) VALUES ($1, $2, $3, $4, $5, $6)",
            [
                title,
                description || "No Description.",
                due_date || null,
                priority || "medium",
                status || "open",
                assignement
            ]
        );

        // reload the task page with new task
        res.redirect('/');

    }
    // otherwise assume error
    catch (error)
    {
        console.log("Uh oh, we couldn't process your task:", error);
    }

})

app.post("/task/delete", async (req, res)=> {
    // collect the task id for post being deleted
    var { taskId } = req.body;

    //check for user signed in
    if( !req.session.user )
    {
        // redirect back to sign in
        return res.redirect("/signin");
    }
    // otherwise collect user id
    var userId = req.session.user.user_id;

    // attempt to delete the task
    try
    {
        // check if user can delete the post
        var deleteCheck = await db.query("SELECT * FROM tasks WHERE task_id = $1 AND assigned_user = $2", [taskId, userId]);

        // check if attempt is valid
        if( deleteCheck.rows.length === 0 )
        {
            // display error message
            console.log("Error: You can't complete tasks that aren't yours!");

            // redirect back to tasks
            return res.redirect("/");
        }
        // otherwise assume attempt is valid
        else
        {
            // delete the task
            await db.query( "DELETE FROM tasks WHERE task_id = $1", [taskId]);
            // reload the apge for the user
            res.redirect("/");
        }
    }
    //otherwise assume error
    catch (error)
    {
        //display the error
        console.error(error);
    }
});

app.post( "/task/update", async (req, res)=> {
    console.log("YELLO")
     // collect the task id for post being updated
    var { taskId, title, description, due_date, priority, status } = req.body;

    //check for user signed in
    if( !req.session.user )
    {
        // redirect back to sign in
        return res.redirect("/signin");
    }
    // otherwise collect user id
    var userId = req.session.user.user_id;

    // attempt to update the task
    try
    {
        // check if user can update the post
        var updateCheck = await db.query("SELECT * FROM tasks WHERE task_id = $1 AND assigned_user = $2", [taskId, userId]);

        // check if attempt is valid
        if( updateCheck.rows.length === 0 )
        {
            // display error message
            console.log("Error: You can't update tasks that aren't yours!");

            // redirect back to tasks
            return res.redirect("/");
        }
        // otherwise assume attempt is valid
        else
        {
            // delete the task
             await db.query(
            "UPDATE tasks SET title = $1, description = $2, due_date = $3, priority = $4, status = $5 WHERE task_id = $6",
            [
                title || updateCheck.rows[0].title,
                description || updateCheck.rows[0].description,
                due_date || updateCheck.rows[0].due_date,
                priority || updateCheck.rows[0].priority,
                status || updateCheck.rows[0].status,
                taskId
            ]
        );
            // reload the apge for the user
            res.redirect("/");
        }
    }
    //otherwise assume error
    catch (error)
    {
        //display the error
        console.error(error);
    }   
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
