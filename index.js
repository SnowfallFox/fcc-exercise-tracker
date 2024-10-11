const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// credit to Ash Clarke for date validation method -> https://stackoverflow.com/a/12372720
Date.prototype.isValid = function () {
  return this.getTime() === this.getTime();
};

const userSchema = new mongoose.Schema({
  username: { type:String, required:true },
  log: [{
    description: { type:String, required:true },
    duration: { type:Number, required:true },
    date: { type:String, default:function() {
      let date = new Date()
      return date.toDateString();
    }}
  }],
  count: { type:Number, default:function() {
    const collection = this.log;
    return (collection) ? collection.length : 0;
  }}
});
let User = mongoose.model("User", userSchema);

// const removeTests = async () => {
//   const name = "fcc"
//   console.log('removing test users')
//   await User.deleteMany({username: {$regex: name, $options: 'i'}});
// }

const addExercise = (user, desc, dur, date, res) => {
    if (date === '') {
      user.log.push({description:desc, duration:dur})
    } else {
      user.log.push({description:desc, duration:dur, date:date.toDateString()})
    }
    user.count +=1
    user.save((err,newData) => {
      if (err) {
        console.log(err)
      }
    })
    if (date === '') {
      let d = new Date()
      // console.log(`d = ${d.toDateString()}`)
      res.json({username: user.username, description: desc, duration: Number(dur), date: d.toDateString(), _id:user._id})
    } else {
      // console.log(`date = ${date.toDateString()}`)
      res.json({username: user.username, description: desc, duration: Number(dur), date:date.toDateString(), _id:user._id})
    }
};

const findID = async (ID, desc, dur, date, res) => {
  try {
    const user = await User.findById(ID);
    if (user !== null) {
      addExercise(user, desc, dur, date, res)
    } else {
      res.json({'ERROR':'no user exists for that ID'})
    }
    // console.log(user)
  } catch (error) {
    console.log(error)
  }
};

const findUser = async (name,res) => {
  try {
    const user = await User.find({username:name});
      if (user.length === 0) {
        console.log('no users with that username')
        createUser(name,res)
      } else {
        res.json({'username':user[0].username,'_id':user[0].id})
      }
  } catch(error) {
    console.log(error);
  }
};

const createUser = async (name,res) => {
  const newUser = new User({ username: name });
  await newUser.save((err,data) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`-- added {username:${name}} to db --`);
      findUser(name,res);
    }
  });
};

app.use(bodyParser.urlencoded({extended:false}));
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
  // removeTests()
});

// entering a name into "create user" form should return json of test example 'User'
app.post('/api/users', (req,res) => {
  let name = req.body.username;
  findUser(name,res)
});

// submitting 'exercises' form should return json of test example 'Exercise'
app.post('/api/users/:_id/exercises', (req,res) => {
  let date = ''
  if (req.body.description === '' || req.body.duration === '' || req.params._id === '') {
    res.json({'ERROR':'BLANK REQUIRED FIELDS (id, description, duration'})
    return;
  } else if (isNaN(req.body.duration)) { 
    res.json({'ERROR':'DURATION MUST BE A VAlID NUMBER/INTEGER'})
    return;
  } else if (req.body.date !== '') {
      date = new Date(req.body.date)
      console.log(date)
      if (!date.isValid()) {
        res.json({'error':'invalid date'})
        return;
      }
  }
  findID(req.params._id,req.body.description,req.body.duration,date,res)
});

// submitting GET request to '/api/users' should return a list of json (id:1,username:x) for all users
app.get('/api/users', (req,res,next) => {
  const users = User.find({}, {username:1}, (err,data) => {
    if (err) {
      console.log(`error: ${err}`)
    } else {
      res.json(data)
    }
  })
});

// GET requests to '/api/users/:_id/logs should return json of a users full logs + count, as in test example 'Log'
// GET requests with additional queries (from, &to, &limit) should only send back the correct number of a user's logs between the specified dates
app.get('/api/users/:_id/logs', (req,res,next) => {
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;

  // if (!from) {
  //   console.log(from,to,limit)
  // } else {
  //   console.log(from)
  // }
  
  // if all 3 entered, sort search (from,to) and then limit to 1
    // if no limit -> no limit (duh)
  // if only limit entered -> limit by limit var and then search
  // if only from entered -> return all results from that date
  // if only to entered -> all results up to AND including that date

  const userID = req.params._id
  const user = User.findById(userID, {log: { _id: 0} }, (err,data) => {
    if (err) {
      console.log(err)
    } else {
      // MISUNDERSTOOD COUNT -> NOT A TOTAL COUNT OF LOGS IN A USER'S PROFILE, BUT A COUNT OF HOW MANY WERE RETURNED BY THE QUERY!!
      // current method works fine for keeping a count of all logs, so don't remove it
      // but need to do a recount after querying and return THAT value regardless of total
      res.json({_id:data._id, username:data.username, count: data.count, log: data.log})
    }
  })
});

// test URL:
// https://3000-freecodecam-boilerplate-drm1d178zm1.ws-eu116.gitpod.io/api/users/67069b577a53ae2757121a7c/logs?from=&to=&limit=

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
