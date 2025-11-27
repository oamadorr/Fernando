#!/usr/bin/env node

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capturar logs do console
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Restaurando') || text.includes('Erro') || text.includes('progressData') ||
        text.includes('📊') || text.includes('🔧') || text.includes('🔄') || text.includes('updateAllDisplays')) {
      console.log(`[CONSOLE] ${text}`);
    }
  });

  // Capturar erros
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  try {
    console.log('🌐 Abrindo aplicação...');
    await page.goto('https://linhasdevida.vercel.app');
    await page.waitForTimeout(3000);

    console.log('\n📊 Capturando progresso ANTES da restauração...');
    const progressBefore = await page.evaluate(() => {
      const progressText = document.querySelector('.dashboard-card h2')?.textContent;
      return progressText;
    });
    console.log('   Progresso atual:', progressBefore);

    console.log('\n🔐 Clicando em "Restaurar do Firebase"...');
    await page.click('button:has-text("Restaurar do Firebase")');
    await page.waitForTimeout(1000);

    console.log('\n🔑 Digitando senha...');
    await page.fill('#passwordInput', 'thommen2025');
    await page.click('button:has-text("Confirmar")');
    await page.waitForTimeout(2000);

    console.log('\n📦 Aguardando modal de histórico...');
    await page.waitForSelector('#versionHistoryModal', { state: 'visible', timeout: 10000 });
    const modalVisible = await page.isVisible('#versionHistoryModal');

    if (!modalVisible) {
      console.log('❌ Modal de histórico não apareceu!');
      const errorToast = await page.textContent('.toast').catch(() => 'N/A');
      console.log('   Mensagem:', errorToast);
      await browser.close();
      return;
    }

    console.log('✅ Modal aberto!');

    // Capturar informações das versões
    const versions = await page.evaluate(() => {
      const versionCards = document.querySelectorAll('#versionHistoryList > div');
      return Array.from(versionCards).map((card, index) => {
        const text = card.textContent;
        return {
          index,
          text: text.substring(0, 200)
        };
      });
    });

    console.log(`\n📋 ${versions.length} versão(ões) encontrada(s):`);
    versions.forEach(v => {
      console.log(`   ${v.index + 1}. ${v.text}`);
    });

    console.log('\n🔄 Clicando para restaurar a versão mais recente...');
    await page.click('#versionHistoryList > div:first-child button:has-text("Restaurar")');
    await page.waitForTimeout(1000);

    // Confirmar restauração
    page.once('dialog', async dialog => {
      console.log('   Confirmando restauração:', dialog.message());
      await dialog.accept();
    });

    await page.waitForTimeout(3000);

    console.log('\n📊 Capturando progresso DEPOIS da restauração...');
    const progressAfter = await page.evaluate(() => {
      const progressText = document.querySelector('.dashboard-card h2')?.textContent;
      return progressText;
    });
    console.log('   Progresso após restauração:', progressAfter);

    // Comparar dados detalhados
    console.log('\n🔍 Comparando dados detalhados...');
    const detailedComparison = await page.evaluate(() => {
      // Capturar dados do localStorage
      const progressData = JSON.parse(localStorage.getItem('linhasVidaProgress') || '{}');
      const lineSteps = JSON.parse(localStorage.getItem('linhasVidaLineSteps') || '{}');
      const executionDates = JSON.parse(localStorage.getItem('linhasVidaExecutionDates') || '{}');
      const observations = JSON.parse(localStorage.getItem('linhasVidaObservations') || '{}');
      const builtInfo = JSON.parse(localStorage.getItem('linhasVidaBuiltInformations') || '{}');

      // Contar dados
      let totalBases = 0;
      let totalSteps = 0;

      for (const usina in progressData) {
        for (const linha in progressData[usina]) {
          for (const tipo in progressData[usina][linha]) {
            totalBases += progressData[usina][linha][tipo];
          }
        }
      }

      for (const usina in lineSteps) {
        for (const linha in lineSteps[usina]) {
          const steps = lineSteps[usina][linha];
          if (steps.passagemCabo) totalSteps++;
          if (steps.crimpagemCabo) totalSteps++;
          if (steps.afericaoCrimpagem) totalSteps++;
          if (steps.tensionamentoCabo) totalSteps++;
        }
      }

      return {
        totalBases,
        totalSteps,
        hasExecutionDates: Object.keys(executionDates).length > 0,
        hasObservations: Object.keys(observations).length > 0,
        hasBuiltInfo: Object.keys(builtInfo).length > 0
      };
    });

    console.log('\n📋 Dados restaurados:');
    console.log('   Bases completadas:', detailedComparison.totalBases);
    console.log('   Etapas completadas:', detailedComparison.totalSteps);
    console.log('   Tem executionDates:', detailedComparison.hasExecutionDates);
    console.log('   Tem observations:', detailedComparison.hasObservations);
    console.log('   Tem builtInfo:', detailedComparison.hasBuiltInfo);

    console.log('\n✅ Teste concluído! Deixando navegador aberto para inspeção...');
    console.log('   Pressione Ctrl+C para fechar.');

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    await browser.close();
  }
})();
