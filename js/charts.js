// Referencia global a la instancia actual del gráfico Chart.js
// Se utiliza para destruir el gráfico anterior antes de crear uno nuevo
let chartInstance = null

// Extrae IDs, nombres y colores de los jugadores definidos en CONFIG
// Devuelve un objeto con arrays paralelos para facilitar el mapeo en datasets
function getPlayerChartConfig() {
  return {
    ids: CONFIG.players.map((p) => p.id),
    labels: CONFIG.players.map((p) => p.name),
    colors: CONFIG.players.map((p) => p.color),
  }
}

// Inicializa o re-inicializa el gráfico de evolución de puntos
// cumulativeData: objeto { playerId: [puntajesAcumulados] }
// dates: array de strings con las fechas de cada jornada
function initChart(cumulativeData, dates) {
  // Obtiene el elemento canvas del DOM
  const canvas = document.getElementById('evolutionChart')
  if (!canvas) return

  const ctx = canvas.getContext('2d')

  // Oculta el loader una vez que el canvas está disponible
  const loader = document.getElementById('chartLoader')
  if (loader) loader.classList.add('hidden')

  // Destruye la instancia previa si existe para evitar duplicados
  if (chartInstance) {
    chartInstance.destroy()
  }

  // Construye un dataset por cada jugador con su color y datos acumulados
  const { ids, labels, colors } = getPlayerChartConfig()
  const datasets = ids.map((playerId, i) => ({
    label: labels[i],
    data: cumulativeData[playerId] || [],
    borderColor: colors[i],
    backgroundColor: colors[i] + '18', // color con baja opacidad para el área bajo la curva
    fill: true,
    tension: 0.35,         // suavizado de la línea (0 = rectas, 1 = curvas máximas)
    pointRadius: 4,
    pointHoverRadius: 7,
    pointBackgroundColor: colors[i],
    pointBorderColor: 'rgba(7, 26, 7, 0.8)',
    pointBorderWidth: 2,
    borderWidth: 3,
    spanGaps: true,        // conecta puntos aunque haya datos faltantes
  }))

  // Crea la instancia de Chart.js con tipo línea
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      // Animación de entrada con easing suave
      animation: {
        duration: 1200,
        easing: 'easeOutQuart',
      },

      plugins: {
        // Leyenda superior con estilo personalizado
        legend: {
          position: 'top',
          labels: {
            color: 'rgba(255,255,255,0.7)',
            font: { family: 'Inter', size: 12, weight: '600' },
            padding: 16,
            usePointStyle: true,    // muestra círculos en lugar de cuadrados
            pointStyle: 'circle',
          },
        },
        // Tooltip al pasar el mouse sobre los puntos
        tooltip: {
          backgroundColor: 'rgba(7, 26, 7, 0.9)',
          titleFont: { family: 'Inter', size: 12 },
          bodyFont: { family: 'Inter', size: 13, weight: '600' },
          padding: 12,
          cornerRadius: 8,
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
        },
      },

      // Configuración de ejes
      scales: {
        // Eje X: fechas de jornadas
        x: {
          grid: {
            color: 'rgba(255,255,255,0.05)',
            drawBorder: false,
          },
          ticks: {
            color: 'rgba(255,255,255,0.4)',
            font: { family: 'Inter', size: 10 },
            maxRotation: 45,  // rotación máxima de las etiquetas para legibilidad
          },
        },
        // Eje Y: puntos acumulados (enteros, desde 0)
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255,255,255,0.05)',
            drawBorder: false,
          },
          ticks: {
            color: 'rgba(255,255,255,0.4)',
            font: { family: 'Inter', size: 10 },
            stepSize: 1,  // muestra solo valores enteros
          },
        },
      },

      // Modo de interacción: resalta todos los datasets en el mismo índice
      interaction: {
        intersect: false,  // no requiere click exacto sobre un punto
        mode: 'index',     // agrupa por posición en el eje X
      },
    },
  })
}
