// src/pages/CashierPage.js
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "firebase/auth";
import {
  collection,
  doc, getDocs, onSnapshot, orderBy, query, updateDoc
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";

export default function CashierPage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [taxes, setTaxes] = useState([]);
  const [showPaymentDone, setShowPaymentDone] = useState(false);


  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) { setOrders([]); return; }
    const q = query(collection(db, "orders"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // ✅ Fetch taxes from Firestore
  useEffect(() => {
    const fetchTaxes = async () => {
      const snap = await getDocs(collection(db, "taxes"));
      setTaxes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchTaxes();
  }, []);

  const navigate = useNavigate();

  const setBatchStatus = async (orderId, batchId, status) => {
    const orderRef = doc(db, "orders", orderId);
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const updatedBatches = order.batches.map((b) =>
      b.batchId === batchId ? { ...b, status } : b
    );

    await updateDoc(orderRef, {
      batches: updatedBatches,
      status,
    });
  };

  // ✅ Flatten batches only for active sections
  const allBatches = useMemo(() => {
    let rows = [];
    orders.forEach((o) => {
      (o.batches || []).forEach((b) => {
        rows.push({ ...o, batch: b });
      });
    });
    return rows;
  }, [orders]);

  const pending = useMemo(() => allBatches.filter((r) => r.batch.status === "Pending"), [allBatches]);
  const preparing = useMemo(() => allBatches.filter((r) => r.batch.status === "Preparing"), [allBatches]);
  const ready = useMemo(() => allBatches.filter((r) => r.batch.status === "Ready"), [allBatches]);

  // ✅ Group done orders by orderId
  const doneOrders = useMemo(() => {
    return orders.filter(o =>
      (o.batches || []).every(b => b.status === "Done") // only fully completed
    );
  }, [orders]);

  const todayDone = useMemo(() => {
    const todayStr = new Date().toLocaleDateString();
    return doneOrders.filter(o => {
      if (!o.createdAt?.seconds) return false;
      const d = new Date(o.createdAt.seconds * 1000).toLocaleDateString();
      return d === todayStr;
    });
  }, [doneOrders]);

  // Split done orders by payment status
    const doneUnpaid = useMemo(() => {
      return orders.filter(o => o.status === "Done" && o.paymentStatus !== "Paid");
    }, [orders]);

    const todayStr = new Date().toLocaleDateString();

    // Only today's payment done orders
    const paymentDone = useMemo(() => {
      return orders.filter(o => {
        if (o.status !== "PaymentDone" || o.paymentStatus !== "Paid") return false;
        if (!o.createdAt?.seconds) return false;
        const d = new Date(o.createdAt.seconds * 1000).toLocaleDateString();
        return d === todayStr;
      });
    }, [orders]);

    // Group all previous PaymentDone orders by date
      const dailySummaries = useMemo(() => {
        const summaryMap = {};

        orders.forEach(order => {
          if (order.status === "PaymentDone" && order.paymentStatus === "Paid") {
            if (!order.createdAt?.seconds) return;
            const dateStr = new Date(order.createdAt.seconds * 1000).toLocaleDateString();

            // Compute grand total properly
            let subtotal = 0;
            order.batches.forEach(b => {
              b.items.forEach(i => subtotal += i.price * i.qty);
            });

            let discountAmt = 0;
            if (order.discount) {
              if (order.discount.type === "percentage") {
                discountAmt = (subtotal * order.discount.value) / 100;
              } else {
                discountAmt = order.discount.value;
              }
            }
            if (discountAmt > subtotal) discountAmt = subtotal;

            const taxable = Math.max(subtotal - discountAmt, 0);

            let totalTax = 0;
            (taxes || []).forEach(t => {
              totalTax += (taxable * t.percentage) / 100;
            });

            const grandTotal = taxable + totalTax;

            if (!summaryMap[dateStr]) {
              summaryMap[dateStr] = { orders: 0, income: 0 };
            }
            summaryMap[dateStr].orders += 1;
            summaryMap[dateStr].income += grandTotal;
          }
        });

        // Convert to array sorted by latest date first
        return Object.entries(summaryMap)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
      }, [orders, taxes]);




  // ✅ Generate combined bill for whole order
  const generateBill = (order) => {
    let subtotal = 0;
    let itemsList = [];

    order.batches.forEach(batch => {
      batch.items.forEach(i => {
        subtotal += i.price * i.qty;
        itemsList.push(`${i.name} × ${i.qty} = ₹${i.price * i.qty}`);
      });
    });

    let taxDetails = "";
    let totalTax = 0;
    taxes.forEach(t => {
      const amt = (subtotal * t.percentage) / 100;
      taxDetails += `${t.name} (${t.percentage}%): ₹${amt.toFixed(2)}\n`;
      totalTax += amt;
    });

    const finalTotal = subtotal + totalTax;

    const bill = `
    DIGITAL BILL
    ------------------------
    Customer: ${order.customer}
    Table: ${order.table || "-"}
    Order ID: ${order.id}
    ------------------------
    Items:
    ${itemsList.join("\n")}
    ------------------------
    Subtotal: ₹${subtotal.toFixed(2)}
    ${taxDetails}
    Final Total: ₹${finalTotal.toFixed(2)}
    ------------------------
    Thank you for visiting!
    `;

    const blob = new Blob([bill], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Bill_${order.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    await signInWithEmailAndPassword(auth, email, password);
    setEmail(""); setPassword("");
  };

    const computeBill = (order) => {
    const subtotal = order.total || 0;
    const discountObj = order.discount || null;
    const discountType = discountObj?.type || "flat";
    const discountValue = discountObj?.value || 0;

    let discountAmount = 0;
    if (discountType === "percentage") {
      discountAmount = (subtotal * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }
    if (discountAmount > subtotal) discountAmount = subtotal;

    const taxable = subtotal - discountAmount;

    let totalTax = 0;
    (taxes || []).forEach((t) => {
      totalTax += (taxable * t.percentage) / 100;
    });

    const grandTotal = taxable + totalTax;
    return { subtotal, discountAmount, discountType, discountValue, taxable, totalTax, grandTotal };
  };


  if (!user) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h3>Cashier Login</h3>
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 8 }}>
          <input className="input" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn" type="submit">Sign in</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2>Cashier Dashboard</h2>

        <div>
          <span style={{ marginRight: 8 }}>Signed in: {user.email}</span>
          <button className="btn secondary" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>
      <div className="cashier-header-buttons">
          <button className="btn" onClick={() => navigate("/menu-management")}>Menu Management</button>
        <button className="btn" onClick={() => navigate("/tax-management")}>Manage Taxes</button>
        <button className="btn" onClick={() => navigate("/feedbacks")}>View Feedbacks</button>
        <button className="btn" onClick={() => navigate("/daily-summary")}>View Daily Summary</button>

        </div>

      {/* Pending Section */}
      <div className="section">
        <h4 style={{ padding: "8px", background: "#c6c2c2ff", borderRadius: 4 }}>
          Pending ({pending.length})
        </h4>
        {pending.map(r => (
          <div key={`${r.id}-${r.batch.batchId}`} className="order-card">
            <div className="order-left">
              <div><strong>{r.customer}</strong> {r.table ? `· Table ${r.table}` : ""}</div>
              <div className="small">{r.batch.items?.map(i => `${i.name}×${i.qty}`).join(" , ")}</div>
              <div className="small">Batch Total: ₹{r.batch.items.reduce((s, i) => s + i.price * i.qty, 0)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={"status-badge status-Pending"}>Pending</div>
              <div style={{ marginTop: 8 }}>
                <button className="btn" onClick={() => setBatchStatus(r.id, r.batch.batchId, "Preparing")}>Start Preparing</button>
                <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => setBatchStatus(r.id, r.batch.batchId, "Ready")}>Mark Ready</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preparing Section */}
      <div className="section">
        <h4 style={{ padding: "8px", background: "#c6c2c2ff", borderRadius: 4 }}>
          Preparing ({preparing.length})
        </h4>
        {preparing.map(r => (
          <div key={`${r.id}-${r.batch.batchId}`} className="order-card">
            <div className="order-left">
              <div><strong>{r.customer}</strong></div>
              <div className="small">{r.batch.items?.map(i => `${i.name}×${i.qty}`).join(" , ")}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={"status-badge status-Preparing"}>Preparing</div>
              <div style={{ marginTop: 8 }}>
                <button className="btn" onClick={() => setBatchStatus(r.id, r.batch.batchId, "Ready")}>Mark Ready</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ready Section */}
      <div className="section">
        <h4 style={{ padding: "8px", background: "#c6c2c2ff", borderRadius: 4 }}>
          Ready ({ready.length})
        </h4>
        {ready.map(r => (
          <div key={`${r.id}-${r.batch.batchId}`} className="order-card">
            <div className="order-left">
              <div><strong>{r.customer}</strong></div>
              <div className="small">{r.batch.items?.map(i => `${i.name}×${i.qty}`).join(" , ")}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={"status-badge status-Ready"}>Ready</div>
              <div style={{ marginTop: 8 }}>
                <button className="btn" onClick={() => setBatchStatus(r.id, r.batch.batchId, "Done")}>Mark Done</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Done Section (Not Paid Yet) */}
<div className="section">
  <h4 style={{ padding: "8px", background: "#c6c2c2ff", borderRadius: 4 }}>
    Done (Unpaid: {doneUnpaid.length})
  </h4>

  {doneUnpaid.map(order => {
    // --- compute billing for cashier ---
    let subtotal = order.total || 0;
    let discountAmount = 0;

    if (order.discount) {
      if (order.discount.type === "percentage") {
        discountAmount = (subtotal * order.discount.value) / 100;
      } else {
        discountAmount = order.discount.value;
      }
    }

    if (discountAmount > subtotal) discountAmount = subtotal;
    const taxable = subtotal - discountAmount;

    let taxTotal = 0;
    if (taxes && taxes.length > 0) {
      taxes.forEach(t => {
        taxTotal += (taxable * (t.percentage || 0)) / 100;
      });
    }

    const grandTotal = taxable + taxTotal;
    // ----------------------------------

    return (
      <div key={order.id} className="order-card">
        <div className="order-left">
          <div><strong>{order.customer}</strong></div>
          <div className="small">
            {order.batches.flatMap(b => b.items.map(i => `${i.name}×${i.qty}`)).join(" , ")}
          </div>
          <div className="small">Subtotal: ₹{subtotal.toFixed(2)}</div>

          {order.discount && (
            <div className="small" style={{ color: "green" }}>
              Discount Applied: {order.discount.type === "percentage"
                ? `${order.discount.value}%`
                : `₹${order.discount.value}`}
            </div>
          )}

          {taxes.map((t, idx) => {
            const amt = (taxable * (t.percentage || 0)) / 100;
            return (
              <div className="small" key={idx}>
                {t.name} ({t.percentage}%): ₹{amt.toFixed(2)}
              </div>
            );
          })}

          <div className="small" style={{ fontWeight: "bold" }}>
            Grand Total: ₹{grandTotal.toFixed(2)}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className={"status-badge status-Done"}>
            Done - {order.paymentStatus || "Not Paid"}
          </div>

          {/* Discount input */}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "14px", fontWeight: "500" }}>Discount:</label>
            <input
              className="input"
              style={{ width: "120px" }}
              placeholder="10% or 100"
              defaultValue={
                order.discount
                  ? order.discount.type === "percentage"
                    ? `${order.discount.value}%`
                    : order.discount.value
                  : ""
              }
              onBlur={async (e) => {
                const val = e.target.value.trim();
                let discount = null;
                if (val.endsWith("%")) {
                  discount = { type: "percentage", value: parseFloat(val.replace("%", "")) };
                } else if (!isNaN(val) && val !== "") {
                  discount = { type: "flat", value: parseFloat(val) };
                }
                if (discount) {
                  await updateDoc(doc(db, "orders", order.id), { discount });
                }
              }}
            />
          </div>


          {/* Mark Paid Button */}
          <button
            className="btn"
            style={{ marginTop: 8 }}
            onClick={async () => {
              await updateDoc(doc(db, "orders", order.id), {
                paymentStatus: "Paid",
                status: "PaymentDone"
              });
            }}
          >
            Mark as Paid
          </button>
        </div>
      </div>
    );
  })}
</div>


  {/* Payment Done Section */}
<div className="section">
  <h4
    style={{ cursor: "pointer", padding: "8px", background: "#c6c2c2ff", borderRadius: 4 }}
    onClick={() => setShowPaymentDone(!showPaymentDone)}
  >
    Payment Done ({paymentDone.length}) {showPaymentDone ? "▲" : "▼"}
  </h4>

  {showPaymentDone && paymentDone.map(order => {
    // ---- Compute Grand Total with Discount & Taxes ----
    let subtotal = 0;
    order.batches.forEach(batch => {
      batch.items.forEach(i => {
        subtotal += i.price * i.qty;
      });
    });

    let discountAmt = 0;
    if (order.discount) {
      if (order.discount.type === "percentage") {
        discountAmt = (subtotal * order.discount.value) / 100;
      } else if (order.discount.type === "flat") {
        discountAmt = order.discount.value;
      }
    }
    if (discountAmt > subtotal) discountAmt = subtotal;

    const taxable = Math.max(subtotal - discountAmt, 0);

    let totalTax = 0;
    taxes.forEach(t => {
      totalTax += (taxable * t.percentage) / 100;
    });

    const grandTotal = taxable + totalTax;

    // ---- Generate Bill for Payment Done ----
    const generateBill = () => {
      const itemsList = order.batches.flatMap(b =>
        b.items.map(i => `${i.name} × ${i.qty} = ₹${i.price * i.qty}`)
      );

      let taxDetails = "";
      taxes.forEach(t => {
        const amt = (taxable * t.percentage) / 100;
        taxDetails += `${t.name} (${t.percentage}%): ₹${amt.toFixed(2)}\n`;
      });

      const bill = `
DIGITAL BILL
------------------------
Customer: ${order.customer}
Table: ${order.table || "-"}
Order ID: ${order.id}
------------------------
Items:
${itemsList.join("\n")}
------------------------
Subtotal: ₹${subtotal.toFixed(2)}
Discount: -₹${discountAmt.toFixed(2)}
Taxable: ₹${taxable.toFixed(2)}
${taxDetails}
Grand Total: ₹${grandTotal.toFixed(2)}
------------------------
Thank you for visiting!
`;

      const blob = new Blob([bill], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bill_${order.id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div key={order.id} className="order-card">
        <div className="order-left">
          <div><strong>{order.customer}</strong></div>
          <div className="small">
            {order.batches.flatMap(b => b.items.map(i => `${i.name}×${i.qty}`)).join(" , ")}
          </div>
          <div className="small"><strong>Grand Total: ₹{grandTotal.toFixed(2)}</strong></div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className={"status-badge status-PaymentDone"}>Payment Done</div>
          <button
            className="btn"
            style={{ marginTop: 8 }}
            onClick={generateBill}
          >
            Generate Bill
          </button>
        </div>
      </div>
    );
  })}
</div>

    </div>
  );
}
