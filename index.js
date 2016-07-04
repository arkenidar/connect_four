var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use(express.static('.'));

server.listen(8080, function () {
  console.log('listening on port 8080!');
});

app.get('/', function (req, res) {
  res.redirect('/connect_four.html');
});

const sizeX = 7, sizeY = 6;
const colors = ['blue', 'green'];
var color;

// grid operation
function emptyGrid() {
  grid = [];
  for (var x = 0; x < sizeX; x++) {
    var column = [];
    for (var y = 0; y < sizeY; y++) {
      column.push({ color: 'white', blink: false });
    }
    grid.push(column);
  }
  return grid;
}

// grid operation
function insert(columnIndex) {
  var column = grid[columnIndex];
  var inserted = false;
  for (var y = (sizeY - 1); y >= 0; y--) {
    if (column[y].color === 'white') {
      column[y].color = color;
      inserted = true;
      break;
    }
  }
  return inserted;
}

function validIndices(x, y) {
  return (x >= 0 && x < sizeX) && (y >= 0 && y < sizeY);
}

const directions = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
  [1, 1],
  [-1, -1],
  [-1, 1],
  [1, -1]
];

// grid operation
function checkPosDir(x, y, direction) {
  var x2 = x;
  var y2 = y;
  var circles = [];
  for (var c = 0; c < 4; c++) {
    x2 += direction[0];
    y2 += direction[1];
    if (!validIndices(x2, y2)) return false;
    if (grid[x2][y2].color !== color) return false;
    circles.push([x2, y2]);
  }
  for (var i = 0; i < 4; i++) {
    var pos = circles[i];
    var x = pos[0];
    var y = pos[1];
    grid[x][y].blink = true;
  }
  return true;
}

function checkEndGame() {
  for (var x = 0; x < sizeX; x++) {
    for (var y = 0; y < sizeY; y++) {
      for (var dirI = 0; dirI < directions.length; dirI++) {
        var direction = directions[dirI];
        var result = checkPosDir(x, y, direction);
        if (result) return true;
      }
    }
  }
  return false;
}

function newGame(firstTurnColor) {
  grid = emptyGrid();
  win = null;
  color = firstTurnColor;
  gameInProgress = true;
}

function initialState() {
  grid = emptyGrid();
  win = null;
  color = null;
  gameInProgress = false;
}
initialState();

io.on('connection', function (socket) {
  function onNewGameServer(data) {
    newGame(data.color);
    socket.broadcast.emit('newGamePropagated', { color });
  }
  socket.on('newGameServer', onNewGameServer);

  function onInsertRequest(data) {
    console.log('on insert');
    var column = data.column;

    // able to insert, inserted
    socket.broadcast.emit('insertPropagated', data);

    // is game in progress?
    if (win) return;

    // try to insert
    var inserted = insert(column);
    if (!inserted) {
      // unable to insert
      console.log('full');
      return;
    } else {
      // endgame
      var end = checkEndGame();
      if (end) {
        console.log(color + ' wins');
        win = color;
      }
    }
    // turns
    color = colors[(colors.indexOf(color) + 1) % (colors.length)];
  }
  socket.on('insertRequest', onInsertRequest);

  function onLoadPageRequest() {
    console.log('onLoadPageRequest');
    data = { win, color, grid, gameInProgress };
    socket.emit('loadPageResponse', data);
  }
  socket.on('loadPageRequest', onLoadPageRequest);

});