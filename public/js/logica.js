var socket = io();
var jugadores = [];
var user = '';
var subject = '';
var cuentaAtras = (1*60);
var cuentaActual = cuentaAtras;
var intervalo;

$(()=>{
  $('#login').off('click').on('click', ()=>{
    if ($('#username').val() && $('#username').val()[0] !== " ") {
      user = $('#username').val();
      socket.emit('inicio_jugador', {id:socket.id, user:$('#username').val(), rol:''});
      swal({
        title: 'Bienvenido',
        type: 'success',
        showConfirmButton: false,
        timer: 2000
      });
    }
    else{
      swal({
        title: 'Error',
        text: 'Es necesario un nombre de usuario',
        type: 'error',
      });
    }
  });

  $('body').on('click', '#subjectBtn', ()=>{
    swal({
      title: 'Juego iniciado',
      text: 'Espere a que los jugadores terminen de redactar',
      timer: 60000,
      showCloseButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      onOpen: ()=>{
        swal.showLoading()
      }
    });
    if ($('#subject').val() && $('#subject').val()[0] !== " ") {
      socket.emit('subject', {id: socket.id, subject: $('#subject').val()});
    }
    else{
      swal({
        title: 'Error',
        text: 'Es necesario que llene el campo',
        type: 'error'
      });
    }
  });

  $('body').on('click', '#btn-1', ()=>{
    socket.emit('ganador', {id: socket.id, ganador: $('#btn-1').attr('socketId')})
  });

  $('body').on('click', '#btn-2', ()=>{
    socket.emit('ganador', {id: socket.id, ganador: $('#btn-2').attr('socketId')})
  });

  $('form').on('submit', () => {false});
});

socket.on('bienvenida_jugador', (data)=>{
  console.log(data);
  jugadores = data.jugadores;
  $('#mainContainer').html(data.html);
  cargarJugadores();
})

socket.on('acceso_jugador', (data)=>{
  jugadores.push(data);
  console.log(jugadores);
  cargarJugadores();
});

socket.on('accesso_denegado', (data)=>{
  swal({
    title: 'Error',
    text: data,
    type: 'error'
  });
});

socket.on('iniciando_juego', (data)=>{
  jugadores = data;
  cargarJugadores();
  let htmlChallenger = `
    <div class="h2 text-center">
      El Juez está escogiendo el tema.
    </div>
  `;
  let htmlJudge = `
    <div class="row my-3">
      <div class="col">
        <div class="h3 text-center">Escoge un tema para describir</div>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <form class="form-inline justify-content-center">
          <input type="text" class="form-control form-control-lg" placeholder="Tema" id="subject">
          &nbsp;
          <button type="button" class="btn btn-dark btn-lg" id="subjectBtn">Enviar</button>
        </form>
      </div>
    </div>
  `;
  jugadores.forEach((j, i)=>{
    if(j.user == user){
      j.rol == 'Juez' ? $('#contenedorPrincipal').html(htmlJudge) : $('#mainColumn').html(htmlChallenger);
    }
  });
});

socket.on('abandono_jugador', (data)=>{
  jugadores = data;
  cargarJugadores();
});

socket.on('juego_terminado', (data)=>{
  let usuario;
  jugadores.forEach((j, i)=>{
    if(j.id === data) usuario = j.user;
  });
  swal({
    title: 'Juego terminado',
    text: 'El ganador es: ' + usuario,
    type: 'success',
    showCancelButton: true,
    confirmButtonColor: '#1e7e34',
    cancelButtonColor: '#343a40',
    confirmButtonText: 'Votar revancha',
    cancelButtonText: 'Cerrar'
  }).then((result)=>{
    console.log(result);
    if (result.value) {
      jugadores = [];
      subject = '';
      cuentaActual = cuentaAtras;
      socket.emit('inicio_jugador', {id:socket.id, user:user, rol:''});
    }
  });
});

socket.on('juego_iniciado', (data)=>{
  subject = data;
  let html = `
    <div class="row">
      <div class="col">
        <p class="h4">Tiempo: <b class="" id="cuentaAtras"></b></p>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <p class="h4">Tema: <b>${subject}</b></p>
      </div>
    </div>
  `;
  let textarea = `
    <label for="respuesta"> Describe el tema lo más rápido que puedas.</label>
    <textarea class="form-control" id="respuesta" rows="5"></textarea>
  `;
  $('#mainColumn').html(textarea);
  $('#asideColumn').html(html);
  intervalo = setInterval(()=>{contar()}, 1000);
});

socket.on('respuestas_usuarios', (data)=>{
  let respuesta1 = data[0].respuesta,
      respuesta2 = data[1].respuesta,
      id1 = data[0].id,
      id2 = data[1].id,
      html = `
        <div class="row">
          <div class="col">
            <div class="card" style="width: 100%;">
              <div class="card-body">
                <h4 class="card-title">Competidor 1</h4>
                <p class="card-text">${respuesta1}</p>
                <a href="#" id="btn-2" socketId="${id1}" class="btn-ganador btn btn-dark btn-lg">Declarar ganador</a>
              </div>
            </div>
          </div>
          <div class="col">
            <div class="card" style="width: 100%;">
              <div class="card-body">
                <h4 class="card-title">Competidor 2</h4>
                <p class="card-text">${respuesta2}</p>
                <a href="#" id="btn-2" socketId="${id2}" class="btn-ganador btn btn-dark btn-lg">Declarar ganador</a>
              </div>
            </div>
          </div>
        </div>
      `;
  $('#contenedorPrincipal').html(html);
});

function cargarJugadores(){
  let html = '';
  jugadores.forEach((j, i)=>{
    html+= `
      <tr>
        <td>${i+1}</td>
        <td>${j.user}</td>
        <td id="${'ready'+(j.user)}">${j.rol}<td>
      </tr>
    `;
  });
  $('#lista-users').html(html);
}

function contar(){
  //console.log(cuentaActual);
  if (cuentaActual < 0) {
    console.log('bye');
    clearInterval(intervalo);
    socket.emit('respuestas', {id: socket.id, respuesta: $('#respuesta').val()});
    swal({
      title: 'Se acabó el tiempo',
      type: 'info',
      showConfirmButton: false,
      timer: 1500
    });
    $('#respuesta').attr('disabled', 'true');
  }
  else{
    $('#cuentaAtras').text(cuentaActual);
    cuentaActual--;
  }
}
