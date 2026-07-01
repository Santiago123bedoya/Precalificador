// scripts/setup-appwrite.js - VERSIÓN CORREGIDA (sin default en required)
const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

async function setupAppwrite() {
  try {
    console.log('📁 Creando colecciones...');

    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

    // Función auxiliar
    async function createCol(name, attrs) {
      try {
        console.log(`📝 ${name}...`);
        await databases.createCollection(dbId, name, name, undefined, undefined, false);
        for (const attr of attrs) {
          const { key, type, size, required, default: def } = attr;
          try {
            if (type === 'string') {
              await databases.createStringAttribute(dbId, name, key, size || 255, required);
            } else if (type === 'number') {
              await databases.createFloatAttribute(dbId, name, key, required);
            } else if (type === 'integer') {
              await databases.createIntegerAttribute(dbId, name, key, required);
            } else if (type === 'boolean') {
              await databases.createBooleanAttribute(dbId, name, key, required);
            } else if (type === 'datetime') {
              await databases.createDatetimeAttribute(dbId, name, key, required);
            } else if (type === 'object') {
              await databases.createObjectAttribute(dbId, name, key, required);
            }
          } catch (e) {
            if (!e.message.includes('already exists')) {
              console.log(`   ⚠️ Atributo ${key}: ${e.message}`);
            }
          }
        }
        console.log(`   ✅ ${name} creada`);
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log(`   ⚠️ ${name} ya existe`);
        } else {
          console.log(`   ❌ ${name}: ${e.message}`);
        }
      }
    }

    // 1. asociados (SIN default en required)
    await createCol('asociados', [
      { key: 'authId', type: 'string', size: 255, required: true },
      { key: 'nombre', type: 'string', size: 255, required: true },
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'telefono', type: 'string', size: 20, required: false },
      { key: 'fechaRegistro', type: 'datetime', required: true },
      { key: 'rol', type: 'string', size: 20, required: true },
      { key: 'ingresosVerificados', type: 'boolean', required: true },
      { key: 'consistenciaIngresos', type: 'number', required: true },
      { key: 'responsabilidadPagos', type: 'number', required: true },
      { key: 'compromisoCooperativo', type: 'number', required: true },
      { key: 'perfilEndeudamiento', type: 'number', required: true },
      { key: 'capacidadAhorro', type: 'number', required: true }
    ]);

    // 2. solicitudes_credito (SIN default en required)
    await createCol('solicitudes_credito', [
      { key: 'asociadoId', type: 'string', size: 255, required: true },
      { key: 'montoSolicitado', type: 'number', required: true },
      { key: 'plazoMeses', type: 'integer', required: true },
      { key: 'destino', type: 'string', size: 255, required: false },
      { key: 'estado', type: 'string', size: 50, required: true },
      { key: 'fechaSolicitud', type: 'datetime', required: true },
      { key: 'metadata', type: 'object', required: false }
    ]);

    // 3. evaluaciones
    await createCol('evaluaciones', [
      { key: 'solicitudId', type: 'string', size: 255, required: true },
      { key: 'asociadoId', type: 'string', size: 255, required: true },
      { key: 'fechaEvaluacion', type: 'datetime', required: true },
      { key: 'puntajeRiesgo', type: 'number', required: true },
      { key: 'consistenciaIngresos', type: 'number', required: true },
      { key: 'responsabilidadPagos', type: 'number', required: true },
      { key: 'compromisoCooperativo', type: 'number', required: true },
      { key: 'perfilEndeudamiento', type: 'number', required: true },
      { key: 'capacidadAhorro', type: 'number', required: true },
      { key: 'decision', type: 'string', size: 50, required: true },
      { key: 'explicacionResumen', type: 'string', size: 500, required: false },
      { key: 'montoRecomendado', type: 'number', required: false }
    ]);

    // 4. ingresos_digitales
    await createCol('ingresos_digitales', [
      { key: 'asociadoId', type: 'string', size: 255, required: true },
      { key: 'plataforma', type: 'string', size: 50, required: true },
      { key: 'accountId', type: 'string', size: 255, required: true },
      { key: 'promedioMensual', type: 'number', required: true },
      { key: 'mesesActivo', type: 'integer', required: true },
      { key: 'fechaActualizacion', type: 'datetime', required: true }
    ]);

    // 5. consentimientos
    await createCol('consentimientos', [
      { key: 'asociadoId', type: 'string', size: 255, required: true },
      { key: 'fecha', type: 'datetime', required: true },
      { key: 'vigente', type: 'boolean', required: true },
      { key: 'datosPermitidos', type: 'object', required: true }
    ]);

    console.log('\n✅ ¡Colecciones procesadas!');
    console.log('📊 Colecciones:');
    console.log('   - asociados');
    console.log('   - solicitudes_credito');
    console.log('   - evaluaciones');
    console.log('   - ingresos_digitales');
    console.log('   - consentimientos');
    console.log('\n⚠️ Nota: Los atributos con default se eliminaron.');
    console.log('   Puedes agregarlos manualmente desde la consola de Appwrite si los necesitas.');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

setupAppwrite();