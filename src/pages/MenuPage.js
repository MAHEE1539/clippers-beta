// src/pages/MenuPage.js
import { addDoc, collection, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";

export default function MenuPage() {
  const [customer, setCustomer] = useState("");
  const [table, setTable] = useState("");
  const [cart, setCart] = useState([]);
  const [openSections, setOpenSections] = useState({});
  const [menu, setMenu] = useState([]);

  // Fetch menu from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "menuItems"), (snap) => {
      setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const formatCategory = (cat) =>
    cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();

  // Group menu by category
  const groupedMenu = useMemo(() => {
    const groups = {};
    menu.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => a.price - b.price);
    });
    return groups;
  }, [menu]);

  const toggleSection = (name) => {
    setOpenSections(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const addToCart = (item) => {
    setCart(prev => {
      const found = prev.find(p => p.id === item.id);
      if (found) {
        return prev.map(p => p.id === item.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const decQty = (id) => {
    setCart(prev =>
      prev.map(p => p.id === id ? { ...p, qty: p.qty - 1 } : p).filter(p => p.qty > 0)
    );
  };

  const removeItem = (id) => setCart(prev => prev.filter(p => p.id !== id));
  const clearCart = () => setCart([]);

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);

  const placeOrder = async () => {
    if (!customer.trim()) return alert("Please enter your name.");
    if (cart.length === 0) return alert("Cart is empty.");

    const order = {
      customer: customer.trim(),
      table: table.trim() || "",
      items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      total,
      status: "Pending",
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, "orders"), order);
      alert(`✅ Order placed! Order ID: ${docRef.id}`);
      setCustomer("");
      setTable("");
      clearCart();
    } catch (err) {
      console.error("Failed to place order:", err);
      alert("Failed to place order. Check console for details.");
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Place Order</h2>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <input
            className="input"
            placeholder="Your name"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
          <input
            className="input"
            placeholder="Table no. or phone (optional)"
            value={table}
            onChange={(e) => setTable(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <h3>Menu</h3>
        {Object.keys(groupedMenu).map(category => (
          <div key={category} style={{ marginTop: 16 }}>
            <h4
              style={{
                cursor: "pointer",
                padding: "8px",
                background: "#f4f4f4",
                borderRadius: 4
              }}
              onClick={() => toggleSection(category)}
            >
              {formatCategory(category)} {openSections[category] ? "▲" : "▼"}
            </h4>

            {openSections[category] && (
              <div style={{ marginTop: 8 }}>
                {groupedMenu[category].map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px solid #ddd",
                      opacity: item.inStock ? 1 : 0.5
                    }}
                  >
                    <span>{formatCategory(item.name)}</span>
                    <span>₹{item.price}</span>
                    {item.inStock ? (
                      <button className="btn" onClick={() => addToCart(item)}>Add</button>
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

      <div className="card">
        <h3>Your Cart</h3>
        {cart.length === 0 ? <p className="small">Cart is empty</p> : (
          <>
            <div className="cart">
              {cart.map(c => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8
                  }}
                >
                  <div>
                    <strong>{c.name}</strong>
                    <div className="small">₹{c.price} × {c.qty}</div>
                  </div>
                  <div className="row">
                    <button className="btn secondary" onClick={() => decQty(c.id)}>-</button>
                    <button
                      className="btn secondary"
                      onClick={() => addToCart({ id: c.id, name: c.name, price: c.price })}
                    >
                      +
                    </button>
                    <button className="btn secondary" onClick={() => removeItem(c.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12
              }}
            >
              <div><strong>Total: ₹{total}</strong></div>
              <div>
                <button className="btn" onClick={placeOrder}>Place Order</button>
                <button className="btn secondary" style={{ marginLeft: 8 }} onClick={clearCart}>Clear</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
