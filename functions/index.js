const functions = require('firebase-functions');
const express = require('express');
const app = express();

const firebase = require("firebase/app");
const axios = require("axios");

require("firebase/auth");
require("firebase/firestore");

// Setup database access

const firebaseConfig = {
    apiKey: "AIzaSyAWZnmjbiAfde0z_9yorUBcVXqYvI6f2bM",
    authDomain: "runic-recruits.firebaseapp.com",
    databaseURL: "https://runic-recruits.firebaseio.com",
    projectId: "runic-recruits",
    storageBucket: "runic-recruits.appspot.com",
    messagingSenderId: "759163950287",
    appId: "1:759163950287:web:6fc0531bd57f8bcb7013ba",
    measurementId: "G-5G94CRVS47"
  };

  firebase.initializeApp(firebaseConfig);
  var database = firebase.firestore();

// end of database setup





