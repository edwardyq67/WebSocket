const { Client } = require('pg'); // Importa el cliente de PostgreSQL
const WebSocket = require('ws');  // Importa el paquete WebSocket

// Configuración de la base de datos
const pgRegister = {
  user: "yego_user",
  host: "168.119.226.236",
  database: "yego_registro",
  password: "37>MNA&-35+",
  port: 5432,
};

// Crea una nueva instancia del cliente de PostgreSQL
const client = new Client(pgRegister);

// Crear un servidor WebSocket para enviar notificaciones
const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log('Servidor WebSocket corriendo en ws://localhost:8080');
});

let isCooldown = false; // Variable de control para el cooldown

// Conexión a la base de datos
client.connect()
  .then(() => {
    console.log('Conectado a PostgreSQL');
    
    // Escuchar el canal de notificaciones de cambios en la tabla 'registros'
    client.query('LISTEN cambio_en_registros');

    // Manejar las notificaciones
    client.on('notification', (msg) => {
      if (isCooldown) {
        console.log("Cambio detectado, pero en cooldown. Ignorando...");
        return;
      }

      console.log(msg.channel); // 'cambio_en_registros'
      console.log(msg.payload); // 'Hubo un cambio en la tabla registros'

      // Enviar el mensaje de cambio a los clientes WebSocket
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send('Hubo un cambio en la tabla registros');
        }
      });

      // Activar cooldown por 1 minuto (60000 ms)
      isCooldown = true;
      setTimeout(() => {
        isCooldown = false;
        console.log("Cooldown finalizado. Escuchando cambios nuevamente...");
      }, 60000);
    });
  })
  .catch(err => console.error('Error de conexión a PostgreSQL:', err));
