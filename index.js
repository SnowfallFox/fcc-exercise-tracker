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
  count: { type:Number, default:function() {
    const collection = this.log;
    return (collection) ? collection.length : 0;
  }},
  log: [{
    description: { type:String, required:true },
    duration: { type:Number, required:true },
    date: { type:String, default:function() {
      let date = new Date()
      return date.toDateString();
    }}
  }],
});
let User = mongoose.model("User", userSchema);

// const removeTests = async () => {
//   const name = "fcc"
//   console.log('removing test users')
//   await User.deleteMany({username: {$regex: name, $options: 'i'}});
// }

const addExercise = (user, desc, dur, date, res) => {
    if (date === '') {
      console.log(`saving description and duration to user`)
      user.log.push({description:desc, duration:dur})
    } else {
      console.log(`saving desc, duration, and date to user`)
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
      res.json({_id:user._id, username: user.username, date: d.toDateString(), duration: Number(dur), description: desc})
    } else {
      // console.log(`date = ${date.toDateString()}`)
      res.json({_id:user._id, username: user.username, date:date.toDateString(), duration: Number(dur), description: desc})
    }
};

const findID = async (ID, desc, dur, date, res) => {
  try {
    const user = await User.findById(ID);
    if (user !== null) {
      console.log(`found user with id: ${ID}`)
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
        console.log(`user found: ${user[0].username}`)
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
  // console.log(new Date("Sat Apr 20 2024"))
  // removeTests()
});

// entering a name into "create user" form should return json of test example 'User'
app.post('/api/users', (req,res) => {
  let name = req.body.username;
  console.log(name)
  findUser(name,res)
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

// submitting 'exercises' form should return json of test example 'Exercise'
app.post('/api/users/:_id/exercises', (req,res) => {
  let date = ''
  if (req.body.description === '' || req.body.duration === '' || req.params._id === '') {
    res.json({'ERROR':'BLANK REQUIRED FIELDS (id, description, duration'})
    return;
  } else if (isNaN(req.body.duration)) { 
    res.json({'ERROR':'DURATION MUST BE A VAlID NUMBER/INTEGER'})
    return;
  } else if (!req.body.date) {
      date = new Date(req.body.date)
      // console.log(date)
      if (!date.isValid()) {
        console.log('error bitch')
        // res.json({'error':'invalid date'})
        return;
      }
  }
  console.log(`entered -> id:${req.params._id}, desc:${req.body.description}, duraton:${req.body.duration}, date:${date}`)
  findID(req.params._id,req.body.description,req.body.duration,date,res)
});

// GET requests to '/api/users/:_id/logs should return json of a users full logs + count, as in test example 'Log'
// GET requests with additional queries (from, &to, &limit) should only send back the correct number of a user's logs between the specified dates
app.get('/api/users/:_id/logs', (req,res) => {
  let userID = req.params._id
  let from = req.query.from;
  let to = req.query.to;
  let limit = Number(req.query.limit);
  let fromString = ''
  let toString = ''

  // if no dates entered, defaults to 1900 and latest possible dates, likely encompassing all results
  if (!from) {
    from = new Date('1900-01-01')
  } else if (from) {
    let f = new Date(from)
    if (!f.isValid()) {
      res.json({'error':'Invalid Date'})
    } else {
      from = f
      fromString = f.toDateString()
    }
  }
  if (!to) {
    to = new Date()
  } else if (to) {
    let t = new Date(to)
    if (!t.isValid()) {
      res.json({'error':'Invalid Date'})
    } else {
      to = t
      toString = t.toDateString()
    }
  }

  User.findById(userID).exec((err,data) => {
    if (data) {
      // array of relevant entries (matching date queries)
      console.log(userID, data.username)
      let logs = []
      for (let i = 0; i < data.log.length; i++) {
        let d1 = new Date(data.log[i].date)
        if (d1 >= from && d1 <= to) {
          logs.push({description:data.log[i].description, duration:data.log[i].duration, date:data.log[i].date})
        } 
      }
      if (limit > 0) {
        logs = logs.slice(0,limit);
      }
      if (fromString && toString) {
        res.json({_id:userID, username:data.username, from:fromString, to:toString, count:logs.length,log:logs})
      } else if (fromString && !toString) {
        res.json({_id:userID, username:data.username, from:fromString, count:logs.length,log:logs})
      } else if (!fromString && toString) {
        res.json({_id:userID, username:data.username, to:toString, count:logs.length,log:logs})
      } else {
        res.json({_id:userID, username:data.username, count:logs.length,log:logs})
      }
    }
  })
});

// test URL:
// https://3000-freecodecam-boilerplate-drm1d178zm1.ws-eu116.gitpod.io/api/users/671663ed72fecc1f6889f03e/logs?from=&to=&limit=

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
