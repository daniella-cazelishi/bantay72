// ===================== Firebase Imports =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ===================== Firebase Config =====================
const firebaseConfig = {
  apiKey: "AIzaSyBPtb60dthvTPLmaRlL_E7YOsBDIAK-vKw",
  authDomain: "sample-79b30.firebaseapp.com",
  projectId: "sample-79b30",
  storageBucket: "sample-79b30.appspot.com",
  messagingSenderId: "12884863424",
  appId: "1:12884863424:web:277b044f4005f7d80fc025",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// KICK OUT ADMIN
onAuthStateChanged(auth, (user) => {
  if (user && user.email === "bantayteam72.admin@gmail.com") {
    alert("Access Denied: Analytics is restricted for Admin.");
    window.location.href = "/src/dashboard.html";
  }
});

// ===================== Chart Instances =====================
let incidentChartInstance = null;
let responseChartInstance = null;
let typeChartInstance = null;

// ===================== Constants =====================
const INCIDENT_CATEGORIES = [
  "Health",
  "Disasters & Hazards",
  "Peace & Order",
  "Community & Environmental Concerns",
  "Other",
];

const RESPONSE_BUCKETS = [
  "<10min",
  "10-30min",
  "30-60min",
  "1-2hr",
  "2-6hr",
  "6-12hr",
  ">12hr",
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ===================== Helpers =====================
function mapIncidentType(rawType) {
  if (!rawType) return "Other";
  const type = rawType.trim().toLowerCase();

  if (type.includes("health") || type.includes("gamot") || type.includes("first aid"))
    return "Health";
  if (type.includes("disaster") || type.includes("hazard"))
    return "Disasters & Hazards";
  if (type.includes("peace") || type.includes("order"))
    return "Peace & Order";
  if (type.includes("community") || type.includes("environment") || type.includes("env"))
    return "Community & Environmental Concerns";

  return "Other";
}

// ===================== Main Logic =====================
document.addEventListener("DOMContentLoaded", () => {
  const filterButton = document.getElementById("filter-button");

  // Date filter
  filterButton.addEventListener("click", () => {
    const startInput = document.getElementById("start-date").value;
    const endInput = document.getElementById("end-date").value;

    if (startInput && endInput) {
      const startDate = new Date(`${startInput}T00:00:00`);
      const endDate = new Date(`${endInput}T23:59:59.999`);
      fetchAndRenderAnalytics(startDate, endDate);
    }
  });

  // Default: last 30 days
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultEnd.getDate() - 30);
  fetchAndRenderAnalytics(defaultStart, defaultEnd);

  // Dark mode toggle
  const page = document.getElementById("page");
  if (localStorage.getItem("theme") === "dark") page.classList.add("dark");
});

// ===================== Firestore Query & Render =====================
function fetchAndRenderAnalytics(startDate, endDate) {
  const historyRef = collection(db, "sos_history");
  const historyQuery = query(
    historyRef,
    where("timestamp", ">=", Timestamp.fromDate(startDate)),
    where("timestamp", "<=", Timestamp.fromDate(endDate))
  );

  onSnapshot(historyQuery, async (snapshot) => {
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Totals
    const totalIncidents = data.filter(
      (r) => r.status === "completed" || r.status === "cancelled"
    ).length;
    const totalResolved = data.filter((r) => r.status === "completed").length;

    document.getElementById("total-incidents").textContent = totalIncidents;
    document.getElementById("total-resolved").textContent = totalResolved;

    // Trackers
    let totalResponseTime = 0;
    let responseCount = 0;
    const monthlyCounts = {};
    const responseBuckets = {};
    const typeCounts = {};
    const updatePromises = [];

    RESPONSE_BUCKETS.forEach((b) => (responseBuckets[b] = 0));
    INCIDENT_CATEGORIES.forEach((c) => (typeCounts[c] = 0));
    MONTHS.forEach((m) => (monthlyCounts[m] = 0));

    for (const report of data) {
      if (!report.timestamp) continue;

      // Month count
      const created = report.timestamp.toDate
        ? report.timestamp.toDate()
        : new Date(report.timestamp);
      const month = created.toLocaleString("default", { month: "short" });
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;

      // ✅ Average Response Time Computation
      if (
        report.status === "completed" &&
        report.arrival_time &&
        report.accepted_time
      ) {
        const accepted = report.accepted_time.toDate();
        const arrived = report.arrival_time.toDate();
        const diffMinutes = (arrived - accepted) / (1000 * 60);

        if (diffMinutes >= 0) {
          totalResponseTime += diffMinutes;
          responseCount++;

          // Bucket categorization
          if (diffMinutes < 10) responseBuckets["<10min"]++;
          else if (diffMinutes < 30) responseBuckets["10-30min"]++;
          else if (diffMinutes < 60) responseBuckets["30-60min"]++;
          else if (diffMinutes < 120) responseBuckets["1-2hr"]++;
          else if (diffMinutes < 360) responseBuckets["2-6hr"]++;
          else if (diffMinutes < 720) responseBuckets["6-12hr"]++;
          else responseBuckets[">12hr"]++;

          // Optional: save to Firestore
          if (!report.responseTimeMinutes) {
            updatePromises.push(
              updateDoc(doc(db, "sos_history", report.id), {
                responseTimeMinutes: diffMinutes,
              })
            );
          }
        }
      }

      const type = mapIncidentType(report.incidentType || report.category);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    // Run any Firestore updates
    if (updatePromises.length) {
      try {
        await Promise.all(updatePromises);
      } catch (err) {
        console.error("Failed to update response times:", err);
      }
    }

    // ✅ Final Average Response Time (min + sec format)
    let avgResponseText = "N/A";
    let avgResponseNumeric = 0;
    if (responseCount > 0) {
      avgResponseNumeric = totalResponseTime / responseCount;
      const avgMinutes = Math.floor(avgResponseNumeric);
      const avgSeconds = Math.round((avgResponseNumeric - avgMinutes) * 60);
      avgResponseText = `${avgMinutes} min ${avgSeconds} sec`;
    }

    document.getElementById("avg-response-time").textContent = avgResponseText;

    // Render Charts
    renderIncidentChart(monthlyCounts);
    renderResponseTimeChart(responseBuckets, avgResponseText);
    renderIncidentTypeChart(typeCounts);
  });
}

// ===================== Chart Rendering =====================
function renderIncidentChart(monthlyCounts) {
  const canvas = document.getElementById("incidentChart");
  if (!canvas) return;
  if (incidentChartInstance) incidentChartInstance.destroy();

  incidentChartInstance = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: MONTHS,
      datasets: [
        {
          label: "Incidents per Month",
          data: MONTHS.map((m) => monthlyCounts[m] || 0),
          backgroundColor: "rgba(239,68,68,0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: "Incidents per Month" },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "No. of Incidents" } },
      },
    },
  });
}

