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
var intervalo, juezAnterior;
var cuentaAtras = (1*60);
var cuentaActual = cuentaAtras;
var iniciado = false;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
server.listen(port, () => console.log('Servidor iniciado en '+port));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/restart', (req, res) =>{
  jugadores = [];
  respuestas = [];
  subject = '';
  cuentaActual = cuentaAtras;
  iniciado = false;
  res.send('Reiniciado');
});


io.on('connection', socket => {
  //console.log('Se conectó un usuario', socket.id);

  socket.on('disconnect', () => {
    //console.log('Se desconectó un usuario', socket.id);
    jugadores = jugadores.filter(j => j.id !=  socket.id);
    //console.log(jugadores);
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
    if (respuestas.length == jugadores.length - 1) {
      console.log('---//////////////-----');
      console.log(respuestas);
      console.log('---//////////////-----');
      jugadores.forEach((j, i)=>{
        if (j.rol == 'Juez') io.to(j.id).emit('respuestas_usuarios', respuestas);
      });
    }
  });

  socket.on('ganador', (data)=>{
    let ganador = data.ganador;
    io.emit('juego_terminado', ganador);
    jugadores = [];
    respuestas = [];
    subject = '';
    cuentaActual = cuentaAtras;
    iniciado = false;
  });

  socket.on('estoy_listo', ()=>{
    let listos = 0;
    jugadores.forEach((j, i)=>{
      if (j.id == socket.id) j.listo = true ;
      if (j.listo === true) listos++;
    });
    io.emit('jugador_listo', socket.id);
    if(listos === jugadores.length && jugadores.length > 2){
      let judge = Math.floor((Math.random() * jugadores.length));
      console.log(juezAnterior);
      console.log('\\\\\\\\\\\\\\\\\\\\\\');
      console.log(jugadores);
      if(!jugadores.find(j=>(juezAnterior != undefined ? j.id == juezAnterior.id : false))){
        jugadores.forEach((j, i)=> {
          if(i === judge ){
            j.rol = 'Juez';
            juezAnterior = j;
          }
          else{
            j.rol = 'Competidor'
          }
        });
      }
      else{
        jugadores.forEach((j, i)=>{
          j.rol = (j.id === juezAnterior.id) ? 'Juez' : 'Competidor';
        });
      }
      io.emit('iniciando_juego', jugadores);
      iniciado = true;
    }
  });

  socket.on('inicio_jugador', (data)=>{
    if (!iniciado) {
      jugadores.push(data);
      io.to(data.id).emit(
        'bienvenida_jugador',
        {
          jugadores: jugadores,
          html: `
        			<div class="row my-2">
        				<div class="col-md">
        					<b class="h4">
        						Jugadores conectados
        					</b>
        				</div>
        			</div>
        			<div class="row">
        				<div class="col-md-3 col-sm"> 
        					<table>
        						<thead>
        							<tr class="row">
        								<th class="col-1">#</th>
        								<th class="col-7">Nombre</th>
        								<th class="col-3" id="rolTh"></th>
        							</tr>
        						</thead>
        						<tbody id="lista-users">

        						</tbody>
        					</table>
        				</div>
        				<div class="col-md col-sm" id="contenedorPrincipal">
                  <div class="row p-3">
                    <div class="col-md-1"></div>
        						<div class="col-md-8 col-sm" id="mainColumn">
        							<p class="text-center" id="esperaMsg">
        								Esperando a los demás jugadores . . .
        							</p>
        						</div>
                    <div class="col-md-3 col-sm" id="asideColumn">

                    </div>
        					</div>
        				</div>
        			</div>
            `
        });
        socket.broadcast.emit('acceso_jugador', data);
    }
    else {
      io.to(data.id).emit('accesso_denegado', 'Lo sentimos, el juego ya ha iniciado');
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
