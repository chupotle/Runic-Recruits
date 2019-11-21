const axios = require('axios')
const {
  setInterval
} = require('timers');

var admin = require("firebase-admin");

var serviceAccount = require("./runic-recruits-429d1-firebase-adminsdk-9fs12-a2ef8915f8.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://runic-recruits-429d1.firebaseio.com"
});

const TEN_SECONDS = 10000;
const ONE_SECOND = 1000;

$(() => {

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
  //have 3 teemos in your deck

  var recruitChallenge = {
    "01PZ008": 3
  };


  var losses = 0;

  
  let firestore = admin.firestore();

  mainLoop();

  function updateUI() {
    $('#current-user').text(fullGameState.currentUser)
    $('#gameState').text(fullGameState.gameState)
    $('#validGame').text(validGame)
    $('#sha512-output').text(losses)
  }

  function mainLoop() {
    // i think we want to constantly check for current user?
    // or maybe we just run this when we see a gamestate change
    getCurrentUser().then(data => {
      fullGameState.currentUser = data ? data : fullGameState.currentUser;
    });
    // this should defo run all the time, or maybe we keep track of change
    // when we see gamestat
    updateGameState().then(data => {
      fullGameState.gameState = data;
    });
    getLastGameResult().then(data => {
      if(!fullGameState.prevGameID){
        return;
      }
      // check if GameID changes, if it did, then it means a game has ended
      if (data.GameID !== fullGameState.GameID) {
        fullGameState.prevGameID = fullGameState.GameID;
        fullGameState.GameID = data.GameID;
        // record game result
        if (validGame) {
          let resultData = {
            GameID: data.GameID,
            Result: data.LocalPlayerWon
          };

          let setDoc = firestore.collection('Users')
            .doc(fullGameState.PlayerName).collection('History');
          setDoc.add(resultData).then(documentReference => {
            updatePlayerWinLoss();
          });
        }
      }
      getActiveDeck().then(data => {
        fullGameState.currentDeck = data;
        validGame = checkRestrictions();
      });
    });
    updateUI();
  }

  function getActiveDeck() {
    return axios.get('http://localhost:21337/static-decklist')
      .then((result) => {
        return result.data.CardsInDeck;
      }).catch((err) => {
        return "F";
      });
  }

  function updatePlayerWinLoss() {
    if(!fullGameState.PlayerName){
      return;
    }
    let userRef = firestore.collection("Users").doc(fullGameState.PlayerName);
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

  function updateGameState() {
    return axios.get('http://localhost:21337/positional-rectangles')
      .then((result) => {
        return result.data.GameState;
      }).catch((err) => {
        return "F";
      });
  }

  function getCurrentUser() {
    return axios.get('http://localhost:21337/positional-rectangles')
      .then((result) => {
        return result.data.PlayerName;
      }).catch((err) => {
        return "F";
      });
  }

  function getLastGameResult() {
    return axios.get('http://localhost:21337/game-result')
      .then((result) => {
        return result.data;
      }).catch((err) => {
        return "F";
      });
  }4

  function getRestrictionsForLobby() {
    // some call to sql db, expecting data to be returned as deck string, i.e.
    // {"01PZ001":3,"01PZ004":3}
    // check user's groupid, and check that groupid's restrictions
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
  setInterval(mainLoop, ONE_SECOND*5);

  $('#text-input').focus() // focus input box
})