const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// const userSchema = mongoose Schema
  // {
    // username:
    // count:
    // _id:
    // log: [
      // {
        // description:
        // duration:
        // date:
      // }
    // ] 
  // }

// let User = mongoose.model

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// TODO:
// entering a name into "create user" form should return json of test example 'User'
// submitting 'exercises' form should return json of test example 'Exercise'
// submitting GET request to '/api/users' should return a list of json (id:1,username:x) for all users
// GET requests to '/api/users/:_id/logs should return json of a users full logs + count, as in test example 'Log' 
// GET requests with additional queries (from, &to, &limit) should only send back the correct number of a user's logs between the specified dates



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
