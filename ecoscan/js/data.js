'use strict';

const MATERIALS = {
  plastic: {
    id: 'plastic',
    name: 'Plástico',
    subtypes: ['PET', 'HDPE', 'PP', 'PS'],
    icon: '♻️',
    color: '#1565C0',
    bgColor: '#E3F2FD',
    bin: {
      name: 'Contenedor Azul',
      icon: '🔵',
      description: 'Plásticos y envases'
    },
    steps: [
      'Vacía y enjuaga el envase con agua',
      'Retira tapas y etiquetas si es posible',
      'Aplasta el envase para reducir volumen',
      'Deposita en el contenedor azul'
    ],
    impact: 'Reciclar una botella PET ahorra el 60% de la energía necesaria para fabricar una nueva. Cada tonelada de plástico reciclado evita la emisión de 1.5 toneladas de CO₂.',
    keywords: ['botella', 'envase', 'plástico', 'bolsa', 'pet', 'polietileno', 'taper', 'recipiente']
  },
  glass: {
    id: 'glass',
    name: 'Vidrio',
    subtypes: ['Botellas', 'Frascos', 'Tarros'],
    icon: '🫙',
    color: '#2E7D32',
    bgColor: '#E8F5E9',
    bin: {
      name: 'Contenedor Verde',
      icon: '🟢',
      description: 'Envases de vidrio'
    },
    steps: [
      'Enjuaga el envase con agua',
      'Retira tapas (van al contenedor azul)',
      'No rompas el vidrio antes de depositarlo',
      'Deposita en el contenedor verde'
    ],
    impact: 'El vidrio es 100% reciclable y puede reciclarse infinitas veces sin perder calidad. Reciclar vidrio reduce el consumo de materias primas en un 50%.',
    keywords: ['botella', 'vidrio', 'frasco', 'tarro', 'cristal', 'vaso', 'copa', 'jarra']
  },
  paper: {
    id: 'paper',
    name: 'Papel',
    subtypes: ['Periódico', 'Cuadernos', 'Folletos', 'Revistas'],
    icon: '📄',
    color: '#827717',
    bgColor: '#F9FBE7',
    bin: {
      name: 'Contenedor Gris',
      icon: '⚫',
      description: 'Papel y periódico'
    },
    steps: [
      'Verifica que el papel esté limpio y seco',
      'Retira grapas y clips metálicos',
      'Dobla o apila para ahorrar espacio',
      'Deposita en el contenedor gris'
    ],
    impact: 'Reciclar 1 tonelada de papel salva hasta 17 árboles y ahorra 26.000 litros de agua. El papel puede reciclarse entre 5 y 7 veces.',
    keywords: ['papel', 'periódico', 'revista', 'cuaderno', 'hoja', 'folleto', 'libro', 'cartilla']
  },
  cardboard: {
    id: 'cardboard',
    name: 'Cartón',
    subtypes: ['Cajas', 'Embalajes', 'Tubos'],
    icon: '📦',
    color: '#4E342E',
    bgColor: '#EFEBE9',
    bin: {
      name: 'Contenedor Gris',
      icon: '⚫',
      description: 'Cartón y embalajes'
    },
    steps: [
      'Desmonta las cajas para aplanarlas',
      'Retira plásticos, cinta adhesiva y espumas',
      'Asegúrate de que esté limpio y seco',
      'Deposita en el contenedor gris'
    ],
    impact: 'El cartón es uno de los materiales más reciclados en el mundo. Reciclar cartón reduce el uso de agua en un 45% en comparación con producir cartón nuevo.',
    keywords: ['cartón', 'caja', 'embalaje', 'paquete', 'tubo', 'rollo', 'empaque', 'envío']
  },
  metal: {
    id: 'metal',
    name: 'Metal',
    subtypes: ['Aluminio', 'Acero', 'Latas'],
    icon: '🥫',
    color: '#546E7A',
    bgColor: '#ECEFF1',
    bin: {
      name: 'Contenedor Azul',
      icon: '🔵',
      description: 'Latas y metales'
    },
    steps: [
      'Enjuaga la lata o envase metálico',
      'Aplasta la lata para reducir espacio',
      'No mezcles con vidrio roto',
      'Deposita en el contenedor azul'
    ],
    impact: 'Reciclar aluminio consume solo el 5% de la energía necesaria para producir aluminio nuevo. Una lata reciclada puede estar de vuelta en el mercado en solo 60 días.',
    keywords: ['lata', 'aluminio', 'metal', 'acero', 'chapa', 'hierro', 'tarro', 'aerosol']
  },
  organic: {
    id: 'organic',
    name: 'Orgánico',
    subtypes: ['Restos de comida', 'Cáscaras', 'Jardín'],
    icon: '🍂',
    color: '#558B2F',
    bgColor: '#F1F8E9',
    bin: {
      name: 'Contenedor Marrón',
      icon: '🟤',
      description: 'Residuos orgánicos'
    },
    steps: [
      'Separa los restos orgánicos de otros residuos',
      'Evita depositar aceites o líquidos en exceso',
      'Puedes crear compost en casa con estos residuos',
      'Deposita en el contenedor marrón o compostero'
    ],
    impact: 'Los residuos orgánicos representan el 45% de los residuos domésticos. El compostaje puede reducir tu huella de carbono hasta en un 30% y enriquecer el suelo de tu jardín.',
    keywords: ['fruta', 'vegetal', 'comida', 'cáscara', 'restos', 'orgánico', 'piel', 'hueso', 'hierba', 'hoja']
  },
  electronic: {
    id: 'electronic',
    name: 'Electrónico',
    subtypes: ['Celulares', 'Cables', 'Baterías', 'Computadores'],
    icon: '📱',
    color: '#E65100',
    bgColor: '#FFF3E0',
    bin: {
      name: 'Punto Limpio',
      icon: '🔴',
      description: 'Residuos RAEE'
    },
    steps: [
      'Nunca tires los electrónicos en la basura normal',
      'Busca un punto limpio o tienda autorizada en tu ciudad',
      'Borra tus datos personales antes de entregar',
      'Llévalo al punto de recolección RAEE más cercano'
    ],
    impact: 'Los residuos electrónicos son el tipo de basura que más rápido crece. Contienen metales preciosos recuperables: 1 tonelada de celulares viejos tiene más oro que 17 toneladas de mineral aurífero.',
    keywords: ['celular', 'teléfono', 'computador', 'cable', 'batería', 'cargador', 'tablet', 'audífonos', 'electrónico']
  },
  hazardous: {
    id: 'hazardous',
    name: 'Peligroso',
    subtypes: ['Pilas', 'Medicamentos', 'Pinturas', 'Aceites'],
    icon: '⚠️',
    color: '#880E4F',
    bgColor: '#FCE4EC',
    bin: {
      name: 'Contenedor Especial',
      icon: '🔴',
      description: 'Residuos peligrosos'
    },
    steps: [
      'NUNCA mezcles con otros residuos',
      'Guarda en un envase cerrado y seguro',
      'Busca un punto de recolección especializado',
      'Nunca deseches por el desagüe o inodoro'
    ],
    impact: 'Un solo litro de aceite usado contamina hasta un millón de litros de agua. Las pilas contienen metales pesados que pueden contaminar el suelo durante cientos de años.',
    keywords: ['pila', 'batería', 'medicamento', 'pintura', 'aceite', 'químico', 'veneno', 'tóxico', 'peligroso']
  }
};

const DEMO_SCENARIOS = [
  { material: 'plastic', confidence: 94, label: 'Botella PET detectada' },
  { material: 'glass',   confidence: 89, label: 'Frasco de vidrio detectado' },
  { material: 'paper',   confidence: 91, label: 'Papel reciclable detectado' },
  { material: 'cardboard', confidence: 87, label: 'Caja de cartón detectada' },
  { material: 'metal',   confidence: 93, label: 'Lata de aluminio detectada' },
  { material: 'organic', confidence: 78, label: 'Residuo orgánico detectado' },
  { material: 'electronic', confidence: 96, label: 'Dispositivo electrónico detectado' },
  { material: 'hazardous',  confidence: 82, label: 'Material peligroso detectado' },
];

function getMaterialById(id) {
  return MATERIALS[id] || null;
}

function getAllMaterials() {
  return Object.values(MATERIALS);
}

function getRandomScenario() {
  return DEMO_SCENARIOS[Math.floor(Math.random() * DEMO_SCENARIOS.length)];
}

function searchMaterialByKeyword(text) {
  const lower = text.toLowerCase();
  for (const mat of Object.values(MATERIALS)) {
    if (mat.keywords.some(k => lower.includes(k))) return mat;
  }
  return null;
}
