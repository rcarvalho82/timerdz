'use strict';
const R_ = (minute, text) => ({ id: `d${minute}-${text.length}`, minute, text });
const DemoSchedule = { name: 'Demonstração: partida de futebol', stages: [
  { name: 'Pré-jogo', startValue: -30, direction: 'up', durationMin: 30, endValue: null, reminders: [
    R_(-30, 'Preparar a transmissão'), R_(-25, 'Publicar mensagem de abertura'), R_(-10, 'Lançar enquete de escalação'), R_(-2, 'Conferir áudio e vídeo')] },
  { name: 'Primeiro tempo', startValue: 0, direction: 'up', durationMin: 45, endValue: null, reminders: [
    R_(0, 'Bola rolando: publicar abertura'), R_(5, 'Primeira atualização de estatísticas'), R_(28, 'Publicar conteúdo de meio de tempo'), R_(40, 'Preparar enquete de intervalo')] },
  { name: 'Intervalo', startValue: 0, direction: 'up', durationMin: 15, endValue: null, reminders: [
    R_(1, 'Lançar enquete do intervalo'), R_(8, 'Publicar resumo do primeiro tempo')] },
  { name: 'Segundo tempo', startValue: 46, direction: 'up', durationMin: null, endValue: 90, reminders: [
    R_(46, 'Segundo tempo começou'), R_(60, 'Atualização de estatísticas'), R_(80, 'Preparar encerramento')] },
  { name: 'Pós-jogo', startValue: 0, direction: 'up', durationMin: null, endValue: null, reminders: [
    R_(0, 'Publicar resultado final'), R_(10, 'Lançar enquete: melhor em campo')] },
] };
if (typeof module !== 'undefined') module.exports = { DemoSchedule }; else window.DemoSchedule = DemoSchedule;
