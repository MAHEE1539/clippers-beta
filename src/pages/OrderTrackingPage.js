// src/pages/OrderTrackingPage.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const prevStatusRef = useRef(null);
  const [showFeedback, setShowFeedback] = useState(false);
const [rating, setRating] = useState(0);
const [comment, setComment] = useState("");
const [openSections, setOpenSections] = useState({});



  // Ask for notification permission once
  useEffect(() => {
    if ("Notification" in window) Notification.requestPermission();
  }, []);

  // Live order (with batches/discount/payment fields)
  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) {
        const newOrder = { id: snap.id, ...snap.data() };

        // notify on parent status change
        if (prevStatusRef.current && prevStatusRef.current !== newOrder.status) {
          showStatusNotification(newOrder.status);
          if (newOrder.status === "PaymentDone" && !newOrder.feedback) {
  setShowFeedback(true);
}

        }
        prevStatusRef.current = newOrder.status;

        setOrder(newOrder);
      } else {
        setOrder(null);
      }
    });
    return () => unsub();
  }, [orderId]);

  // Live taxes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "taxes"), (snap) => {
      setTaxes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Notification helper
  const showStatusNotification = (status) => {
    if (!("Notification" in window)) return;
    const messages = {
      Pending: "Your order has been placed!",
      Preparing: "Your order is being prepared 🍳",
      Ready: "Your order is ready to be served 🍽️",
      Done: "Your order is done ✅ (please proceed to payment)",
      PaymentDone: "Payment received. Thank you! 🧾",
      Cancelled: "Your order was cancelled ❌",
    };
    if (Notification.permission === "granted") {
      new Notification("Order Update", {
        body: messages[status] || `Order status: ${status}`,
        icon: "/logo192.png",
      });
    }
  };

  // Fetch menu (for adding items)
  useEffect(() => {
    const fetchMenu = async () => {
      const snap = await getDocs(collection(db, "menuItems"));
      setMenu(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchMenu();
  }, []);

  // Helpers to sanitize numbers (avoid NaN)
  const toNumber = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return Number.isFinite(val) ? val : 0;
    // strip non numeric chars (like "%", "₹", spaces)
    const cleaned = String(val).replace(/[^0-9.\-]+/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatCategory = (cat) =>
  cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();

  const toggleSection = (name) => {
  setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));
};


  const groupedMenu = useMemo(() => {
  const groups = {};
  menu.forEach((item) => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  });
  Object.keys(groups).forEach((cat) => {
    groups[cat].sort((a, b) => a.price - b.price);
  });
  return groups;
}, [menu]);



  // Cart ops
  const addToCart = (item) => {
    setCart((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const decQty = (id) => {
    setCart((prev) => prev.map((p) => (p.id === id ? { ...p, qty: p.qty - 1 } : p)).filter((p) => p.qty > 0));
  };

  const clearCart = () => setCart([]);
  const newCartTotal = cart.reduce((s, i) => s + toNumber(i.price) * toNumber(i.qty), 0);

  // Add a new batch to existing order (disabled after payment done)
  const addItemsToOrder = async () => {
    if (!order) return;
    if (order.status === "PaymentDone") {
      alert("Payment already completed. Please create a new order.");
      return;
    }
    if (cart.length === 0) return alert("Cart is empty.");

    const orderRef = doc(db, "orders", orderId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) return alert("Order not found.");

    const existing = snap.data();
    const existingBatches = existing.batches || [];

    const newBatch = {
      batchId: Date.now().toString(),
      items: cart.map((i) => ({
        id: i.id,
        name: i.name,
        price: toNumber(i.price),
        qty: toNumber(i.qty),
      })),
      status: "Pending",
      createdAt: new Date(),
    };

    const addedTotal = cart.reduce((s, i) => s + toNumber(i.price) * toNumber(i.qty), 0);
    const newTotal = toNumber(existing.total) + addedTotal;

    await updateDoc(orderRef, {
      batches: [...existingBatches, newBatch],
      total: newTotal,
      updatedAt: new Date(),
    });

    clearCart();
  };

  const handleSubmitFeedback = async () => {
  if (!order) return;
  await updateDoc(doc(db, "orders", order.id), {
    feedback: {
      rating,
      comment,
      submittedAt: serverTimestamp(),
    },
  });
  setShowFeedback(false);
  setRating(0);
  setComment("");
  alert("Thank you for your feedback!");
};

const handleSkipFeedback = () => {
  setShowFeedback(false);
};


  // Cancel order (only when still early)
  const cancelOrder = async () => {
    if (!order) return;
    const cancellable =
      (order.batches || []).every((b) => b.status === "Pending" || b.status === "Preparing") &&
      order.status !== "PaymentDone";
    if (!cancellable) {
      alert("Some items are already processed or paid. Cannot cancel.");
      return;
    }
    if (window.confirm("Are you sure you want to cancel this order?")) {
      await updateDoc(doc(db, "orders", order.id), { status: "Cancelled" });
      alert("Order cancelled.");
    }
  };

  // ------- Billing helpers (discount + taxes) -------
const computeBill = () => {
  if (!order) return null;

  const subtotal = toNumber(order.total);

  // ✅ Handle Firestore discount object correctly
  const discountObj = order.discount || null;
  const discountType = discountObj?.type || "flat";
  const discountValue = toNumber(discountObj?.value);

  let discountAmount = 0;
  if (discountType === "percentage") {
    discountAmount = (subtotal * discountValue) / 100;
  } else {
    discountAmount = discountValue;
  }

  if (!Number.isFinite(discountAmount) || discountAmount < 0) discountAmount = 0;
  if (discountAmount > subtotal) discountAmount = subtotal;

  const taxable = Math.max(subtotal - discountAmount, 0);

  const taxLines = (taxes || []).map((t) => {
    const pct = toNumber(t.percentage);
    const amt = (taxable * pct) / 100;
    return { name: t.name || "Tax", percentage: pct, amount: Number.isFinite(amt) ? amt : 0 };
  });

  const taxTotal = taxLines.reduce((s, tl) => s + toNumber(tl.amount), 0);
  const grandTotal = taxable + taxTotal;

  return {
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    taxable,
    taxLines,
    taxTotal,
    grandTotal,
  };
};


  const bill = computeBill();

  // Online payment (from tracking page)
  const payNow = async () => {
    if (!order) return;
    if (order.status !== "Done") {
      alert("Payment is enabled when the order is Done.");
      return;
    }
    await updateDoc(doc(db, "orders", order.id), {
      paymentStatus: "Paid",
      paymentMethod: "Online",
      paidAt: serverTimestamp(),
      status: "PaymentDone",
    });
  };

  // Generate digital bill (after payment done)
  const generateBill = () => {
    if (!order || !bill) return;
    if (order.status !== "PaymentDone" || order.paymentStatus !== "Paid") {
      alert("Bill is available after payment is completed.");
      return;
    }

    const itemsTxt = (order.batches || [])
      .flatMap((b) => b.items || [])
      .map((i) => `${i.name} × ${i.qty} = ₹${(toNumber(i.price) * toNumber(i.qty)).toFixed(2)}`)
      .join("\n");

    const taxTxt = (bill.taxLines || [])
      .map((t) => `${t.name} (${t.percentage}%): ₹${t.amount.toFixed(2)}`)
      .join("\n");

    const receipt = `
DIGITAL BILL
------------------------
Customer: ${order.customer}
Table: ${order.table || "-"}
Order ID: ${order.id}
Payment: ${order.paymentMethod || "-"} (${order.paymentStatus || "Not paid"})
------------------------
Items:
${itemsTxt}
------------------------
Subtotal: ₹${bill.subtotal.toFixed(2)}
Discount (${bill.discountType === "percent" ? bill.discountValue + "%" : "₹" + bill.discountValue.toFixed(2)}): -₹${bill.discountAmount.toFixed(2)}
Taxable: ₹${bill.taxable.toFixed(2)}
${taxTxt ? `${taxTxt}\n` : ""}
Grand Total: ₹${bill.grandTotal.toFixed(2)}
------------------------
Thank you for visiting!
`;

    const blob = new Blob([receipt], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Bill_${order.id}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (!order) return <p>Loading order...</p>;

  return (
    <div>
      <h2>Order Tracking</h2>
      <p><strong>Order ID:</strong> {order.id}</p>
      <p><strong>Customer:</strong> {order.customer}</p>
      <p><strong>Payment:</strong> {order.paymentStatus || "Not paid"}</p>
      <p><strong>Subtotal:</strong> ₹{(toNumber(order.total)).toFixed(2)}</p>

      {/* Payment & Bill area */}
      {order.status === "Done" && (order.paymentStatus || "Not paid") !== "Paid" && (
        <div className="card" style={{ margin: "12px 0" }}>
          <h3>Complete Payment</h3>
          {bill && (
            <>
              <p>Subtotal: ₹{bill.subtotal.toFixed(2)}</p>
              <p>
                Discount ({bill.discountType === "percent" ? `${bill.discountValue}%` : `₹${bill.discountValue.toFixed(2)}`}): -₹{bill.discountAmount.toFixed(2)}
              </p>
              <p>Taxable: ₹{bill.taxable.toFixed(2)}</p>
              {(bill.taxLines || []).map((t, idx) => (
                <p key={idx}>{t.name} ({t.percentage}%): ₹{t.amount.toFixed(2)}</p>
              ))}
              <p><strong>Grand Total: ₹{bill.grandTotal.toFixed(2)}</strong></p>
            </>
          )}
          {/* <button className="btn" onClick={payNow}>Pay Now</button> */}
          <h4>Kindly Pay the bill at the counter, Thankyou!!!</h4>
        </div>
      )}

      {order.status === "PaymentDone" && order.paymentStatus === "Paid" && (
        <div className="card" style={{ margin: "12px 0" }}>
          <h3>Bill Summary</h3>
          {bill && (
            <>
              <p>Subtotal: ₹{bill.subtotal.toFixed(2)}</p>
              <p>
                Discount ({bill.discountType === "percent" ? `${bill.discountValue}%` : `₹${bill.discountValue.toFixed(2)}`}): -₹{bill.discountAmount.toFixed(2)}
              </p>
              <p>Taxable: ₹{bill.taxable.toFixed(2)}</p>
              {(bill.taxLines || []).map((t, idx) => (
                <p key={idx}>{t.name} ({t.percentage}%): ₹{t.amount.toFixed(2)}</p>
              ))}
              <p><strong>Grand Total: ₹{bill.grandTotal.toFixed(2)}</strong></p>
            </>
          )}
          <button className="btn" onClick={generateBill}>Generate Digital Bill</button>
        </div>
      )}
      {showFeedback && (
  <div style={{
    position: "fixed", top: 0, left: 0,
    width: "100%", height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 1000
  }}>
    <div style={{ background: "#fff", padding: 20, borderRadius: 8, width: 320 }}>
      <h3>Rate Your Experience</h3>
      <div style={{ marginBottom: 10 }}>
        <label>Rating: </label>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          <option value={0}>Select</option>
          <option value={1}>⭐</option>
          <option value={2}>⭐⭐</option>
          <option value={3}>⭐⭐⭐</option>
          <option value={4}>⭐⭐⭐⭐</option>
          <option value={5}>⭐⭐⭐⭐⭐</option>
        </select>
      </div>
      <textarea
        className="input"
        placeholder="Write your feedback (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        style={{ width: "100%", minHeight: 80, marginBottom: 10 }}
      />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button className="btn" onClick={handleSubmitFeedback}>Submit</button>
        <button className="btn secondary" onClick={handleSkipFeedback}>Not Now</button>
      </div>
    </div>
  </div>
)}


      {/* Allow cancel only when still early */}
      {order.status === "Pending" && (
        <button className="btn danger" onClick={cancelOrder}>
          Cancel Order
        </button>
      )}

      <h3>Batches</h3>
      {(order.batches || []).map((batch) => (
        <div key={batch.batchId} style={{ marginBottom: 12, border: "1px solid #ddd", padding: 8 }}>
          <p><strong>Batch:</strong> {batch.batchId}</p>
          <p><strong>Status:</strong> {batch.status}</p>
          <ul>
            {(batch.items || []).map((i, idx) => (
              <li key={idx}>
                {i.name} × {i.qty} — ₹{(toNumber(i.price) * toNumber(i.qty)).toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Hide adding items after payment done */}
      {order.status !== "PaymentDone" && (
        <>
          <h3>Add More Items</h3>
<div className="card">
  {Object.keys(groupedMenu).map((category) => (
    <div key={category} style={{ marginTop: 16 }}>
      <h4
        style={{
          cursor: "pointer",
          padding: "8px",
          background: "#f4f4f4",
          borderRadius: 4,
        }}
        onClick={() => toggleSection(category)}
      >
        {formatCategory(category)} {openSections[category] ? "▲" : "▼"}
      </h4>

      {openSections[category] && (
        <div style={{ marginTop: 8 }}>
          {groupedMenu[category].map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid #ddd",
                opacity: item.inStock ? 1 : 0.5,
              }}
            >
              <span>{formatCategory(item.name)}</span>
              <span>₹{item.price}</span>
              {item.inStock ? (
                <button className="btn" onClick={() => addToCart(item)}>
                  Add
                </button>
              ) : (
                <span style={{ color: "red", fontSize: 12 }}>Out of Stock</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  ))}
</div>


          <h3>Your New Cart</h3>
          {cart.length === 0 ? (
            <p>No new items added.</p>
          ) : (
            <div>
              {cart.map((c) => (
                <div key={c.id} style={{ marginBottom: 8 }}>
                  <strong>{c.name}</strong> — ₹{toNumber(c.price).toFixed(2)} × {c.qty}
                  <button className="btn secondary" onClick={() => decQty(c.id)}>-</button>
                  <button className="btn secondary" onClick={() => addToCart(c)}>+</button>
                </div>
              ))}
              <p><strong>Total for new items: ₹{newCartTotal.toFixed(2)}</strong></p>
              <button className="btn" onClick={addItemsToOrder}>Add to Order</button>
              <button className="btn secondary" onClick={clearCart} style={{ marginLeft: 8 }}>Clear</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
