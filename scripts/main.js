const axios = require('axios');
const {setInterval} = require('timers');
const admin = require('firebase-admin');
const TEN_SECONDS = 10000;
const ONE_SECOND = 1000;


var serviceAccount = require("./runic-recruits-429d1-firebase-adminsdk-haua1-96f92923b3.json")
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://runic-recruits-429d1.firebaseio.com"
});

var firebase = admin.firestore();
var userColRef = firebase.collection('Users');
var leagueColRef = firebase.collection('Leagues');

var inGame = false;



var fullGameState = {
    var: currentDeck = "",
    /*null or (dictionary) */
    var: gameState = "Menus",
    /*Menus or InProgress*/
    var: currentUser = "",
    /*null or (username)*/
    var: prevGameID = "",
    var: GameID = "",
    /*-1 or (id)*/
};

var validGame = false;
var recruitChallenge = {
    "01PZ008": 3
};

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

async function getLastGameResult() {
    try {
        const response = await axios.get('http://localhost:21337/game-result');
        console.log(response.data);
        return response.data;
    } catch (error) {
        console.error(error);
    }
} 

function checkRestrictions() {
    if (!fullGameState.currentDeck) {
      return false;
    }
    for (var card in recruitChallenge) {
        console.log(fullGameState.currentDeck[card] + " " + recruitChallenge[card]);
        if (fullGameState.currentDeck[card] < recruitChallenge[card]) {
            return false;
        }
    }
    return true;
}

function updatePlayerWinLoss() {
    if(!fullGameState.currentUser){
      return;
    }
    let userRef = userColRef.doc(fullGameState.currentUser);
    let historyRef = userRef.collection("History");
    historyRef.where('Result', '==', true).get()
      .then(history => {
        if (history.empty) {
          console.log('No match history found');
          return;
        }

        userRef.set({
          Wins: snapshot.size
        }, {
          merge: true
        });
      })
      .catch(err => {
        console.log('Error getting documents', err);
      });
    historyRef.where('Result', '==', false).get()
      .then(history => {
        if (history.empty) {
          console.log('No match history found');
          return;
        }

        userRef.set({
          Losses: history.size
        }, {
          merge: true
        });
      })
      .catch(err => {
        console.log('Error getting documents', err);
      });
  }

async function updateGameState() {
    var gameState = await getGameState();
    fullGameState.gamestate = gameState ? gameState : fullGameState.gamestate;
    
    var currentUser = await getCurrentUser();
    fullGameState.currentUser = currentUser ? currentUser : fullGameState.currentUser;
    
    var currentDeck = await getActiveDeck();
    fullGameState.currentDeck = currentDeck ? currentDeck : fullGameState.currentDeck;    
    
    var gameId = await getLastGameResult();
    fullGameState.GameID = gameId;
}

async function mainLoop() {
    //while app is open
    //check if game is in progress
    //if game in progress
    //get username
    //check if username exists in db
        //if it doesnt, push new entry to db
        //if it does, get db entry ref
    //check until game is done (not in progress)
    //update win/loss
    
    let gameState = await getGameState();
    fullGameState.gamestate = gameState ? gameState : fullGameState.gamestate;
    // game is in progress, set flag to do processing after
    if(fullGameState.gameState === 'InProgress' && inGame){
        let currentUser = await getCurrentUser();
        fullGameState.currentUser = currentUser ? currentUser : fullGameState.currentUser;
        let currentDeck = await getActiveDeck();
        fullGameState.currentDeck = currentDeck ? currentDeck : fullGameState.currentDeck;    
        validGame = checkRestrictions();
        inGame = true;
    }
    // game has ended, but we have to do stuff on our end
    if(fullGameState.gameState === 'Menus' && inGame){
        let gameResult = getLastGameResult();
        if(validGame) {
            let resultData = {
                GameID: gameResult.GameId,
                Result: gameResult.LocalPlayerWon
            }
            let setDoc = userColRef
                .doc(fullGameState.PlayerName).collection('History');
            setDoc.add(resultData).then(documentReference => {
                updatePlayerWinLoss();
            });
        }
    }
    fullGameState.gamestate = await getGameState();
}

setInterval(mainLoop, ONE_SECOND*5);