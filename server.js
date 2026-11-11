const { crearApp } = require('./src/app');
const { sembrarDatos } = require('./src/dao/seed');
const { iniciarTareas } = require('./src/tareas');

const PUERTO = Number(process.env.PORT) || 3000;

sembrarDatos();
iniciarTareas();

crearApp().listen(PUERTO, () => {
  console.log(`PetCare disponible en http://localhost:${PUERTO}`);
});
