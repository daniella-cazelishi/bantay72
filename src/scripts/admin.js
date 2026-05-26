import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

import {
  getDownloadURL,
  getStorage,
  ref,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBPtb60dthvTPLmaRlL_E7YOsBDIAK-vKw",
  authDomain: "sample-79b30.firebaseapp.com",
  projectId: "sample-79b30",
  storageBucket: "sample-79b30.firebasestorage.app",
  messagingSenderId: "12884863424",
  appId: "1:12884863424:web:277b044f4005f7d80fc025",
};

// Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Track alerts
const shownAlerts = new Set(
  JSON.parse(sessionStorage.getItem("shownAlerts") || "[]")
);

// Listen for new users
const listenForUsers = () => {
  const usersQuery = query(
    collection(db, "pending-users"),
    orderBy("timestamp", "desc")
  );

  onSnapshot(usersQuery, (snapshot) => {
    const loadingRow = document.querySelector("#loading-row");
    const noDataRow = document.querySelector("#no-data-row");

    if (loadingRow) loadingRow.remove();
    const tableBody = document.querySelector("#userTableBody");
    tableBody.innerHTML = "";

    if (snapshot.empty) {
      if (noDataRow) noDataRow.classList.remove("hidden");
      return;
    }

    snapshot.forEach((docSnap) => {
      const report = docSnap.data();
      const reportId = docSnap.id;
      appendToTable(report, reportId);
      if (!shownAlerts.has(reportId)) {
        shownAlerts.add(reportId);
        sessionStorage.setItem("shownAlerts", JSON.stringify([...shownAlerts]));
      }
    });
  });
};

// Auth check
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Admin is authenticated:", user.email);
    listenForUsers();

    // Role-based UI updates by Email instead of UID (mas sigurado!)
    const ADMIN_EMAIL = "bantayteam72.admin@gmail.com";
    const SUPER_ADMIN_EMAIL = "superbantay72@gmail.com";
    
    // Check if script runs and what the email is
    console.log("Logged in as:", user.email);

    // Hide tabs for Admin
    if (user.email === ADMIN_EMAIL) {
      document.querySelectorAll('a[href*="analytics_and_reports.html"]').forEach(el => {
        el.style.display = "none";
      });
      document.querySelectorAll('a[href*="user-management.html"]').forEach(el => {
        el.style.display = "none";
      });
    }

    // Auto-change Profile text for Super Admin
    if (user.email === SUPER_ADMIN_EMAIL) {
      const profileH1 = document.querySelector("main h1");
      const profileH2 = document.querySelector("main h2");
      
      if (profileH1 && profileH1.textContent.includes("Admin Account")) {
        profileH1.textContent = "Super Admin Account";
      }
      if (profileH2 && profileH2.textContent.trim() === "Admin") {
        profileH2.textContent = "Super Admin";
      }
    }

  } else {
    console.warn("No admin is logged in.");
  }
});

function isImageFile(filename) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
}

// Modal preview
function showFileInModal(files) {
  const modalOverlay = document.createElement("div");
  modalOverlay.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";

  const imageFiles = files.filter((file) => isImageFile(file.filename));

  modalOverlay.innerHTML = `
    <div class="bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded shadow-lg p-6 relative">
      <h2 class="text-xl font-semibold mb-4">Uploaded Images</h2>
      <button class="absolute top-2 right-4 text-gray-500 hover:text-gray-800 text-xl" id="close-modal">&times;</button>
      <div class="grid grid-cols-2 gap-4">
        ${imageFiles
          .map(
            (file, index) => `
          <div class="border p-2 rounded flex flex-col justify-center items-center text-center">
            <img src="${file.url}" alt="${file.filename}" class="max-h-40 mx-auto rounded mb-2" />
            <p class="text-sm break-all mb-2">${file.filename}</p>
            <button data-index="${index}" class="download-btn bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Download</button>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  modalOverlay.querySelector("#close-modal").addEventListener("click", () => {
    modalOverlay.remove();
  });

  modalOverlay.querySelectorAll(".download-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const file = imageFiles[btn.dataset.index];
      downloadFileFromURL(file.url, file.filename);
    });
  });
}

function downloadFileFromURL(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Add row (auto-approved)
const appendToTable = (report, reportId) => {
  const tableBody = document.querySelector("#userTableBody");
  const row = document.createElement("tr");
  row.setAttribute("data-id", reportId);

  row.innerHTML = `
    <td class="p-3 text-center border-b">${report.fullname || "N/A"}</td>
    <td class="p-3 text-justify border-b">${report.address || "N/A"}</td>
    <td class="p-3 text-center border-b">${report.phone || "N/A"}</td>
    <td class="p-3 text-center border-b">${report.email || "N/A"}</td>
    <td class="p-3 text-center border-b">
      ${
        report.timestamp?.toDate
          ? new Date(report.timestamp.toDate()).toLocaleString()
          : "N/A"
      }
    </td>
    <td class="p-3 text-center border-b">
      <button 
        class="bg-[#9c2626] view-btn text-white text-sm px-5 py-1.5 rounded" 
        type="button" 
        data-images='${JSON.stringify(report.images || [])}'>
        View
      </button>
    </td>
    <td class="p-3 text-center border-b">
      <span class="px-2 py-1.5 rounded text-sm text-white bg-green-600">
        Approved
      </span>
    </td>
  `;

  tableBody.appendChild(row);

  // View button handler
  row.querySelector(".view-btn").addEventListener("click", (e) => {
    const filenames = JSON.parse(e.target.dataset.images || "[]");

    Promise.all(
      filenames.map(async (file) => {
        try {
          const fileRef = ref(storage, file.path);
          const url = await getDownloadURL(fileRef);
          return { filename: file.name, url };
        } catch (err) {
          console.error(`Error getting URL for ${file.name}:`, err);
          return null;
        }
      })
    ).then((fetchedFiles) => {
      const validFiles = fetchedFiles.filter((f) => f !== null);
      showFileInModal(validFiles);
    });
  });
};

// 🔎 Search filter
document.getElementById("searchInput").addEventListener("keyup", function () {
  const filter = this.value.toLowerCase();
  const rows = document.querySelectorAll("#userTableBody tr");

  rows.forEach((row) => {
    if (row.id === "loading-row" || row.id === "no-data-row") return;

    const fullname = row.cells[0]?.textContent.toLowerCase() || "";
    const address = row.cells[1]?.textContent.toLowerCase() || "";
    const email = row.cells[3]?.textContent.toLowerCase() || "";
    const userId = row.dataset.id ? row.dataset.id.toLowerCase() : "";

    if (
      fullname.includes(filter) ||
      address.includes(filter) ||
      email.includes(filter) ||
      userId.includes(filter)
    ) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
});
