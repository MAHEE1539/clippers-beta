// src/pages/DailySummaryPage.js
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";

// For CSV export
const downloadCSV = (date, orders) => {
  let rows = [["Customer", "Order ID", "Grand Total", "Created At"]];
  orders.forEach((o) => {
    let subtotal = o.total || 0;
    let discount = 0;
    if (o.discount) {
      if (o.discount.type === "percentage") {
        discount = (subtotal * o.discount.value) / 100;
      } else {
        discount = o.discount.value;
      }
    }
    if (discount > subtotal) discount = subtotal;
    const taxable = subtotal - discount;

    let taxes = 0;
    (o.taxes || []).forEach((t) => {
      taxes += (taxable * t.percentage) / 100;
    });

    const grandTotal = taxable + taxes;

    rows.push([
      o.customer,
      o.id,
      `₹${grandTotal.toFixed(2)}`,
      new Date(o.createdAt.seconds * 1000).toLocaleString(),
    ]);
  });

  let csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = `DailySummary_${date}.csv`;
  link.click();
};

// For PDF export
const downloadPDF = (date, orders) => {
  const content = [];
  content.push(`Daily Summary - ${date}\n\n`);

  orders.forEach((o) => {
    let subtotal = o.total || 0;
    let discount = 0;
    if (o.discount) {
      if (o.discount.type === "percentage") {
        discount = (subtotal * o.discount.value) / 100;
      } else {
        discount = o.discount.value;
      }
    }
    if (discount > subtotal) discount = subtotal;
    const taxable = subtotal - discount;

    let taxes = 0;
    (o.taxes || []).forEach((t) => {
      taxes += (taxable * t.percentage) / 100;
    });

    const grandTotal = taxable + taxes;

    content.push(
      `Customer: ${o.customer} | OrderID: ${o.id} | Grand Total: ₹${grandTotal.toFixed(
        2
      )} | Created At: ${new Date(o.createdAt.seconds * 1000).toLocaleString()}`
    );
  });

  const blob = new Blob([content.join("\n")], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `DailySummary_${date}.pdf`;
  link.click();
};

export default function DailySummaryPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ✅ Group by date
  const groupedByDate = useMemo(() => {
    const groups = {};
    orders
      .filter((o) => o.status === "PaymentDone") // only paid orders
      .forEach((o) => {
        if (!o.createdAt?.seconds) return;
        const dateStr = new Date(o.createdAt.seconds * 1000).toLocaleDateString();

        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(o);
      });

    // Sort dates descending (latest first)
    return Object.fromEntries(
      Object.entries(groups).sort(
        ([a], [b]) => new Date(b) - new Date(a)
      )
    );
  }, [orders]);

  return (
    <div className="container">
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>📊 Daily Summary</h2>

      {Object.keys(groupedByDate).length === 0 ? (
        <p>No paid orders yet.</p>
      ) : (
        Object.entries(groupedByDate).map(([date, dayOrders]) => {
          // Calculate total income
          let totalIncome = 0;
          dayOrders.forEach((o) => {
            let subtotal = o.total || 0;
            let discount = 0;
            if (o.discount) {
              if (o.discount.type === "percentage") {
                discount = (subtotal * o.discount.value) / 100;
              } else {
                discount = o.discount.value;
              }
            }
            if (discount > subtotal) discount = subtotal;
            const taxable = subtotal - discount;

            let taxes = 0;
            (o.taxes || []).forEach((t) => {
              taxes += (taxable * t.percentage) / 100;
            });

            totalIncome += taxable + taxes;
          });

          return (
            <div
              key={date}
              className="card"
              style={{
                marginTop: 16,
                padding: 16,
                border: "1px solid #ddd",
                borderRadius: 10,
                background: "#fff",
                boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
              }}
            >
              <h3 style={{ margin: "0 0 8px 0" }}>{date}</h3>
              <p>
                <strong>Orders:</strong> {dayOrders.length}
              </p>
              <p>
                <strong>Total Income:</strong> ₹{totalIncome.toFixed(2)}
              </p>

              <div style={{ display: "flex", gap: "10px", marginTop: 10 }}>
                <button className="btn" onClick={() => downloadCSV(date, dayOrders)}>
                  Download CSV
                </button>
                {/* <button className="btn secondary" onClick={() => downloadPDF(date, dayOrders)}>
                  Download PDF
                </button> */}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
