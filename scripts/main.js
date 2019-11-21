const axios = require('axios');

var admin = require('firebase-admin');
var serviceAccount = require("./runic-recruits-429d1-firebase-adminsdk-9fs12-a2ef8915f8.json")
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://runic-recruits-429d1.firebaseio.com"
});

var firebase = admin.database();



async function getCurrentUser() {
    try {
        const response = await axios.get('http://localhost:21337/positional-rectangles');
        console.log(response.data);
        return response.data.PlayerName;
    } catch (error) {
        console.error(error);
    }
} 

async function getActiveDeck() {
    try {
        const response = await axios.get('http://localhost:21337/static-decklist');
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error(error);
    }
} 

async function getGameState() {
    try {
        const response = await axios.get('http://localhost:21337/positional-rectangles');
        console.log(response.data.GameState);
        return response.data.GameState;
    } catch (error) {
        console.error(error);
    }
} 



function mainLoop() {
    //while app is open
    //check if game is in progress
    //if game in progress
        //get username
        //check if username exists in db
            //if it doesnt, push new entry to db
            //if it does, get db entry ref
        //check until game is done (not in progress)
        //update win/loss

    if (getGameState()) {
        
    }
}


mainLoop();

