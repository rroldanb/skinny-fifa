const CONFIG = {
  players: [
    {
      id: 'gonza',
      name: 'Gonza',
      emoji: '🦁',
      color: '#87e237',
      colorRgb: '135, 226, 55',
      image: '',
      aporte: 'Prote 🥩',
    },
    {
      id: 'jc',
      name: 'JC',
      emoji: '🐺',
      color: '#FFD700',
      colorRgb: '255, 215, 0',
      image: '',
      aporte: 'Promo 🍹',
    },
    {
      id: 'jorge',
      name: 'Jorge',
      emoji: '🦅',
      color: '#00BFFF',
      colorRgb: '0, 191, 255',
      image: '',
      aporte: 'Pilsen 🍺',
    },
  ],

  points: {
    first: 3,
    second: 2,
    third: 1,
    goalBonus: 1,
    goalBonusEnabled: true,
  },

  season: {
    name: 'Temporada 1',
    start: '14-abr',
    end: '30-jun',
  },

  aporteRotation: ['Prote 🥩', 'Pilsen 🍺', 'Promo 🍹'],

  // ───── Google Sheets ─────
  // 1. Abrí tu sheet en https://sheets.google.com
  // 2. Archivo → Compartir → Publicar en web
  // 3. Publicá cada pestaña como .csv
  // 4. Pegá las URLs abajo y cambiá enabled a true
  sheet: {
    enabled: true,
    urls: {
      fechas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhHvBhRim-QaZ6zc8BMxoyS_f-j6p2giawZZDaNhQnL1fR7h0DDn2gbVUj22GPAkN2hw6UOJRdAkTg/pub?gid=1475399375&single=true&output=csv',
      aportes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhHvBhRim-QaZ6zc8BMxoyS_f-j6p2giawZZDaNhQnL1fR7h0DDn2gbVUj22GPAkN2hw6UOJRdAkTg/pub?gid=1400983526&single=true&output=csv',
      detalles: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhHvBhRim-QaZ6zc8BMxoyS_f-j6p2giawZZDaNhQnL1fR7h0DDn2gbVUj22GPAkN2hw6UOJRdAkTg/pub?gid=1312213610&single=true&output=csv',
    },
  },
}
