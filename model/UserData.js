const express = require("express");
const mongoose = require("mongoose");
const { schema } = require("../../expressjs/models/Members");

const Schema = new mongoose.Schema({
    Username: {
        type: String,
        required: true,
        unique: true
    },
    Email: {
        type: String,
        required: true
    },
    Password: {
        type: String,
        required: true
    },
    City: {
        type: String,
        required: true
    },
    Country: {
        type: String,
        required: true
    },
    Zip: {
        type: Number,
        required: true
    },
    Firstname: {
        type: String,
        required: true
    },
    Lastname: {
        type: String,
        required: true
    }
}, { collection: 'user' })

const Data = mongoose.model("data", Schema);

module.exports = Data;
