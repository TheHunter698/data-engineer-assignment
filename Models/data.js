const mongoose = require('mongoose')
const Schema = mongoose.Schema

dataSchema = new Schema({
    delta_energy: Number,
    power = Number,
    time = Number,
})

var data = mongoose.model('busData', dataSchema)

module.exports = data