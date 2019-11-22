const axios = require('axios');
const {
  setInterval
} = require('timers');
const admin = require('firebase-admin');
const TEN_SECONDS = 10000;
const ONE_SECOND = 1000;


var serviceAccount = require("./runic-recruits-429d1-firebase-adminsdk-haua1-96f92923b3.json")
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://runic-recruits-429d1.firebaseio.com"
});

var firestore = admin.firestore();
var userColRef = firestore.collection('Users');
var leagueColRef = firestore.collection('Leagues');

var inGame = false;



var fullGameState = {
  currentDeck: "",
  /*null or (dictionary) */
  gameState: "",
  /*Menus or InProgress*/
  PlayerName: "Veelox",
  /*null or (username)*/
  prevGameID: "",
  GameID: "",
  /*-1 or (id)*/
};

var validGame = false;
var recruitChallenge = {
  "01PZ008": 3
};

async function getPlayerName() {
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
  if (!fullGameState.PlayerName) {
    return;
  }
  var userRef = userColRef.doc(fullGameState.PlayerName);
  var historyRef = userRef.collection("History");
  historyRef.where('Result', '==', true).get()
    .then(history => {
      console.log("1")
      let wins = 0;
      if (!history.empty) {
        wins = history.size;
      }
      userRef.set({
        Wins: wins
      }, {
        merge: true
      });
      console.log("1 done")
    })
    .catch(err => {
      console.log('Error getting documents', err);
    })
    .finally(lul => {
      historyRef.where('Result', '==', false).get()
        .then(history => {
          console.log("2")
          let losses = 0;
          if (!history.empty) {
            losses = history.size;
          }
          userRef.set({
            Losses: losses
          }, {
            merge: true
          });
          console.log("2 done")
        })
        .catch(err => {
          console.log('Error getting documents', err);
        })
        .finally(KEKW => {
          leaderboardUtil();
        });
    });
}

function leaderboardUtil() {
  if (!fullGameState.PlayerName) {
    return;
  }
  var userRef = userColRef.doc(fullGameState.PlayerName);
  userRef.get()
    .then(userDoc => {
      console.log("3")
      if (userDoc.empty) {
        console.log('No match history found');
        return;
      }
      var data = userDoc.data();
      var totalGames = data.Wins + data.Losses;
      var winLoss = data.Wins / totalGames;
      var weightedRatio = -1;
      if (totalGames > 5) {
        var weightedRatio = parseFloat(winLoss.toFixed(4)) + totalGames / 100000000
      }

      userRef.set({
        Winrate: winLoss,
        Games: totalGames,
        WeightedWL: weightedRatio
      }, {
        merge: true
      });
      console.log("3 done")
    })
    .catch(err => {
      console.log('Error getting documents', err);
    });
}

function generateLeaderboard() {
  //only check users with over # games
  userColRef.orderBy('WeightedWL', 'desc').get().then(querySnapshot => {
    querySnapshot.forEach(documentSnapshot => {
      console.log(`Found document at ${documentSnapshot.ref.path}`);
      console.log(JSON.stringify(documentSnapshot.data()));
    });
  });
}

async function mainLoop() {
  var gameState = await getGameState();
  fullGameState.gameState = gameState ? gameState : fullGameState.gameState;
  console.log("pls");
  // game is in progress, set flag to do processing after
  if (fullGameState.gameState === 'InProgress' && inGame === false) {
    inGame = true;
    var playerName = await getPlayerName();
    fullGameState.PlayerName = playerName ? playerName : fullGameState.PlayerName;
    var currentDeck = await getActiveDeck();
    fullGameState.currentDeck = currentDeck ? currentDeck : fullGameState.currentDeck;
    validGame = checkRestrictions();
    console.log("in loop");
  }
  console.log(JSON.stringify(fullGameState));
  // game has ended, but we have to do stuff on our end
  if (fullGameState.gameState === 'Menus' && inGame === true) {
    inGame = false;
    var gameResult = await getLastGameResult();
    console.log(gameResult);
    if (validGame) {
      var resultData = {
        GameID: gameResult.GameID,
        Result: gameResult.LocalPlayerWon
      }
      var setDoc = userColRef
        .doc(fullGameState.PlayerName).collection('History');
      setDoc.add(resultData).then(documentReference => {
        updatePlayerWinLoss();
      });
    }
  }
}
updatePlayerWinLoss();
generateLeaderboard();
//setInterval(mainLoop, ONE_SECOND * 5);