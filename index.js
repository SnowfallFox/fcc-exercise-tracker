const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: { type:String, required:true },
  count: Number,
  log: [{
    description: { type:String, required:true },
    duration: { type:Number, required:true },
    date: { type:Date, default:Date.now }
  }]
})

let User = mongoose.model("User", userSchema)

app.use(bodyParser.urlencoded({extended:false}));
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// TODO:
// entering a name into "create user" form should return json of test example 'User'
app.post('/api/users', (req,res) => {
  let name = req.body.username;
  User.find({username:name}, (err,data) => {
    if (err) {
      console.log(err)
    } else {
      console.log(data)
      if (data.length > 0) {
        console.log('data found')
      } else {
        let newUser = new User({username:name})
        newUser.save((err,data) => {
          if (err) return console.log(err);
        })
        console.log(`-- added {username:${name}} to db --`)
      }
    }
    User.find({username:name}, (err,data) => {
      if (err) {
        console.log(err)
      } else if (data.length > 0) {
        res.json({'username':data[0].username, '_id':data[0]._id})
      }
    });
  });
});
// submitting 'exercises' form should return json of test example 'Exercise'
// submitting GET request to '/api/users' should return a list of json (id:1,username:x) for all users
// GET requests to '/api/users/:_id/logs should return json of a users full logs + count, as in test example 'Log' 
// GET requests with additional queries (from, &to, &limit) should only send back the correct number of a user's logs between the specified dates



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