function renderResponseTimeChart(responseBuckets, avgResponseText) {
  const canvas = document.getElementById("responseTimeChart");
  if (!canvas) return;
  if (responseChartInstance) responseChartInstance.destroy();

  responseChartInstance = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: RESPONSE_BUCKETS,
      datasets: [
        {
          label: "Response Time Distribution",
          data: RESPONSE_BUCKETS.map((b) => responseBuckets[b] || 0),
          backgroundColor: "rgba(255,99,132,0.6)",
          borderColor: "rgba(255,99,132,1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text:
            avgResponseText !== "N/A"
              ? `Avg Response Time: ${avgResponseText}`
              : "Avg Response Time",
        },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "No. of Incidents" } },
      },
    },
  });
}

function renderIncidentTypeChart(typeCounts) {
  const canvas = document.getElementById("incidentTypeChart");
  if (!canvas) return;
  if (typeChartInstance) typeChartInstance.destroy();

  INCIDENT_CATEGORIES.forEach((cat) => (typeCounts[cat] = typeCounts[cat] || 0));

  typeChartInstance = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: INCIDENT_CATEGORIES,
      datasets: [
        {
          data: INCIDENT_CATEGORIES.map((cat) => typeCounts[cat]),
          backgroundColor: [
            "#39FF14",
            "#F16767",
            "#F29F58",
            "#B2CD9C",
            "#A0AEC0",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right" },
        title: { display: true, text: "Incident Types" },
      },
    },
  });
}

// ===================== PDF & Excel Export =====================
document.getElementById("pdf-btn").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  let yOffset = 10;

  const charts = [
    { id: "incidentChart", title: "Incident Trends" },
    { id: "responseTimeChart", title: "Response Time" },
    { id: "incidentTypeChart", title: "Incident Types" },
  ];

  for (const c of charts) {
    const canvas = document.getElementById(c.id);
    if (!canvas) continue;
    const imgData = canvas.toDataURL("image/png");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    if (yOffset + pdfHeight > pdf.internal.pageSize.getHeight() - 20) {
      pdf.addPage();
      yOffset = 10;
    }

    pdf.text(c.title, 10, yOffset);
    yOffset += 5;
    pdf.addImage(imgData, "PNG", 10, yOffset, pdfWidth, pdfHeight);
    yOffset += pdfHeight + 10;
  }

  pdf.save("analytics_report.pdf");
});

document.getElementById("excel-btn").addEventListener("click", () => {
  const ws_data = [
    ["Metric", "Value"],
    ["Total Incidents", document.getElementById("total-incidents").textContent],
    ["Total Resolved Reports", document.getElementById("total-resolved").textContent],
    ["Avg Response Time", document.getElementById("avg-response-time").textContent],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, "Summary");
  XLSX.writeFile(wb, "analytics_report.xlsx");
});
