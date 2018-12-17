require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Youch = require("youch");
const validate = require("express-validation");
const dataBaseConfig = require("./config/database");
const Sentry = require("@sentry/node");
const sentryConfig = require("./config/sentry");
class App {
    constructor () {
        this.express = express();
        this.isDev = process.env.NODE_ENV !== "production";
        this.sentry();
        this.database();
        this.middlewares();
        this.routes();
        this.exception();
    }

    sentry () {
        Sentry.init(sentryConfig);
    }

    middlewares () {
        this.express.use(express.json());
        this.express.use(Sentry.Handlers.requestHandler());
    }

    database () {
        mongoose.connect(dataBaseConfig, {
            useCreateIndex: true,
            useNewUrlParser: true
        });
    }

    routes () {
        this.express.use(require("./routes"));
    }

    exception () {
        if (process.env.NODE_ENV === "production")
            this.express.use(Sentry.Handlers.errorHandler());

        this.express.use(async (err, req, res, next) => {
            if (err instanceof validate.ValidationError)
                return res.status(err.status).json(err);

            if (process.env.NODE_ENV !== "production") {
                const youch = new Youch(err, req);
                // return res.json(await youch.toJSON());
                return res.send(await youch.toHTML());
            }
            return res.status(err.status || 500).json({ error: "error internal server error" });
        });
    }
}

module.exports = new App().express;
