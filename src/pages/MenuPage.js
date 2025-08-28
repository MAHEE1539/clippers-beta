// src/pages/MenuPage.js
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useMemo, useState } from "react";
import { db } from "../firebase";

// Menu structured into categories and sub-items
const MENU_SECTIONS = [
  {
    name: "Tea",
    items: [
      { id: "bb-special-Tea", name: "BB Special Tea", price: 30 },
      { id: "allam-tea", name: "Allam Tea", price: 35 },
      { id: "green-tea", name: "Green Tea", price: 30 },
      { id: "lemon-tea", name: "Lemon Tea", price: 25 },
      { id: "black-tea", name: "Black Tea", price: 30 },
      { id: "ice-tea", name: "Ice Tea", price: 40 },
      { id: "badam-tea", name: "Badam Tea", price: 30 },
      { id: "Normal-tea", name: "Normal Tea", price: 15 },
    ]
  },
  {
    name: "Coffee",
    items: [
      { id: "coffee", name: "Coffee", price: 25 },
      { id: "cappuccino", name: "Cappuccino", price: 50 },
      { id: "cold-coffee", name: "Cold Coffee", price: 70 },
      { id: "black-coffee", name: "Black Coffee", price: 30 },
    ]
  },
  {
    name: "Snacks",
    items: [
      { id: "veg-puff", name: "Veg Puff", price: 25 },
      { id: "egg-puff", name: "Egg Puff", price: 30 },
      { id: "panner-puff", name: "Panner Puff", price: 50 },
      { id: "chicken-tea", name: "Chicken Puff", price: 50 },
      { id: "biscuits", name: "Biscuits", price: 5 },
      { id: "cream-bun", name: "Cream Bun", price: 20 },
      { id: "dil-pasand", name: "Dil Pasand", price: 20 },
      { id: "hot-dog", name: "Hot Dog", price: 50 },
      { id: "french-fries", name: "French Fries", price: 70 },
      { id: "veg-nuggets", name: "Veg Nuggets", price: 70 },
      { id: "non-veg-nuggets", name: "Non Veg Nuggets", price: 80 },
      { id: "burger", name: "Burger", price: 70 },
      { id: "sandwich", name: "Sandwich", price: 70 },
      { id: "maggie", name: "Double Maggie", price: 60 },
      { id: "pasta", name: "Pasta", price: 70 },
    ]
  },
  {
    name: "Mojito",
    items: [
      { id: "blue-berry", name: "Blue Berry", price: 60 },
      { id: "raspberry", name: "Raspberry", price: 60 },
      { id: "watermelon", name: "Watermelon", price: 60 },
      { id: "pineapple", name: "Pineapple", price: 60 },
      { id: "strawberry", name: "Strawberry", price: 60 },
      { id: "mint", name: "Mint", price: 60 },
    ]
  },
  {
    name: "Juices",
    items: [
      { id: "grape", name: "Grape", price: 50 },
      { id: "Banana", name: "Banana", price: 50 },
      { id: "watermelon", name: "Watermelon", price: 50 },
      { id: "pineapple", name: "Pineapple", price: 50 },
      { id: "sapota", name: "Sapota", price: 50 },
      { id: "karbuja", name: "Karbuja", price: 50 },
      { id: "badam-milk", name: "Badam Milk", price: 70 },
    ]
  },
  {
    name: "Milkshakes",
    items: [
      { id: "Chocolate", name: "Chocolate", price: 80 },
      { id: "Vanilla", name: "Vanilla", price: 80 },
      { id: "oreo", name: "Oreo", price: 80 },
      { id: "butterscotch", name: "Butterscotch", price: 80 },
      { id: "dry-fruit", name: "Dry Fruit", price: 100 },
      { id: "mixed-fruit-punch", name: "Mixed Fruit Punch", price: 70 },
    ]
  }

];

export default function MenuPage() {
  const [customer, setCustomer] = useState("");
  const [table, setTable] = useState("");
  const [cart, setCart] = useState([]);
  const [openSections, setOpenSections] = useState({}); // track dropdowns

  const toggleSection = (name) => {
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));
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
        {MENU_SECTIONS.map(section => (
          <div key={section.name} style={{ marginTop: 16 }}>
            <h4
              style={{
                cursor: "pointer",
                padding: "8px",
                background: "#f4f4f4",
                borderRadius: 4
              }}
              onClick={() => toggleSection(section.name)}
            >
              {section.name} {openSections[section.name] ? "▲" : "▼"}
            </h4>

            {openSections[section.name] && (
              <div style={{ marginTop: 8 }}>
                {section.items.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px solid #ddd"
                    }}
                  >
                    <span>{item.name}</span>
                    <span>₹{item.price}</span>
                    <button className="btn" onClick={() => addToCart(item)}>Add</button>
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
