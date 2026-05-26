// history.js
 
// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
 
// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBPtb60dthvTPLmaRlL_E7YOsBDIAK-vKw",
  authDomain: "sample-79b30.firebaseapp.com",
  projectId: "sample-79b30",
  storageBucket: "sample-79b30.appspot.com",
  messagingSenderId: "12884863424",
  appId: "1:12884863424:web:277b044f4005f7d80fc025",
};
 
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
 
// DOM elements
const table = document.getElementById("historyTable");
const tableBody = table.querySelector("tbody");
const noDataRow = document.getElementById("no-data-row");
const sortSelect = document.getElementById("sortFilter");
const exportBtn = document.getElementById("exportPdfBtn");
const modal = document.getElementById("detailsModal");
const modalContent = document.getElementById("modalContent");
const closeModalBtn = document.getElementById("closeModal");
 
// --- FETCH AND RENDER REPORTS ---
const renderHistory = async (filter = null) => {
  if (!tableBody) return;
 
  tableBody.innerHTML = ""; // Clear table
 
  const reportsRef = collection(db, "sos_history");
  let q = query(reportsRef, orderBy("timestamp", "desc"));
 
  if (filter === "weekly" || filter === "monthly") {
    const now = new Date();
    let pastDate = new Date();
    if (filter === "weekly") pastDate.setDate(now.getDate() - 7);
    else if (filter === "monthly") pastDate.setMonth(now.getMonth() - 1);
 
    q = query(
      reportsRef,
      where("timestamp", ">=", pastDate),
      orderBy("timestamp", "desc")
    );
  }
 
  let snapshot;
  try {
    snapshot = await getDocs(q);
  } catch (err) {
    console.error("Firestore fetch failed:", err);
    return;
  }
 
  if (snapshot.empty) {
    if (noDataRow) noDataRow.classList.remove("hidden");
    return;
  } else {
    if (noDataRow) noDataRow.classList.add("hidden");
  }
 
  snapshot.forEach((docSnap) => {
    const report = docSnap.data();
    const timestamp = report.timestamp?.toDate?.().toLocaleString() || "N/A";
    const status = report.status;
    const statusColor =
      status.toLowerCase() === "completed" ? "bg-green-600" : "bg-[#9F2424]";
 
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="p-3 text-center border-b">${report.category || "N/A"}</td>
      <td class="p-3 text-center border-b">${report.user || "N/A"}</td>
      <td class="p-3 text-center border-b">${report.message || "N/A"}</td>
      <td class="p-3 text-center border-b">${timestamp}</td>
      <td class="p-3 text-center border-b">
        <span class="px-3 py-2 rounded text-white ${statusColor}">${status}</span>
      </td>
      <td class="p-3 text-center border-b">
        <button class="viewBtn bg-red-600 hover:bg-red-800 text-white px-3 py-1 rounded" data-id="${
          docSnap.id
        }">View</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
 
  attachViewEvents();
};
 
// --- VIEW BUTTON MODAL ---
const attachViewEvents = () => {
  document.querySelectorAll(".viewBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const reportId = btn.getAttribute("data-id");
      if (!reportId) return;
 
      try {
        const docRef = doc(db, "sos_history", reportId);
        const docSnap = await getDoc(docRef);
 
        if (docSnap.exists()) {
          const report = docSnap.data();
          const timestamp =
            report.timestamp?.toDate?.().toLocaleString() || "N/A";
 
          modalContent.innerHTML = `
            <h2 class="text-xl font-bold mb-4">Report Details</h2>
            <p><strong>Type of Incident:</strong> ${
              report.category || "N/A"
            }</p>
            <p><strong>Reported By:</strong> ${report.user || "N/A"}</p>
            <p><strong>Message:</strong> ${report.message || "N/A"}</p>
            <p><strong>Status:</strong> ${report.status || "Resolved"}</p>
            <p><strong>Date & Time:</strong> ${timestamp}</p>
          `;
          modal.classList.remove("opacity-0", "pointer-events-none");
        } else {
          alert("Report not found!");
        }
      } catch (err) {
        console.error(err);
      }
    });
  });
};
 
// --- CLOSE MODAL ---
closeModalBtn.addEventListener("click", () => {
  modal.classList.add("opacity-0", "pointer-events-none");
});
modal.addEventListener("click", (e) => {
  if (e.target === modal)
    modal.classList.add("opacity-0", "pointer-events-none");
});
 
// --- FILTERING ---
if (sortSelect) {
  sortSelect.addEventListener("change", (e) => renderHistory(e.target.value));
}
 
// --- PDF EXPORT ---
if (exportBtn) {
  exportBtn.addEventListener("click", async () => {
    if (!table) return;
    const canvas = await html2canvas(table, {
      scale: 2,
      scrollY: -window.scrollY,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jspdf.jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("report-history.pdf");
  });
}
 
// --- AUTH CHECK ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Admin authenticated:", user.email);
    renderHistory();
    
    // Role-based UI updates by Email
    const ADMIN_EMAIL = "bantayteam72.admin@gmail.com";
    if (user.email === ADMIN_EMAIL) {
      document.querySelectorAll('a[href*="analytics_and_reports.html"]').forEach(el => el.style.display = "none");
      document.querySelectorAll('a[href*="user-management.html"]').forEach(el => el.style.display = "none");
    }
  } else {
    console.warn("No admin logged in. Access restricted.");
  }
});