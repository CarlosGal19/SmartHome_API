import express from 'express';
import cors from 'cors';
import mqtt from 'mqtt';
import { config } from 'dotenv';
config();

const mqttClient = mqtt.connect(process.env.MQTT_SERVER || 'mqtt://localhost:1883');

mqttClient.on('connect', () => {
    console.log('Connected to MQTT server');

    Object.values(topicGetters).forEach(topic => mqttClient.subscribe(topic));
});

mqttClient.on('error', (err) => {
    console.log('Failed to connect to MQTT server', err);
});

const topicSetters = {
    'living_room': 'smarthome/living_room/set',
    'room_1': 'smarthome/room_1/set',
    'room_2': 'smarthome/room_2/set',
    'bathroom': 'smarthome/bathroom/set',
    'patio': 'smarthome/patio/set',
    'door_1': 'smarthome/door_1/set',
    'door_2': 'smarthome/door_2/set',
    'window_1': 'smarthome/window_1/set',
    'window_2': 'smarthome/window_2/set',
    'buzzer': 'smarthome/buzzer/set',
};

const topicGetters = {
    'living_room': 'smarthome/living_room/status',
    'room_1': 'smarthome/room_1/status',
    'room_2': 'smarthome/room_2/status',
    'bathroom': 'smarthome/bathroom/status',
    'patio': 'smarthome/patio/status',
    'door_1': 'smarthome/door_1/status',
    'door_2': 'smarthome/door_2/status',
    'window_1': 'smarthome/window_1/status',
    'window_2': 'smarthome/window_2/status',
    'buzzer': 'smarthome/buzzer/status'
};

const statusCache = {
    living_room: "0",
    room_1: "0",
    room_2: "0",
    bathroom: "0",
    patio: "0",
    door_1: "0",
    window_1: "0",
    window_2: "0",
    buzzer: "0",
};

const app = express();
app.use(cors());
app.use(express.json());

app.post("/alexa", async (req, res) => {

    const intent = req.body?.request?.intent;
    const intentName = intent?.name;

    const roomAlias = intent?.slots?.room?.value || '' ;
    const sensorAlias = intent?.slots?.sensor?.value || '' ;

    const room = intent?.slots?.room?.resolutions?.resolutionsPerAuthority?.[0]?.values?.[0]?.value?.name || '';
    const sensor = intent?.slots?.sensor?.resolutions?.resolutionsPerAuthority?.[0]?.values?.[0]?.value?.name || '';

    const alias = roomAlias || sensorAlias;

    if (!intentName || (!room && !sensor) || (!topicSetters[room] && !topicSetters[sensor])) {
        return res.json({
            version: "1.0",
            sessionAttributes: {},
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "No entendí qué quieres controlar."
                },
                shouldEndSession: true
            }
        });
    }

    let newState = "0";

    if (intentName === "TurnOnLights" || intentName === "EnableSensor") {
        newState = "1";
    }

    if (intentName === "TurnOffLights" || intentName === "DisableSensor") {
        newState = "0";
    }

    mqttClient.publish(topicSetters[room], newState);
    statusCache[room] = newState;

    return res.json({
        version: "1.0",
        sessionAttributes: {},
        response: {
            outputSpeech: {
                type: "PlainText",
                text: `He ${newState === "1" ? `${roomAlias ? "encendido" : "cerrado"}` : `${roomAlias ? "apagado" : "abierto"}`} ${alias}.`
            },
            shouldEndSession: true
        }
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});
