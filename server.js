const { crearApp } = require('./src/app');
const { sembrarDatos } = require('./src/dao/seed');

const PUERTO = Number(process.env.PORT) || 3000;

sembrarDatos();

crearApp().listen(PUERTO, () => {
  console.log(`PetCare disponible en http://localhost:${PUERTO}`);
});
