
/*

In this file you will find how we send raw data to other services via nats
There are 2 question points for you to tell us the answer on your presentation
If you're up for it

*/
//PLEASE REMEMBER TO INSTALL MONGODB AND MONGOOSE WHEN TESTING THIS CODE. 

const _     = require("underscore")
const async = require("async")

const dataModel = require('../Models/data')
const mongoose = require('mongoose')

// NATS Server is a simple, high performance open source messaging system
// for cloud native applications, IoT messaging, and microservices architectures.
// https://nats.io/
// It acts as our pub-sub (https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern)
// mechanism for other service that needs raw data
const NATS = require("nats")
mongoose.connect('http://localhost:27017/busData')

// At this point, do not forget to run NATS server!

// NATS connection happens here
// After a connection is made you can start broadcasting messages (take a look at nats.publish())
const nats = NATS.connect({ json: true })

//Subscriptions to all topics needed
nats.subscribe(`vehicle:test-bus-1:current`, (res) =>{
	dataRecieved.current = res
})
nats.subscribe(`vehicle:test-bus-1:odometer`, (res) =>{
	dataRecieved.odometer = res
})
nats.subscribe(`vehicle:test-bus-1:voltage`, (res) =>{
	dataRecieved.voltage = res
})
nats.subscribe(`vehicle:test-bus-1:speed`, (res) =>{
	dataRecieved.speed = res
})
nats.subscribe(`vehicle:test-bus-1:power`, (res) => {
	dataRecieved.additionalData.power = res
})
nats.subscribe(`vehicle:test-bus-1:previoustime`, (res) => {
	dataRecieved.additionalData.time = res
})
nats.subscribe(`vehicle:test-bus-1:previoustime`, (res) => {
	dataRecieved.additionalData.delta_energy = res
})

//Data in car
const mockData = {
	odometer: require("../meta/odometer.json"),
	current:  require("../meta/current.json"),
	voltage:  require("../meta/voltage.json"),
	speed:    require("../meta/speed.json")
}
//Data in computer
var dataRecieved = {
	additionalData: {

	}
}

// This function will start reading out json data from file and publish it on nats
const readOutLoud = (vehicleName, cb) => {
	async.forEachOf(mockData, (data, type, cb) => {
		async.eachSeries(data, (datum, cb) => {
			setTimeout(() => {
				nats.publish(`vehicle:${vehicleName}:${type}`, datum)
				cb()
			}, 1500)
		}, cb)
	}, cb)
}

var whatTheHenkIsHeDoing = (object) => {	
	var toReturn = ''
	if(object.speed.value == 0){
		toReturn = 'Henk has stopped the bus for some reason, hey let him be.'
	}
	else if(object.speed.value > 0 && object.additionalData.delta_energy < 0){
		toReturn = 'Henk is decelerating.'
	}
	else if(object.speed.value > 0){
		toReturn = 'Henk its on its way to somewhere.'
	}

	return toReturn + 'Henk is in km ' + (object.odometer.value/1000).toString() //Returning where is hank
}

var magicFunction = (cb) => {
	setTimeout(() => {
		currentPower = parseFloat(dataRecieved.current.value) * parseFloat(dataRecieved.voltage.value)
		if(dataRecieved.additionalData !== {}){
			var delta_energy = dataRecieved.additionalData.power * (dataRecieved.additionalData.time - dataRecieved.current.time) //This is in watts
			delta_energy = delta_energy/1000
			console.log(delta_energy, 'Energy of Henks bus')
			nats.publish(`vehicle:test-bus-1:delta-energy`, delta_energy) //Publish the resultant energy

			var data = new dataModel({
				time: dataRecieved.current.time,
				power: power,
				energy: delta_energy,
				voltage: dataRecieved.voltage.value
			})

			data.save() //Saving data at that time
			.then(() => console.log('Stored successfully'))
			.catch((err) => console.log(err))
		}
		
		nats.publish(`vehicle:test-bus-1:power`, currentPower) //Publishing power of the element, which the next one will recieve
		nats.publish(`vehicle:test-bus-1:previoustime`, dataRecieved.current.time) //Passing the time of that power to next element
		
		console.log(whatTheHenkIsHeDoing(dataRecieved))
		cb()
	}, 1600)
}

// This next few lines simulate Henk's (our favorite driver) shift
console.log("Henk checks in on test-bus-1 starting his shift...")
async.forever((fn) => {
	readOutLoud("test-bus-1", fn)
})
//Literally copying what u did cuz it works
async.forever((fn) => {
	magicFunction(fn)
})

// To make your presentation interesting maybe you can make henk drive again in reverse