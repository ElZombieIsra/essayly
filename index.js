const express = require('express');
const bodyParser = require('body-parser');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');
var h2t= require('html-to-text');
var port = process.env.PORT || 8090;
var jugadores = [];
var respuestas = [];
var subject = '';
var intervalo;
var cuentaAtras = (1*60);
var cuentaActual = cuentaAtras;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
server.listen(port, () => console.log('Servidor iniciado en '+port));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});


io.on('connection', socket => {
  console.log('Se conectó un usuario', socket.id);

  socket.on('disconnect', () => {
    console.log('Se desconectó un usuario', socket.id);
    jugadores = jugadores.filter(j => j.id !=  socket.id);
    console.log(jugadores);
    io.emit('abandono_jugador', jugadores);
	});

  socket.on('subject', (data)=>{
    jugadores.forEach((j, i)=>{
      if (j.id === data.id && j.rol === 'Juez') {
        subject = data.subject;
        socket.broadcast.emit('juego_iniciado', subject);
        intervalo = setInterval(()=>{contar()}, 1000);
      }
    });
  });

  socket.on('respuestas', (data)=>{
    respuestas.push(data);
    if (respuestas.length == 2) {
      jugadores.forEach((j, i)=>{
        if (j.rol == 'Juez') io.to(j.id).emit('respuestas_usuarios', respuestas);
      });
    }
  });

  socket.on('ganador', (data)=>{
    let ganador = data.ganador;
    io.emit('juego_terminado', ganador);
    jugadores = [];
    subject = '';
    cuentaActual = cuentaAtras;
  });

  socket.on('inicio_jugador', (data)=>{
    if (jugadores.length <= 2) {
      jugadores.push(data);
      io.to(data.id).emit(
        'bienvenida_jugador',
        {
          jugadores: jugadores,
          html: `
        			<div class="row my-2">
        				<div class="col-md-4">
        					<b class="h4">
        						Jugadores conectados
        					</b>
        				</div>
        			</div>
        			<div class="row">
        				<div class="col-md-4 col-sm table-responsive">
        					<table class="table table-dark table-striped table-hover">
        						<thead>
        							<tr>
        								<th scope="col">#</th>
        								<th scope="col">Nombre</th>
        								<th scope="col">Rol</th>
        							</tr>
        						</thead>
        						<tbody id="lista-users">

        						</tbody>
        					</table>
        				</div>
        				<div class="col-md col-sm" id="contenedorPrincipal">
        					<div class="row p-3">
        						<div class="col-md-8 col-sm" id="mainColumn">
        							<p class="text-center">
        								Esperando a los demás jugadores . . .
        							</p>
        						</div>
                    <div class="col-md-4 col-sm" id="asideColumn">

                    </div>
        					</div>
        				</div>
        			</div>
            `
        });
        socket.broadcast.emit('acceso_jugador', data);
      if (jugadores.length == 3) {
        let judge = Math.floor((Math.random() * jugadores.length));
        console.log(judge);
        jugadores.forEach((j, i)=> {i === judge ? j.rol = 'Juez' : j.rol = 'Competidor'});
        io.emit('iniciando_juego', jugadores);
      }
    }
    else {
      io.to(data.id).emit('accesso_denegado', 'Lo sentimos, la sala de juego está llena');
    }
  });
});

function contar(){
  if (cuentaActual < 0) {
    console.log('bye');
    clearInterval(intervalo);
    io.emit('tiempo-agotado');
  }
  else{
    cuentaActual--;
  }
}
