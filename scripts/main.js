const axios = require('axios');
const {
  setInterval
} = require('timers');
const admin = require('firebase-admin');
const TEN_SECONDS = 10000;
const ONE_SECOND = 1000;
const champList = {
  "01FR024":"Anivia",
  "01FR038":"Ashe",
  "01FR009":"Braum",
  "01NX038":"Darius",
  "01NX020":"Draven",
  "01SI053":"Elise",
  "01PZ036":"Ezreal",
  "01DE045":"Fiora",
  "01DE012":"Garen",
  "01SI042":"Hecarim",
  "01PZ056":"Heimerdinger",
  "01PZ040":"Jinx",
  "01SI030":"Kalista",
  "01IO041":"Karma",
  "01NX042":"Katarina",
  "01DE022":"Lucian",
  "01DE042":"Lux",
  "01IO032":"Shen",
  "01PZ008":"Teemo",
  "01SI052":"Thresh",
  "01FR039":"Tryndamere",
  "01NX006":"Vladimir",
  "01IO015":"Yasuo",
  "01IO009":"Zed"
};

var serviceAccount = require("./runic-recruits-429d1-firebase-adminsdk-haua1-96f92923b3.json")
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://runic-recruits-429d1.firebaseio.com"
});

var firestore = admin.firestore();
var userColRef = firestore.collection('Users');
var leagueColRef = firestore.collection('Leagues');
var leagueName = "";
var inGame = false;


var fullGameState = {
  currentDeck: "",
  /*null or (dictionary) */
  gameState: "",
  /*Menus or InProgress*/
  PlayerName: "",
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
    return response.data.PlayerName;
  } catch (error) {
    console.error(error);
  }
}

async function getActiveDeck() {
  try {
    const response = await axios.get('http://localhost:21337/static-decklist');
    return response.data.CardsInDeck;
  } catch (error) {
    console.error(error);
  }
}

async function getGameState() {
  try {
    const response = await axios.get('http://localhost:21337/positional-rectangles');
    return response.data.GameState;
  } catch (error) {
    console.error(error);
  }
}

async function getLastGameResult() {
  try {
    const response = await axios.get('http://localhost:21337/game-result');
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

function activeUser() {
  return !!fullGameState.PlayerName
}

function checkRestrictions() {
  if (!activeUser()) {
    return false;
  }
  for (var card in recruitChallenge) {
    let ourDeck = fullGameState.currentDeck[card];
    let targetDeck = recruitChallenge[card];
    if (isNaN(ourDeck) || ourDeck < targetDeck) {
      return false;
    }
  }
  return true;
}

function updatePlayerWinLoss() {
  if (!activeUser()) {
    return;
  }
  var userRef = userColRef.doc(fullGameState.PlayerName);
  var historyRef = userRef.collection(leagueName);
  var leagueStatRef = historyRef.doc("leagueStats");
  historyRef.where('Result', '==', true).get()
    .then(history => {
      let wins = 0;
      if (!history.empty) {
        wins = history.size;
      }
      leagueStatRef.set({
        Wins: wins
      }, {
        merge: true
      });
      $('#user-wins').text(wins);
    })
    .catch(err => {
      console.log('Error getting documents', err);
    })
    .finally(lul => {
      historyRef.where('Result', '==', false).get()
        .then(history => {
          let losses = 0;
          if (!history.empty) {
            losses = history.size;
          }
          leagueStatRef.set({
            Losses: losses
          }, {
            merge: true
          });
          $('#user-losses').text(losses);
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
  if (!activeUser()) {
    return;
  }
  var userRef = userColRef.doc(fullGameState.PlayerName);
  var historyRef = userRef.collection(leagueName);
  var leagueStatRef = historyRef.doc("leagueStats");
  leagueStatRef.get()
    .then(userDoc => {
      if (userDoc.empty) {
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
    })
    .catch(err => {
    });
}

function registerLeague() {
  leagueName = $('#league-streamer-name').val().toLowerCase();;
  $('#league-name').text(leagueName+"'s ");
  updatePlayerWinLoss();
  generateLeaderboard();
  getChallenge();
  inGame = false;
}

function generateLeaderboard() {
  let table = $('#leaderboard');
  $("#leaderboard tbody").empty();
  
  var newBody = $("<tbody id='leaderboardBody'>");
  table.append(newBody);
  //only check users with over # games
  var order = 1;
  userColRef.orderBy(leagueName, 'desc').get().then(querySnapshot => {
    querySnapshot.forEach(documentSnapshot => {
      var weightedWR = documentSnapshot.get(leagueName);
      if(!isNaN(weightedWR) && weightedWR >= 0){
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


  // game is in progress, set flag to do processing after
  if (fullGameState.gameState === 'InProgress' && inGame === false) {
    inGame = true;
    var playerName = (await getPlayerName()).toLowerCase();
    fullGameState.PlayerName = playerName ? playerName : fullGameState.PlayerName;
    $('#user-name').text(fullGameState.PlayerName);
    var currentDeck = await getActiveDeck();
    fullGameState.currentDeck = currentDeck ? currentDeck : fullGameState.currentDeck;
    validGame = checkRestrictions();
  }


  // game has ended, but we have to do stuff on our end
  if (fullGameState.gameState === 'Menus' && inGame === true) {
    inGame = false;
    var gameResult = await getLastGameResult();
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

function populateDropdown(){
  let dropdown = $('#challenge-champ');
  dropdown.empty();
  dropdown.append('<option selected="true" disabled>Choose a Champion</option>');
  dropdown.prop('selectedIndex', 0);
  const url = './IdToChamps.json';
  $.getJSON(url, function (data) {
    $.each(data, function (key, entry) {
      dropdown.append($('<option></option>').attr('value', key).text(entry));
    })
  });
}

function saveChallenge() {
  var champId = $("#challenge-champ option:selected").val();
  recruitChallenge = {[champId] : 3};
  var setDoc = leagueColRef
    .doc(fullGameState.PlayerName);
  setDoc.set({
    RecruitChallenge: recruitChallenge
  });
}

function getChallenge() {
  if(!leagueName){
    return;
  }
  leagueColRef
    .doc(leagueName).get().then(leagueInfo => {
      recruitChallenge = leagueInfo.data().RecruitChallenge;
    })
    .catch(error => {

    })
    .finally(idk => {
      genChallengeText();
    });
}


function genChallengeText() {
  var challengeStr = "Play ";
  for(champ in recruitChallenge){
    challengeStr += `${recruitChallenge[champ]} ${champList[champ]}s `
  }
  challengeStr += "in your deck to compete in this challenge"
  $("#challenge-string").text(challengeStr);
}


function statsLoop() {
  if (!activeUser() || !leagueName) {
    return;
  }
  updatePlayerWinLoss()
  generateLeaderboard()
}

populateDropdown();
setInterval(mainLoop, ONE_SECOND * 5);
setInterval(statsLoop, ONE_SECOND * 5);
setTimeout(populateDropdown, ONE_SECOND*2);