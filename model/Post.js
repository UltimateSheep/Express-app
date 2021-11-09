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
    Image: {
        type: Array,
        required: false
    },
    Comments: {
        type: Array,
        required: false
    }

}, { collection: 'Posts' })

const Data = mongoose.model("data2", Schema);

module.exports = Data;
