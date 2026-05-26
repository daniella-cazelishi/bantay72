import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPtb60dthvTPLmaRlL_E7YOsBDIAK-vKw",
  authDomain: "sample-79b30.firebaseapp.com",
  projectId: "sample-79b30",
  storageBucket: "sample-79b30.firebasestorage.app",
  messagingSenderId: "12884863424",
  appId: "1:12884863424:web:277b044f4005f7d80fc025",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Track the reports already seen
const shownAlerts = new Set(
  JSON.parse(sessionStorage.getItem("shownAlerts") || "[]")
);

// Badge counters
const badgeCounts = { active: 0, completed: 0, canceled: 0, resolved: 0 };

const updateBadgeUI = () => {
  document.getElementById("active-badge").textContent = badgeCounts.active;
  document.getElementById("completed-badge").textContent = badgeCounts.completed;
  document.getElementById("canceled-badge").textContent = badgeCounts.canceled;
  // document.getElementById("resolved-badge").textContent = badgeCounts.resolved;
};

// Show SOS alert
const showSOSAlert = (report) => {
  alert(
    `🚨 ${report.incidentType}\n\n` +
      `User: ${report.user}\n` +
      `Address: ${report.location}\n` +
      `Message: ${report.message}\n` +
      `Time: ${
        report.timestamp?.toDate
          ? new Date(report.timestamp.toDate()).toLocaleString()
          : "N/A"
      }\n` +
      `Volunteer?: ${report.volunteer == true ? "Yes" : "No"}`
  );
};

// Listen for SOS alerts
const listenForSOSAlerts = () => {
  const sosQuery = query(
    collection(db, "sos_reports"),
    orderBy("timestamp", "desc")
  );

  onSnapshot(sosQuery, (snapshot) => {
    const loadingRow = document.querySelector("#loading-row");
    const noDataRow = document.querySelector("#no-data-row");

    if (loadingRow) loadingRow.remove();

    if (snapshot.empty) {
      if (noDataRow) {
        noDataRow.classList.remove("hidden");
        noDataRow.classList.add(
          "absolute",
          "top-52",
          "flex",
          "justify-center",
          "items-center",
          "w-full",
          "h-full"
        );
      }
      return;
    }

    // Reset badge counts
    badgeCounts.active =
      badgeCounts.completed =
      badgeCounts.resolved =
      badgeCounts.canceled =
        0;
    document.querySelector("table tbody").innerHTML = "";

    snapshot.forEach(async (docSnap) => {
      const report = docSnap.data();
      const reportId = docSnap.id;

      // Move completed reports to resolved_reports
      if (report.status === "completed") {
        try {
          // Add to resolved_reports
          await addDoc(collection(db, "resolved_reports"), report);

          // Delete from sos_reports
          await deleteDoc(doc(db, "sos_reports", reportId));

          console.log(`Report ${reportId} moved to resolved_reports`);
          return; // Skip appending to table since it's now resolved
        } catch (error) {
          console.error("Error moving report:", error);
        }
      }

      // Update badge counts
      if (report.status === "resolved") {
        badgeCounts.resolved++;
      } else if (report.status === "completed") {
        badgeCounts.completed++;
      } else if (report.status === "canceled") {
        badgeCounts.canceled++;
      } else {
        badgeCounts.active++;
      }

      // Append remaining reports to table
      appendToTable(report);

      // Show alert if not seen
      if (!shownAlerts.has(reportId)) {
        showSOSAlert(report);
        shownAlerts.add(reportId);
        sessionStorage.setItem("shownAlerts", JSON.stringify([...shownAlerts]));
      }
    });

    updateBadgeUI();
  });
};

// Append report to table (NO Actions column)
const appendToTable = (report) => {
  const tableBody = document.querySelector("table tbody");
  const row = document.createElement("tr");

  let status = report.status || "unread";
  const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
  let statusColor;

  switch (status) {
    case "unread":
      statusColor = "bg-[#A6A6A6]";
      break;
    case "on the way":
      statusColor = "bg-[#F38D29]";
      break;
    case "completed":
      statusColor = "bg-green-600";
      break;
    case "canceled":
      statusColor = "bg-red-600";
      break;
    default:
      statusColor = "bg-orange-600";
      break;
  }

  const timestamp = report.timestamp?.toDate
    ? new Date(report.timestamp.toDate()).toLocaleString()
    : "N/A";

  row.innerHTML = `
    <td class="p-3 text-center border-b">${report.category || "N/A"}</td>
    <td class="p-3 text-center border-b">${report.user || "N/A"}</td>
    <td class="p-3 text-center border-b">${report.phone || "N/A"}</td>
    <td class="p-3 text-center border-b">${report.message || "N/A"}</td>
    <td class="p-3 text-left text-sm border-b">${report.location || "N/A"}</td>
    <td class="p-3 text-center border-b">${timestamp}</td>
    <td class="p-3 text-center border-b">${
      report.responderPhone || "not yet responded"
    }</td>
    <td class="p-3 text-center border-b">
      <span class="rounded inline-block text-center px-3 py-1 text-white ${statusColor}">
        ${displayStatus}
      </span>
    </td>
  `;

  tableBody.appendChild(row);
};

// Auth State Change
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Admin is authenticated:", user.email);
    listenForSOSAlerts();

    // Role-based UI updates by Email
    const ADMIN_EMAIL = "bantayteam72.admin@gmail.com";
    if (user.email === ADMIN_EMAIL) {
      document.querySelectorAll('a[href*="analytics_and_reports.html"]').forEach(el => el.style.display = "none");
      document.querySelectorAll('a[href*="user-management.html"]').forEach(el => el.style.display = "none");
    }
  } else {
    console.warn("No admin is logged in. Firestore access restricted.");
  }
});
