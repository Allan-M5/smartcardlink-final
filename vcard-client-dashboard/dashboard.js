const clients = Array.from({ length: 50 }, (_, i) => {
    const createdOn = new Date(2025, 6, (i % 28) + 1); // July 2025
    const expiryDate = new Date(createdOn);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const renewalDate = new Date(createdOn);
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);

    const today = new Date(2025, 6, 11);
    const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    const status = i % 3 === 0 ? "Active" : i % 3 === 1 ? "Disabled" : "Deleted";
    const amountDue = (status === "Disabled" && today > expiryDate) ? 500 : 0;

    return {
        photo: `https://via.placeholder.com/60?text=${i + 1}`,
        name: `Client ${i + 1}`,
        phone: `0712345${String(i).padStart(2, '0')}`,
        email: `client${i + 1}@example.com`,
        createdOn: createdOn.toISOString().split('T')[0],
        expiryDate: expiryDate.toISOString().split('T')[0],
        daysRemaining: daysRemaining > 0 ? `${daysRemaining} days` : "Expired",
        renewalDate: renewalDate.toISOString().split('T')[0],
        amountDue: amountDue,
        status: status
    };
});

const tableBody = document.getElementById("clientTableBody");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const exportBtn = document.getElementById("exportBtn");
const noResults = document.getElementById("noResults");
const totals = document.getElementById("totals");
const statusFilter = document.getElementById("statusFilter");

function maskPhone(phone) {
    return phone.slice(0, -3) + "***";
}

function renderTable(data) {
    tableBody.innerHTML = "";
    let totalAmountDue = 0;

    if (data.length === 0) {
        noResults.style.display = "block";
        totals.textContent = "";
        return;
    } else {
        noResults.style.display = "none";
    }

    data.forEach((client, index) => {
        const row = document.createElement("tr");

        const cells = [
            index + 1,
            client.photo,
            client.name,
            maskPhone(client.phone),
            client.email,
            client.createdOn,
            client.expiryDate,
            client.daysRemaining,
            client.renewalDate,
            client.amountDue > 0 ? `KES ${client.amountDue.toLocaleString()}` : "-",
            client.status
        ];

        cells.forEach((item, idx) => {
            const cell = document.createElement("td");
            if (idx === 1) {
                const img = document.createElement("img");
                img.src = client.photo;
                img.alt = client.name;
                img.className = "client-photo";
                cell.appendChild(img);
            } else if (idx === 4) {
                const emailLink = document.createElement("a");
                emailLink.href = `mailto:${client.email}`;
                emailLink.textContent = client.email;
                emailLink.style.textDecoration = "underline";
                emailLink.style.color = "black";
                cell.appendChild(emailLink);
            } else if (idx === 10) {
                const statusBadge = document.createElement("span");
                statusBadge.textContent = client.status;
                statusBadge.className =
                    client.status === "Active" ? "status-badge status-active" :
                    client.status === "Disabled" ? "status-badge status-disabled" :
                    "status-badge status-deleted";
                cell.appendChild(statusBadge);
            } else {
                cell.textContent = item;
                cell.style.color = "black";
            }
            row.appendChild(cell);
        });

        if (client.amountDue > 0) {
            totalAmountDue += client.amountDue;
        }

        tableBody.appendChild(row);
    });

    totals.textContent = `Total Clients: ${data.length} | Total Amount Due: KES ${totalAmountDue.toLocaleString()}`;
}

function filterAndRender() {
    const query = searchInput.value.toLowerCase().trim();
    const status = statusFilter.value;
    const filtered = clients.filter(client => {
        const matchesQuery =
            client.name.toLowerCase().includes(query) ||
            client.phone.includes(query) ||
            client.email.toLowerCase().includes(query);
        const matchesStatus = status ? client.status === status : true;
        return matchesQuery && matchesStatus;
    });
    renderTable(filtered);
}

renderTable(clients);
searchBtn.addEventListener("click", filterAndRender);
statusFilter.addEventListener("change", filterAndRender);
exportBtn.addEventListener("click", () => {
    alert("Export to Excel triggered. SheetJS or backend integration will handle production export.");
});
