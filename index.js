var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use(express.static('.'));
server.listen(8080);

app.get('/', function (req, res) {
  res.redirect('/connect_four.html');
});

const size_x = 7, size_y = 6;
const colors = ['blue', 'green'];
var color;

function empty_grid(){
  grid = [];
  for(var x=0; x<size_x; x++){
    var column = [];
    for(var y=0; y<size_y; y++){
      column.push('white');
    }
    grid.push(column);
  }
  return grid;
}

function insert(column_index){
  var column = grid[column_index];
  var inserted = false;
  for(var y=(size_y-1); y>=0; y--){
    if(column[y] === 'white'){
      column[y] = color;
      inserted = true;
      break;
    }
  }
  return inserted;
}

function valid_indices(x, y){
  return (x>=0 && x<size_x) && (y>=0 && y<size_y);
}

const directions = [
    [0,1],
    [1,0],
    [0,-1],
    [-1,0],
    [1,1],
    [-1,-1],
    [-1, 1],
    [1, -1]
  ];

function check_pos_dir(x, y, direction){
  var x2=x;
  var y2=y;
  var circles = [];
  for(var c=0; c<4; c++){
    x2 += direction[0];
    y2 += direction[1];
    if(!valid_indices(x2, y2)) return false;
    if(grid[x2][y2]!==color) return false;
    circles.push([x2, y2]);
  }
  for(var i=0; i<4; i++){
    var pos = circles[i];
    grid[pos[0]][pos[1]]='black';
  }
  return true;
}

function check_endgame(){
  for(var x=0; x<size_x; x++){
    for(var y=0; y<size_y; y++){
      for(var dir_i=0; dir_i<directions.length; dir_i++){
        var direction = directions[dir_i];
        var result = check_pos_dir(x,y, direction);
        if(result) return true;
      }
    }
  }
  return false;
}

function new_game(){
  grid = empty_grid();
  win = null;
  color = colors[0];  
}
new_game();
io.on('connection', function (socket) {
  function on_new_game(){
    new_game()
    socket.broadcast.emit('new_game_propagated');
  }
  socket.on('new_game_server', on_new_game);

  function on_insert_request(data){
    console.log('on insert');
    var column = data.column;

    // able to insert, inserted
    socket.broadcast.emit('insert_propagated', data);
    
    // is game in progress?
    if(win) return;

    // try to insert
    var inserted = insert(column);
    if(!inserted){
      // unable to insert
      console.log('full');
      return;
    }else{      
      // endgame
      var end = check_endgame();
      if(end){
        console.log(color+' wins');
        win = color;
      }
    }
    // turns
    color = colors[(colors.indexOf(color)+1)%(colors.length)];
  }
  socket.on('insert_request', on_insert_request);
  
  function on_load_page_request(){
    console.log('on_load_page_request');
    data = {};
    data.grid = grid;
    data.win = win;
    data.color = color;
    socket.emit('load_page_response', data);
  }
  socket.on('load_page_request', on_load_page_request);
  
});