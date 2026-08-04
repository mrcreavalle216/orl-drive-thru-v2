// ─── Chart.js Configurations (Dark Theme v2) ──────────────
// Called by app.js after data is computed.

// Global dark-theme defaults
Chart.defaults.color = '#8899aa';
Chart.defaults.borderColor = 'rgba(100,180,255,0.08)';

function buildCharts(agents, subRows, otpRows, totalMonths) {

  // ── Subscription Stacked Line Chart ─────────────────────
  new Chart(document.getElementById("subChart"), {
    type: "line",
    data: {
      labels: subRows.map(r => r.date),
      datasets: agents.map(a => ({
        label: a.name,
        data: subRows.map(r => r.agents[a.name]),
        backgroundColor: a.color + "55",
        borderColor: a.color,
        borderWidth: 1.5,
        fill: true,
        tension: 0.1,
        pointRadius: 0
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 14, usePointStyle: true, font: { size: 10 }, color: '#8899aa' }
        },
        tooltip: {
          mode: "index",
          backgroundColor: 'rgba(15,15,40,0.92)',
          borderColor: 'rgba(100,180,255,0.2)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8899aa',
          callbacks: {
            label: ctx => ctx.parsed.y > 0
              ? `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`
              : null,
            footer: items => "Total: " + fmt(items.reduce((s, i) => s + i.parsed.y, 0))
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 9 }, color: '#667788' } },
        y: {
          stacked: true,
          ticks: { callback: v => fmtK(v), font: { size: 10 }, color: '#667788' },
          grid: { color: 'rgba(100,180,255,0.06)' }
        }
      }
    }
  });

  // ── OTP Stacked Bar Chart ───────────────────────────────
  new Chart(document.getElementById("otpChart"), {
    type: "bar",
    data: {
      labels: otpRows.map(r => r.date),
      datasets: [
        {
          label: "Build Payments",
          data: otpRows.map(r => r.buildPmt),
          backgroundColor: "rgba(138,43,226,0.7)",
          borderRadius: 2,
          order: 1
        },
        {
          label: "Maintenance",
          data: otpRows.map(r => r.maint),
          backgroundColor: "rgba(212,160,23,0.7)",
          borderRadius: 2,
          order: 2
        },
        {
          label: "Est. Token Costs",
          data: otpRows.map(r => r.tokenTotal),
          backgroundColor: "rgba(82,180,255,0.5)",
          borderRadius: 2,
          order: 3
        },
        {
          label: "Est. Infrastructure",
          data: otpRows.map(r => r.infra),
          backgroundColor: "rgba(136,153,170,0.4)",
          borderRadius: 2,
          order: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 14, usePointStyle: true, font: { size: 10 }, color: '#8899aa' }
        },
        tooltip: {
          mode: "index",
          backgroundColor: 'rgba(15,15,40,0.92)',
          borderColor: 'rgba(100,180,255,0.2)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8899aa',
          callbacks: {
            footer: items => "Total: " + fmt(items.reduce((s, i) => s + i.parsed.y, 0))
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 45, font: { size: 9 }, color: '#667788' } },
        y: {
          stacked: true,
          ticks: { callback: v => fmtK(v), font: { size: 10 }, color: '#667788' },
          grid: { color: 'rgba(100,180,255,0.06)' }
        }
      }
    }
  });

  // ── Comparison Cumulative Line Chart ────────────────────
  const totalBuild = agents.reduce((s, a) => s + a.buildCost, 0);

  new Chart(document.getElementById("compareChart"), {
    type: "line",
    data: {
      labels: subRows.map(r => r.date),
      datasets: [
        {
          label: "Subscription (cumulative)",
          data: subRows.map(r => r.cumulative + FOUNDATION_FEE),
          borderColor: "#5cb8ff",
          backgroundColor: "rgba(82,180,255,0.06)",
          fill: true, tension: 0.2, pointRadius: 0, borderWidth: 2.5
        },
        {
          label: "One-time Est. TCO (cumulative)",
          data: otpRows.map(r => r.chartCumulative),
          borderColor: "#f0c14b",
          backgroundColor: "rgba(212,160,23,0.06)",
          fill: true, tension: 0.2, pointRadius: 0, borderWidth: 2.5
        },
        {
          label: "One-time build only (no ongoing)",
          data: subRows.map(() => totalBuild),
          borderColor: "#d4a017",
          borderDash: [6, 4],
          pointRadius: 0, borderWidth: 1.5, fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 14, usePointStyle: true, font: { size: 10 }, color: '#8899aa' }
        },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: 'rgba(15,15,40,0.92)',
          borderColor: 'rgba(100,180,255,0.2)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8899aa',
          callbacks: {
            label: ctx => ctx.dataset.label + ": " + fmt(Math.round(ctx.parsed.y))
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12, font: { size: 9 }, color: '#667788' }
        },
        y: {
          ticks: { callback: v => fmtK(v), font: { size: 10 }, color: '#667788' },
          grid: { color: 'rgba(100,180,255,0.06)' }
        }
      }
    }
  });

  // ── Payback Horizontal Bar Chart ────────────────────────
  new Chart(document.getElementById("paybackChart"), {
    type: "bar",
    data: {
      labels: agents.map(a => a.name),
      datasets: [{
        data: agents.map(a => Math.round(a.buildCost / a.subRate * 10) / 10),
        backgroundColor: agents.map(a => a.color + 'cc'),
        borderRadius: { topRight: 4, bottomRight: 4 },
        barThickness: 28
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,15,40,0.92)',
          borderColor: 'rgba(100,180,255,0.2)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8899aa',
          callbacks: {
            label: ctx => {
              const a = agents[ctx.dataIndex];
              return [
                `Payback: ${ctx.parsed.x} months`,
                `Sub: ${fmt(a.subRate)}/mo`,
                `Build: ${fmt(a.buildCost)}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(100,180,255,0.06)' },
          ticks: { callback: v => v + " mo", font: { size: 10 }, color: '#667788' },
          max: 42
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 12, weight: "bold" }, color: '#e8eaf0' }
        }
      }
    },
    plugins: [{
      id: "line24",
      afterDraw(chart) {
        const x = chart.scales.x.getPixelForValue(24);
        const ctx = chart.ctx;
        ctx.save();
        ctx.strokeStyle = "rgba(136,153,170,0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(x, chart.chartArea.top);
        ctx.lineTo(x, chart.chartArea.bottom);
        ctx.stroke();
        ctx.fillStyle = "#8899aa";
        ctx.font = "10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("24-mo contract", x, chart.chartArea.top - 5);
        ctx.restore();
      }
    }]
  });
}
