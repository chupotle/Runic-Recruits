# Runic-Recruits

## Idea: Runic Recruits - Twitch Integrated “Ladder/Tourney” System.

### Purpose and Focus:
>Our main focus with the implementation of this feature is for streamers, content creators, or even a group of friends to make a community-based leaderboard to engage in friendly competition. This is not a replacement for a ranking ladder, but rather a casual competition.

>Through the implementation of a community leaderboard system, content creators have a platform in order to engage their viewers and community, which can be expanded to be sponsored and encouraged through the Riot Games content creator partnership programs.

### Function:
>Allow community created leaderboards which can be joined through a room code. This room would contain a leaderboard that lists everyone in the lobby, and then tracks their future games towards that lobby. 

>Additionally, leaderboard creators can add restrictions to joining or having their games recorded towards the leaderboard.

### General Flow and API Usage:

1. The leader, streamer, or individual starts the lobby and is given a room code.

2. Prospective participants enter the room code in a specified area to join the lobby.

3. The database/tracker starts polling for games played by the participants.
  * Our initial plan is to have an automatic poll for results [GET http://localhost:{port}/game-result] every 5 minutes and participants can also force poll their game.
  * Wins would contribute points towards the leaderboard score.


### Building Locally:
Install the latest Node.js 12+ LTS version.

After Node has been installed, cd to the cloned directory and run:
```npm install```

To run the application:
```npm start```
