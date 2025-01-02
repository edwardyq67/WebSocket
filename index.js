const sql = require('mssql'); // Importa el paquete mssql
const WebSocket = require('ws'); // Importa el módulo ws

// Configuración de conexión a SQL Server
const config = {
    user: 'sa', // Usuario
    password: '37>MNA&-35+', // Contraseña
    server: '116.203.140.154', // Dirección del servidor SQL
    database: 'DB_Yego', // Nombre de la base de datos
    options: {
        encrypt: true, // Si tu conexión utiliza encriptación
        trustServerCertificate: true, // Evita verificar el certificado
    }
};

// Inicia el servidor WebSocket
const wss = new WebSocket.Server({ port: 8080 }, () => {
    console.log('Servidor WebSocket corriendo en ws://localhost:8080');
});

// Escucha las conexiones entrantes
wss.on('connection', (ws) => {
    console.log('Cliente conectado');
    ws.on('close', () => {
        console.log('Cliente desconectado');
    });
});

// Función para enviar datos a todos los clientes conectados
function broadcastMessage(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message); // Enviar mensaje al cliente
        }
    });
}

// Función para escuchar los mensajes desde la cola
async function listenForMessages() {
    try {
        // Conectar a la base de datos
        const pool = await sql.connect(config);
        console.log('Conexión exitosa a SQL Server');

        while (true) {
            try {
                // Consulta usando WAITFOR sin un TIMEOUT, esperando de manera eficiente
                const result = await pool.request().query(`
                    WAITFOR (
                        RECEIVE TOP(1) conversation_handle, message_body
                        FROM SendwhatsappQueue -- Cola correspondiente
                    ); 
                `);

                if (result.recordset.length > 0) {
                    // Decodificar el mensaje binario a texto
                    const messageBuffer = result.recordset[0].message_body;
                    const messageString = messageBuffer.toString('utf-16le'); // Decodificando como UTF-16 (el formato de texto de SQL Server)

                    console.log('Mensaje recibido:', messageString); // Aquí imprimes el mensaje JSON decodificado

                    // Envía el mensaje a todos los clientes conectados
                    broadcastMessage(messageString);

                } else {
                    console.log('No hay nuevos mensajes en la cola');
                }
            } catch (err) {
                console.log('Reintentando...');
            }
        }
    } catch (err) {
        console.error('Error al conectar a SQL Server:', err);
    }
}

listenForMessages(); // Llamar a la función para escuchar los mensajes
