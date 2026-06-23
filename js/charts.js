let chartInstance = null

function getPlayerChartConfig() {
  return {
    ids: CONFIG.players.map((p) => p.id),
    labels: CONFIG.players.map((p) => p.name),
    colors: CONFIG.players.map((p) => p.color),
  }
}

function initChart(cumulativeData, dates) {
  const canvas = document.getElementById('evolutionChart')
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const loader = document.getElementById('chartLoader')
  if (loader) loader.classList.add('hidden')

  if (chartInstance) {
    chartInstance.destroy()
  }

  const { ids, labels, colors } = getPlayerChartConfig()
  const datasets = ids.map((playerId, i) => ({
    label: labels[i],
    data: cumulativeData[playerId] || [],
    borderColor: colors[i],
    backgroundColor: colors[i] + '18',
    fill: true,
    tension: 0.35,
    pointRadius: 4,
    pointHoverRadius: 7,
    pointBackgroundColor: colors[i],
    pointBorderColor: 'rgba(7, 26, 7, 0.8)',
    pointBorderWidth: 2,
    borderWidth: 3,
    spanGaps: true,
  }))

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: 'rgba(255,255,255,0.7)',
            font: { family: 'Inter', size: 12, weight: '600' },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
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
      scales: {
        x: {
          grid: {
            color: 'rgba(255,255,255,0.05)',
            drawBorder: false,
          },
          ticks: {
            color: 'rgba(255,255,255,0.4)',
            font: { family: 'Inter', size: 10 },
            maxRotation: 45,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255,255,255,0.05)',
            drawBorder: false,
          },
          ticks: {
            color: 'rgba(255,255,255,0.4)',
            font: { family: 'Inter', size: 10 },
            stepSize: 1,
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
    },
  })
}
