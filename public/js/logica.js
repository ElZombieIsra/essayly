var socket = io();
var jugadores = [];
var user = '';
var subject = '';
var cuentaAtras = (1*60);
var cuentaActual = cuentaAtras;
var intervalo, espera, intervaloAnimacion;
var backgroundToast = '#3EAC6C';


$(()=>{
  $('#login').off('click').on('click', ()=>{
    if ($('#username').val() && $('#username').val()[0] !== " ") {
      user = $('#username').val();
      socket.emit('inicio_jugador', {
        id:socket.id, 
        user:$('#username').val(), 
        rol:'', 
        listo: false
      });
      swal({
        title: 'Bienvenido',
        type: 'success',
        showConfirmButton: false,
        timer: 3000,
        toast: true,
        position: 'top-end',
        background: backgroundToast
      });
    }
    else{
      swal({
        title: 'Error',
        text: 'Es necesario un nombre de usuario',
        type: 'error',
        showConfirmButton: false,
        timer: 3000,
        toast: true,
        position: 'top-end',
        background: backgroundToast
      });
    }
  });

  $('body').on('click', '#subjectBtn', ()=>{
    if ($('#subject').val() && $('#subject').val()[0] !== " ") {
      swal({
        title: 'Juego iniciado',
        text: 'Espere a que los jugadores terminen de redactar',
        timer: 60000,
        background: backgroundToast,
        showCloseButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        onOpen: ()=>{
          swal.showLoading()
        }
      });
      socket.emit('subject', {id: socket.id, subject: $('#subject').val()});
    }
    else{
      swal({
        title: 'Error',
        text: 'Es necesario que llene el campo',
        type: 'error',
        showConfirmButton: false,
        timer: 3000,
        toast: true,
        position: 'top-end',
        background: backgroundToast
      });
    }
  });

  $('form').on('submit', () => {return false});
});

socket.on('bienvenida_jugador', (data)=>{
  //console.log(data);
  jugadores = data.jugadores;
  $('#tituloDiv').removeClass('animated infinite tada');
  $('#mainContainer').html(data.html);
  espera = true;
  $('#esperaMsg').addClass('animated fadeInDown');
  animacionEspera();
  cargarJugadores();
})

socket.on('acceso_jugador', (data)=>{
  jugadores.push(data);
  //console.log(jugadores);
  cargarJugadores();
});

