const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
if (process.env.NODE_ENV !== "production") require("dotenv").config();
const engine = require("ejs-blocks");
const path = require("path");
const request = require("request");
const { post } = require("request");
const mongoData = require("./model/UserData");
const Passport = require("passport")
const initializePassport = require("./passport-config");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const localstrategy = require("passport-local").Strategy;


const app = express();

app.use(express.json());
app.use(express.urlencoded({
    extended: false
}))

const URI = process.env.MONGO_DB_SECRET
app.use(flash())
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
    cookie: {
        maxAge: 3600000
    }
}))

app.use(Passport.initialize())
app.use(Passport.session())

mongoose.connect(URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("Sucessfully connected"))
    .catch((err) => `Can't connect to mongoDB \n ${err}`);
//end

//#region middleware
var CountryArray = []
var loadCountries = (req, res, next) => {
    request('https://countriesnow.space/api/v0.1/countries', {
        json: true
    }, (err, res, body) => {
        if (err) {
            return console.log(err);
        };
        body["data"].forEach(element => {
            CountryArray.push({
                "country": element["country"]
            });
        });
        next();
    });

}
Passport.serializeUser((User, done) => done(null, User.id));
Passport.deserializeUser((id, done) => {
    mongoData.findById(id, (err, user) => {
        console.log("Hello")
        done(err, user)
    })
});

Passport.use(new localstrategy({ usernameField: "Username", passwordField: 'Password' }, async (Username, Password, done) => {
    console.log(`${Username}, ${Password}`);
    await mongoData.findOne({ Username }, (err, user) => {
        if (err) return done(err)
        if (!user) return done(null, false, { message: "incorrect Username." })

        bcrypt.compare(Password, user.Password, (err, res) => {
            if (err) return done(err)
            if (res === false) return done(null, false, { message: "Incorrect Password" })
            console.log("signed in")
            return done(null, user)
        })
    })

}))



function isLoggedOut(req, res, next) {
    if (req.isUnauthenticated()) return next();
    res.redirect('/');
}
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        console.log("You're authenticated");
        return next()
    };
    res.redirect('/login');
}

async function getUser(Username) {
    await mongoData.findOne({ Username }, (err, user) => {
        if (!err) {
            console.log(user["Email"]);
            return user
        }
        else throw err
    }).clone().catch((err) => console.log(err));
}
//#endregion



app.set("views", path.join(__dirname, "views"));
app.engine("ejs", engine);
app.set("view engine", "ejs")

app.get("/", isLoggedIn, (req, res) => {
    // const user = getUser(res.user)
    console.log(req.user);
    res.render("index", { title: "main page", User: req.user })
});

app.get("/settings", isLoggedIn, (req, res) => {
    res.render("settings", { title: "Settings", User: req.user })
})
//#region ChangeName
app.get("/Changename", isLoggedIn, (req, res) => {
    res.render("changeName", { title: "Change Name", User: req.user, errorMessage: "" })
})
app.post("/Changename", isLoggedIn, async (req, res) => {
    await mongoData.findOne({ Username: req.user.Username }, (err, user) => {
        bcrypt.compare(req.body.Password, user.Password, async (err, res2) => {
            if (err) return err
            if (res2 === false) return res.render("changeName", {
                title: "Change Name",
                errorMessage: "Password incorrect"
            })

            try {
                await mongoData.findOneAndUpdate({ Username: req.user.Username }, { $set: { Username: req.body.newUsername } })
                return res.redirect("/")
            } catch (Error) {
                if (Error.code === 11000) {
                    return res.render("changeName", {
                        title: "Change Name",
                        errorMessage: "Username already in use"
                    })
                }
                throw Error
            }
        })
    }).clone().catch(function (err) { console.log(err) })


})
//#endregion

//#region Login-Register


app.get("/login", isLoggedOut, (req, res) => {
    res.render("login", { title: "login", message: "" })
});
app.get("/login/:mes", isLoggedOut, (req, res) => {
    res.render("login", { title: "login", message: "Username/Password are incorrect" })
    console.log(req.params.mes);
});
app.get("/logout", isLoggedIn, (req, res) => {
    console.log(`logged out for and ${req.isAuthenticated()}`);
    req.logout();
    res.redirect("/")
});
app.get("/register", isLoggedOut, loadCountries, (req, res) => {
    res.render("register", { title: "Register", countries: CountryArray, errorMessage: "" })
});
app.post("/register", async (req, res) => {
    let salt = await bcrypt.genSalt(2)
    let encryptedPassword = await bcrypt.hash(req.body.Password, salt)
    console.log(req.body);
    try {
        var newMember = await mongoData.create({
            Username: req.body.Username,
            Email: req.body.Email,
            Password: encryptedPassword,
            City: req.body.City,
            Country: req.body.Country,
            Zip: req.body.Zip,
            Firstname: req.body.Firstname,
            Lastname: req.body.Lastname

        });
    } catch (Error) {
        if (Error.code === 11000) {
            return res.render("register", {
                title: "register",
                countries: CountryArray,
                errorMessage: "Username already in use"
            })
        }
        throw Error
    }
    return res.redirect("/login");

});
app.post("/login", Passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login/Error",
    failureFlash: true
}));
//#endregion


app.listen(process.env.PORT, () => console.log(`app is listening to ${process.env.PORT}`));