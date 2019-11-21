$(() => {
  const crypto = require('crypto')
  const axios = require('axios')
  const TEN_SECONDS = 10000;
  const ONE_SECONDS = 1000;
  const TEEMO_CODE = '01PZ008';
  var fullGameState = {
    currentDeck = "", /*null or (dictionary) */
    gameState = "Menus", /*Menus or InProgress*/
    currentUser = "", /*null or (username)*/
    prevGameID = "",
    GameID = "", /*-1 or (id)*/
  }
  var validGame = false;
  var recruitChallenge;

  function mainLoop() {
    // i think we want to constantly check for current user?
    // or maybe we just run this when we see a gamestate change
    getCurrentUser().then(data => {
      currentUser = data ? data : currentUser;
    });
    // this should defo run all the time, or maybe we keep track of change
    // when we see gamestat
    updateGameState().then(data => {
      gameState = data;
    });
    getActiveDeck().then(data => {
      currentDeck = data;
      validGame = checkRestrictions();
    });
    getLastGameResult().then(data => {
      // check if GameID changes, if it did, then it means a game has ended
      if (data.GameID === fullGameState.GameID) {
        fullGameState.prevGameID = fullGameState.GameID;
        fullGameState.GameID = data.GameID;
        // record game result
        if (validGame) {
          if(data.LocalPlayerWon){
            //send shit to db
          }
        }
      }
    });
  }










  $('#text-input').bind('input propertychange', function () {

    getActiveDeck().then(data => {
      currentDeck = data;
      $('#md5-output').text(currentDeck.DeckCode);


      for (var key in currentDeck.CardsInDeck) {
        $('#sha256-output').text(currentDeck.CardsInDeck[key])
      }
    });

    //$('#sha1-output').text(sha1)
    //myTimer();
    //$('#sha256-output').text(sha256)
    getCurrentUser().then(data => {
      currentUser = data;
      $('#sha512-output').text(currentUser);

    });
  })



  function getActiveDeck() {
    return axios.get('http://localhost:21337/static-decklist')
      .then((result) => {
        return result.data.CardsInDeck;
      }).catch((err) => {
        return "F";
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
        return result;
      }).catch((err) => {
        return "F";
      });
  }

  function getRestrictionsForLobby() {
    // some call to sql db, expecting data to be returned as deck string, i.e.
    // {"01PZ001":3,"01PZ004":3}
  }

  function checkRestrictions() {
    for (var card in recruitChallenge) {
      if (currentDeck[card] < recruitChallenge[card]) {
        return false;
      }
    }
    return true;
  }
  setInterval(mainLoop, ONE_SECONDS);
  $('#text-input').focus() // focus input box
})