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
var leagueName = "scarra";
var inGame = false;



var fullGameState = {
  currentDeck: "",
  /*null or (dictionary) */
  gameState: "",
  /*Menus or InProgress*/
  PlayerName: "Chuuu",
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
  var historyRef = userRef.collection(leagueName);
  var leagueStatRef = historyRef.doc("leagueStats");
  historyRef.where('Result', '==', true).get()
    .then(history => {
      console.log("1")
      let wins = 0;
      if (!history.empty) {
        wins = history.size;
      }
      leagueStatRef.set({
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
          leagueStatRef.set({
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
          setTimeout(leaderboardUtil, ONE_SECOND*5);
        });
    });
}

function leaderboardUtil() {
  if (!fullGameState.PlayerName) {
    return;
  }
  var userRef = userColRef.doc(fullGameState.PlayerName);
  var historyRef = userRef.collection(leagueName);
  var leagueStatRef = historyRef.doc("leagueStats");
  leagueStatRef.get()
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

      leagueStatRef.set({
        Winrate: winLoss,
        Games: totalGames,
        WeightedWL: weightedRatio
      }, {
        merge: true
      });
      
      userRef.set({
        [leagueName]: weightedRatio
      }, {
        merge: true
      });
      console.log("3 done")
    })
    .catch(err => {
      console.log('Error getting documents', err);
    });
}

function registerLeague() {
  leagueName = $('#league-streamer-name').val();
  generateLeaderboard();
}

function generateLeaderboard() {
  let table = $('#leaderboard');
  $("#leaderboard tbody").empty();
  
  var newBody = $("<tbody id='leaderboardBody'>");
  table.append(newBody);
  //only check users with over # games
  var order = 1;
  const pls = String(leagueName);
  userColRef.orderBy(pls, 'desc').get().then(querySnapshot => {
    querySnapshot.forEach(documentSnapshot => {
      var weightedWR = documentSnapshot.get(leagueName);
      if(!isNaN(docFields)){
        var sumName = documentSnapshot.id;
        var cols = "";
        cols += `<td>${order}</td>`;
        cols += `<td>${sumName}</td>`;
        cols += `<td>${(weightedWR*100).toFixed(2)}\%</td>`;
        order++;
        
        var newRow = $("<tr>");
        newRow.append(cols);
        newBody.append(newRow);
      }
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
    $('#user-name').text(fullGameState.PlayerName);
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
        .doc(fullGameState.PlayerName).collection(leagueName);
      setDoc.add(resultData).then(documentReference => {
        updatePlayerWinLoss();
      });
    }
  }
}
setTimeout(generateLeaderboard, ONE_SECOND);
//setInterval(mainLoop, ONE_SECOND * 5);