socket.on('accesso_denegado', (data)=>{
  swal({
    title: 'Error',
    text: data,
    type: 'error',
    showConfirmButton: false,
    timer: 3000,
    toast: true,
    position: 'top-end',
    background: backgroundToast
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
          <button type="button" class="btn bttn btn-lg" id="subjectBtn">Enviar</button>
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
  //console.log(jugadores);
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
    //console.log(result);
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
        <p class="h4" id="tiempoCuenta">Tiempo: <b class="" id="cuentaAtras"></b></p>
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

socket.on('tiempo-agotado', ()=>{
  let rol;
  jugadores.forEach((j, i)=>{
    j.id == socket.id ? rol = j.rol : '';
  });
  if(rol !== 'Juez'){
    socket.emit('respuestas', {id: socket.id, respuesta: $('#respuesta').val()});
  }
});

socket.on('jugador_listo', (data)=>{
  let listos = 0;
  jugadores.forEach((j, i)=>{
    if (data == j.id) j.listo = true;
    if (j.listo) listos ++;
  });
  $('#esperaMsg').text(listos >= 3 ? 'Esperando a los demás jugadores . . .' : 'Se necesitan al menos 3 jugadores para iniciar');
  cargarJugadores();
});

socket.on('respuestas_usuarios', (data)=>{
  //console.log(data);
  let html = `
    <div class="row">
      <div class="col-md-1"></div>
  `;
  data.forEach((d, i)=>{
    html += `
          <div class="col">
            <div class="card" style="width: 20vw;">
              <div class="card-body">
                <h4 class="card-title">Competidor ${i+1}</h4>
                <p class="card-text">${d.respuesta}</p>
                <a href="#" style="color: #080801;" socketId="${d.id}" class="btn-ganador btn bttn btn-lg">Declarar ganador</a>
              </div>
            </div>
          </div>
      `;
  });
  html += `</div>`;
  $('#contenedorPrincipal').html(html);
  
  $('.btn-ganador').off('click').on('click', function(){
    var that = this;
    console.log($(that).attr('socketId'));
    console.log(that);
    socket.emit('ganador', {id: socket.id, ganador: $(that).attr('socketId')});
  });
});

function cargarJugadores(){
  let html = '';
  let icon = `
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
    width="5vw" height="5vh"
    viewBox="0 0 252 252"
    style="fill:#000000;"><g transform=""><g fill="none" fill-rule="nonzero" stroke="none" stroke-width="none" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal"><path d="M0,252v-252h252v252z" fill="none" stroke="none" stroke-width="1"></path><g><g id="surface1"><path d="M126,242.55c-64.25508,0 -116.55,-52.29492 -116.55,-116.55c0,-64.25508 52.29492,-116.55 116.55,-116.55c64.25508,0 116.55,52.29492 116.55,116.55c0,64.25508 -52.29492,116.55 -116.55,116.55z" fill="#44abdf" stroke="none" stroke-width="1"></path><path d="M126,12.6c62.53242,0 113.4,50.86758 113.4,113.4c0,62.53242 -50.86758,113.4 -113.4,113.4c-62.53242,0 -113.4,-50.86758 -113.4,-113.4c0,-62.53242 50.86758,-113.4 113.4,-113.4M126,6.3c-66.10078,0 -119.7,53.59922 -119.7,119.7c0,66.10078 53.59922,119.7 119.7,119.7c66.10078,0 119.7,-53.59922 119.7,-119.7c0,-66.10078 -53.59922,-119.7 -119.7,-119.7z" fill="#540052" stroke="none" stroke-width="1"></path><path d="M69.3,126l37.8,37.8l81.9,-81.9" fill="none" stroke="#fffc24" stroke-width="12.6"></path></g></g><path d="M126,252c-69.58788,0 -126,-56.41212 -126,-126v0c0,-69.58788 56.41212,-126 126,-126v0c69.58788,0 126,56.41212 126,126v0c0,69.58788 -56.41212,126 -126,126z" fill="none" stroke="none" stroke-width="1"></path><path d="M126,246.96c-66.80436,0 -120.96,-54.15564 -120.96,-120.96v0c0,-66.80436 54.15564,-120.96 120.96,-120.96h0c66.80436,0 120.96,54.15564 120.96,120.96v0c0,66.80436 -54.15564,120.96 -120.96,120.96z" fill="none" stroke="none" stroke-width="1"></path><path d="M126,252c-69.58788,0 -126,-56.41212 -126,-126v0c0,-69.58788 56.41212,-126 126,-126v0c69.58788,0 126,56.41212 126,126v0c0,69.58788 -56.41212,126 -126,126z" fill="none" stroke="none" stroke-width="1"></path><path d="M126,246.96c-66.80436,0 -120.96,-54.15564 -120.96,-120.96v0c0,-66.80436 54.15564,-120.96 120.96,-120.96h0c66.80436,0 120.96,54.15564 120.96,120.96v0c0,66.80436 -54.15564,120.96 -120.96,120.96z" fill="none" stroke="none" stroke-width="1"></path><path d="" fill="none" stroke="none" stroke-width="1"></path><path d="" fill="none" stroke="none" stroke-width="1"></path></g></g></svg>
  `;
  jugadores.forEach((j, i)=>{
    html+= `
      <tr class="row animated bounceInLeft">
        <td class="col-1">${i+1}</td>
        <td class="col-7">${j.user}</td>
        <td class="col-3" id="${'ready'+(j.user)}">${j.rol !== '' ? j.rol : (j.listo ? icon : (j.user == user ? `<button class="btn bttn" id="btnReady">Estoy listo</button>` : ``))}<td>
      </tr>
    `;
  });
  $('#lista-users').html(html);
  $('#btnReady').off('click').on('click', ()=>{
    socket.emit('estoy_listo');
    $(`ready${user}`).html(icon);
  });
}

function contar(){
  //console.log(cuentaActual);
  if (cuentaActual == 15) $('#tiempoCuenta').removeClass('h4').addClass('h2 animated infinite flash');
  if (cuentaActual < 0) {
    $('#tiempoCuenta').removeClass('h2 animated infinite flash').addClass('h4');
    console.log('bye');
    clearInterval(intervalo);
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

function animacionEspera(){
  if($('#esperaMsg.fadeInDown').length >= 1){
    $('#esperaMsg.fadeInDown').removeClass('fadeInDown').addClass('fadeOutDown');
  }
  else{
    $('#esperaMsg.fadeOutDown').removeClass('fadeOutDown').addClass('fadeInDown');
  }
  if (espera) setTimeout(animacionEspera, 2000);
}

intervaloAnimacion = setInterval(()=>{
  $('#btnReady').addClass('animated shake');
  setTimeout(()=>{
    $('#btnReady').removeClass('animated shake')
  },1000);
}, 4000);