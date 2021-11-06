const express = require("express");
const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
    Owner: {
        type: String,
        required: true
    },
    Body: {
        type: String,
        required: true
    },
    Comments: {
        type: Array,
        required: false
    }
    
}, { collection: 'Posts' })

const Data = mongoose.model("data2", Schema);

module.exports = Data;
