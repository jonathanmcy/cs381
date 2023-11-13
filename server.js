const assert = require('assert');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('cookie-session');
const { MongoClient, ObjectID } = require('mongodb');

const mongourl = 'mongodb+srv://ylliustudy:Man16081608@cluster0.eoffryx.mongodb.net/?retryWrites=true&w=majority';
const dbName = 'sample_restaurants';
const SECRETKEY = 'cs381';

const app = express();
app.set('view engine', 'ejs');

app.use(session({
  name: 'session',
  keys: [SECRETKEY],
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sample user data
const usersinfo = [
  { name: "user1", password: "cs381" },
  { name: "user2", password: "cs381" },
  { name: "user3", password: "cs381" }
];

// MongoDB helper functions
const connectToMongo = async () => {
    const client = await MongoClient.connect(mongourl);
    return client.db(dbName);
  };

const createDocument = async (db, createdDocument) => {
  const result = await db.collection('restaurants').insertOne(createdDocument);
  return result;
};

const findDocuments = async (db, criteria) => {
  const cursor = db.collection('restaurants').find(criteria);
  const docs = await cursor.toArray();
  return docs;
};

const updateDocument = async (db, criteria, updatedDocument) => {
  const result = await db.collection('restaurants').updateOne(criteria, { $set: updatedDocument });
  return result;
};

const deleteDocument = async (db, criteria) => {
  const result = await db.collection('restaurants').deleteOne(criteria);
  return result;
};

// Authentication middleware
const requireAuthentication = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect("/login");
  }
};

// Routes
app.get('/', (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/login");
  } else {
    res.redirect("/home");
  }
});

app.get('/login', (req, res) => {
  res.render("login");
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = usersinfo.find(user => user.name === username && user.password === password);
  if (user) {
    req.session.authenticated = true;
    req.session.userid = user.name;
    res.redirect("/home");
  } else {
    res.redirect("/");
  }
});

app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

app.get('/home', requireAuthentication, (req, res) => {
  res.render("home");
});

app.get('/list', requireAuthentication, async (req, res) => {
    const db = await connectToMongo();
    const docs = await findDocuments(db, {}); // Retrieve all documents
    res.render('display', { nItems: docs.length, items: docs });
  });

app.get('/find', requireAuthentication, (req, res) => {
  res.render("search");
});

app.post('/search', requireAuthentication, async (req, res) => {
  const db = await connectToMongo();
  const searchID = { restaurantID: req.body.restaurantID };
  if (searchID.restaurantID) {
    const docs = await findDocuments(db, searchID);
    res.render('display', { nItems: docs.length, items: docs });
  } else {
    res.redirect('/find');
  }
});

app.get('/details', requireAuthentication, async (req, res) => {
  const db = await connectToMongo();
  const documentID = { _id: ObjectID(req.query._id) };
  const docs = await findDocuments(db, documentID);
  res.render('details', { item: docs[0] });
});

app.get('/edit', requireAuthentication, async (req, res) => {
  const db = await connectToMongo();
  const documentID = { _id: ObjectID(req.query._id) };
  const docs = await findDocuments(db, documentID);
  res.render('edit', { item: docs[0] });
});




app.post('/update', requireAuthentication, async (req, res) => {
  const db = await connectToMongo();
  const criteria = { restaurantID: req.body.postId };
  const updatedDocument = {
    ownerID: req.session.userid,
    name: req.body.name,
    cuisine: req.body.cuisine,
    phone: req.body.number,
    description: req.body.description,
    address: {
      borough: req.body.borough,
      street: req.body.street || ''
    }
  };
 updateDocument(db, criteria, updatedDocument)
    .then(() => {
      res.redirect('/list');
    })
    .catch(err => {
      console.error(err);
      res.redirect('/edit?_id=' + criteria._id);
    });
});

app.get('/delete', requireAuthentication, async (req, res) => {
  const db = await connectToMongo();
  const criteria = { _id: ObjectID(req.query._id) };
  const result = await deleteDocument(db, criteria);
  if (result.deletedCount > 0) {
    res.render('info', { message: "Document is successfully deleted." });
  } else {
    res.redirect('/details?_id=' + criteria._id);
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
