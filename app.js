const express = require("express");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());
const dbpath = path.join(__dirname, "userData.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(
      3000,
      console.log("Server is running at http://localhost:3000/")
    );
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

initializeDBAndServer();

// POST ### CREATING NEW USER API

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword);
  const len = password.length;
  const checkUserExistenceQuery = `SELECT
            *
        FROM
            user
        WHERE
            username = '${username}';`;
  const dbresponse = await db.get(checkUserExistenceQuery);
  if (dbresponse === undefined) {
    if (len < 5) {
      response.status = 400;
      response.send("Password is too short");
    } else {
      const createNewUserQuery = `
            INSERT INTO user(username, name, password, gender, location)
            VALUES ('${username}','${name}','${hashedPassword}','${gender}','${location}');`;
      const newUser = await db.run(createNewUserQuery);
      const newUserId = newUser.lastID;
      response.send("User created successfully");
    }
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

// POST ### USER LOGIN API 2

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const checkValidUserQuery = `
            SELECT
                *
            FROM user
            WHERE username = '${username}';`;
  const dbUser = await db.get(checkValidUserQuery);

  if (dbUser === undefined) {
    response.status = 400;
    response.send("Invalid user");
  } else {
    const isCorrectPasscode = await bcrypt.compare(password, dbUser.password);
    if (isCorrectPasscode) {
      response.send("Login success!");
    } else {
      response.status = 400;
      response.send("Invalid password");
    }
  }
});

// PUT ### CHANGE PASSWORD API 3

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const len = newPassword.length;
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const checkValidUserQuery = `
            SELECT
                *
            FROM user
            WHERE username = '${username}';`;
  const dbUser = await db.get(checkValidUserQuery);

  if (dbUser === undefined) {
    response.status = 400;
    response.send("Invalid user");
  } else {
    const isCorrectPasscode = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (isCorrectPasscode) {
      if (len >= 5) {
        const updatePasswordQuery = `
                        UPDATE user
                        SET password = '${hashedPassword}'
                        WHERE username = '${username}';`;
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      } else {
        response.status = 400;
        response.send("Password is too short");
      }
    } else {
      response.status = 400;
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
