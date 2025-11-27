#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./.firebase/serviceAccountKey.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fernando-bce22-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

function calculateProgressFromData(progressData, lineStepsStatus) {
  // Contar bases completadas
  let completedBases = 0;
  for (const usina in progressData) {
    for (const linha in progressData[usina]) {
      for (const tipo in progressData[usina][linha]) {
        completedBases += progressData[usina][linha][tipo];
      }
    }
  }

  // Contar etapas do cabo completadas
  let completedSteps = 0;
  let lineCount = 0;
  for (const usina in lineStepsStatus) {
    for (const linha in lineStepsStatus[usina]) {
      lineCount++;
      const steps = lineStepsStatus[usina][linha];
      if (steps.passagemCabo) completedSteps++;
      if (steps.crimpagemCabo) completedSteps++;
      if (steps.afericaoCrimpagem) completedSteps++;
      if (steps.tensionamentoCabo) completedSteps++;
    }
  }

  const totalBases = 441; // Total conhecido
  const totalSteps = 368; // 92 linhas x 4 etapas
  const totalItems = totalBases + totalSteps;
  const completedItems = completedBases + completedSteps;
  const progress = totalItems > 0 ? (completedItems / totalItems * 100) : 0;

  // Progresso considerando apenas bases
  const progressBasesOnly = totalBases > 0 ? (completedBases / totalBases * 100) : 0;

  return {
    completedBases,
    completedSteps,
    lineCount,
    totalBases,
    totalSteps,
    totalItems,
    completedItems,
    progress: progress.toFixed(1) + '%',
    progressBasesOnly: progressBasesOnly.toFixed(1) + '%'
  };
}

async function checkVersionProgress() {
  try {
    const projectId = 'thommen-belo-monte-2025';
    console.log('📊 Analisando progresso de todas as versões...\n');
    console.log('═'.repeat(80));

    const historyRef = db.collection('projects').doc(projectId).collection('history');
    const snapshot = await historyRef.orderBy('savedAt', 'desc').limit(10).get();

    if (snapshot.empty) {
      console.log('❌ Nenhuma versão encontrada');
      process.exit(1);
    }

    console.log(`\n✅ ${snapshot.size} versão(ões) encontrada(s):\n`);

    snapshot.forEach((doc, index) => {
      const data = doc.data();
      const savedAt = data.savedAt ? data.savedAt.toDate().toLocaleString('pt-BR') : 'N/A';

      const stats = calculateProgressFromData(data.progressData || {}, data.lineStepsStatus || {});

      console.log(`📦 Versão ${index + 1}:`);
      console.log(`   Data: ${savedAt}`);
      console.log(`   Bases completadas: ${stats.completedBases}/${stats.totalBases}`);
      console.log(`   Etapas completadas: ${stats.completedSteps}/${stats.totalSteps} (${stats.lineCount} linhas)`);
      console.log(`   ───────────────────────────────────────`);
      console.log(`   Progresso total: ${stats.progress}`);
      console.log(`   Progresso (só bases): ${stats.progressBasesOnly}`);
      console.log('');
    });

    console.log('═'.repeat(80));
    console.log('\n💡 Explicação:\n');
    console.log('   - "Progresso total" = (bases + etapas) / (total bases + total etapas)');
    console.log('   - "Progresso (só bases)" = bases completadas / total de bases');
    console.log('   - O sistema usa "Progresso total" no cálculo atual\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkVersionProgress();
