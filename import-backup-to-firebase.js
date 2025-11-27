#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('./.firebase/serviceAccountKey.json');

function loadJsonFile(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  } catch (err) {
    console.warn(`⚠️  Não foi possível ler ${filepath}: ${err.message}`);
  }
  return null;
}

function findDetailedFallback() {
  const explicit = process.argv[3];
  if (explicit) {
    const explicitPath = path.resolve(explicit);
    const data = loadJsonFile(explicitPath);
    if (data) {
      console.log(`🔄 Usando backup auxiliar detalhado informado: ${explicitPath}`);
      return { data, source: explicitPath };
    }
    console.warn(`⚠️  Backup auxiliar informado não pôde ser lido: ${explicitPath}`);
  }

  const candidates = [
    path.join(__dirname, 'backup-completo-2025-11-27.json'),
    path.join(__dirname, 'localstorage-backup-2025-11-27.json')
  ];

  for (const candidate of candidates) {
    const data = loadJsonFile(candidate);
    if (data) {
      console.log(`🔄 Complementando campos detalhados com: ${path.basename(candidate)}`);
      return { data, source: candidate };
    }
  }

  return null;
}

function normalizeUsinaBuckets(raw) {
  const base = raw ? JSON.parse(JSON.stringify(raw)) : {};
  ['pimental', 'belo-monte', 'oficina'].forEach(usina => {
    if (!base[usina]) {
      base[usina] = {};
    }
  });
  return base;
}

function normalizeLineSteps(rawLineSteps, progressData = {}) {
  const base = normalizeUsinaBuckets(rawLineSteps);

  for (const usina of Object.keys(progressData)) {
    if (!base[usina]) base[usina] = {};
    for (const linha of Object.keys(progressData[usina] || {})) {
      const current = base[usina][linha] || {};
      base[usina][linha] = {
        passagemCabo: !!current.passagemCabo,
        crimpagemCabo: !!current.crimpagemCabo,
        afericaoCrimpagem: !!current.afericaoCrimpagem,
        tensionamentoCabo: !!current.tensionamentoCabo,
        lacreTensionador: current.lacreTensionador || "",
        lacreLoopAbs: current.lacreLoopAbs || ""
      };
    }
  }

  return base;
}

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fernando-bce22-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function importBackup() {
  try {
    // Permite informar o arquivo pelo CLI. Ex:
    //   node import-backup-to-firebase.js backup-completo-2025-11-27.json
    const backupArg = process.argv[2];
    const fallbackFile = 'backup-linhas-vida-2025-11-24.json';
    const backupPath = backupArg
      ? path.resolve(backupArg)
      : path.join(__dirname, fallbackFile);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Arquivo de backup não encontrado: ${backupPath}`);
    }

    console.log('📥 Carregando backup...');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    console.log('✅ Backup carregado:');
    console.log(`   Data: ${new Date(backupData.timestamp).toLocaleString('pt-BR')}`);
    if (backupData.metadata) {
      console.log(`   Bases completadas: ${backupData.metadata.completedBases}/${backupData.metadata.totalBases}`);
      console.log(`   Progresso: ${backupData.metadata.progressPercentage.toFixed(1)}%`);
    }
    console.log(`   Versão do backup: ${backupData.version || '1.0 (legado)'}`);

    const projectId = 'thommen-belo-monte-2025';
    const mainDocRef = db.collection('projects').doc(projectId);
    const currentDoc = await mainDocRef.get();
    const currentData = currentDoc.exists ? currentDoc.data() : {};

    const hasDetailedData = Boolean(backupData.lineStepsStatus || backupData.executionDates || backupData.lineObservations || backupData.builtInformations);
    const detailedFallback = hasDetailedData ? null : findDetailedFallback();
    if (!hasDetailedData) {
      console.log('⚠️  Este backup não contém campos detalhados (lineStepsStatus, executionDates, observações, builtInformations).');
      console.log('    Vou preservar o que já existe no Firebase (se houver) ou complementar com backup auxiliar/localStorage.');
    }

    // Preparar dados para salvar (mantendo o que já existe quando o backup não contém o campo)
    const progressData = backupData.progressData || currentData.progressData || {};
    const lineStepsStatus = normalizeLineSteps(
      backupData.lineStepsStatus || detailedFallback?.data?.lineStepsStatus || currentData.lineStepsStatus,
      progressData
    );

    const executionDates = normalizeUsinaBuckets(
      backupData.executionDates || detailedFallback?.data?.executionDates || currentData.executionDates
    );
    const lineObservations = normalizeUsinaBuckets(
      backupData.lineObservations || detailedFallback?.data?.lineObservations || currentData.lineObservations
    );
    const builtInformations = normalizeUsinaBuckets(
      backupData.builtInformations || detailedFallback?.data?.builtInformations || currentData.builtInformations
    );

    const dataToSave = {
      progressData,
      teamConfig: {
        pessoas: backupData.teamConfig?.pessoas ?? currentData.teamConfig?.pessoas,
        horasPorDia: backupData.teamConfig?.horasPorDia ?? currentData.teamConfig?.horasPorDia,
        aproveitamento: backupData.teamConfig?.aproveitamento ?? currentData.teamConfig?.aproveitamento,
        inicioTrabalhoBruto: backupData.teamConfig?.inicioTrabalhoBruto ?? currentData.teamConfig?.inicioTrabalhoBruto,
        dataAtual: new Date().toISOString()
      },
      manualActiveUsina: backupData.manualActiveUsina ?? currentData.manualActiveUsina ?? null,
      lineStepsStatus,
      executionDates,
      lineObservations,
      builtInformations,
      version: '2.0',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log('\n💾 Salvando no Firebase...');
    await mainDocRef.set(dataToSave, { merge: true });
    console.log('✅ Dados salvos no documento principal');

    console.log('\n📸 Criando snapshot no histórico...');
    const historyRef = mainDocRef.collection('history');
    await historyRef.add({
      progressData: dataToSave.progressData,
      lineStepsStatus: dataToSave.lineStepsStatus,
      executionDates: dataToSave.executionDates,
      teamConfig: dataToSave.teamConfig,
      lineObservations: dataToSave.lineObservations,
      builtInformations: dataToSave.builtInformations,
      savedAt: admin.firestore.FieldValue.serverTimestamp(),
      version: '2.0',
      manual: true,
      note: `Backup importado de ${new Date(backupData.timestamp).toLocaleDateString('pt-BR')}`
    });
    console.log('✅ Snapshot criado no histórico');

    console.log('\n' + '═'.repeat(80));
    console.log('\n🎉 Backup importado com sucesso!\n');
    const completedBases = backupData.metadata?.completedBases ?? 'N/D';
    const progressPct = backupData.metadata?.progressPercentage?.toFixed?.(1) ?? 'N/D';
    const teamPeople = backupData.teamConfig?.pessoas ?? 'N/D';
    const teamHours = backupData.teamConfig?.horasPorDia ?? 'N/D';
    console.log('📊 Dados importados:');
    console.log(`   • ${completedBases} bases completadas`);
    console.log(`   • ${progressPct}% de progresso`);
    console.log(`   • Configuração de equipe: ${teamPeople} pessoas, ${teamHours}h/dia`);
    console.log('\n💡 Agora você pode acessar https://linhasdevida.vercel.app');
    console.log('   e os dados do backup estarão disponíveis!\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  }
}

importBackup();
