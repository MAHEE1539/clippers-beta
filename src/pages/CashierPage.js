// src/pages/CashierPage.js
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "firebase/auth";
import {
  collection,
  doc, onSnapshot, orderBy, query, updateDoc
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";

export default function CashierPage(){
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Orders
  const [orders, setOrders] = useState([]);
  const [showDone, setShowDone] = useState(false);

  // Menu
  const [menu, setMenu] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", price: "", category: "", inStock: true });

  // Auth
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // Orders snapshot
  useEffect(() => {
    if(!user) { setOrders([]); return; }
    const q = query(collection(db, "orders"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // Menu snapshot
  useEffect(() => {
    if(!user) { setMenu([]); return; }
    const unsub = onSnapshot(collection(db, "menuItems"), (snap) => {
      setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // Order helpers
  const pending = useMemo(()=> orders.filter(o=> o.status === "Pending"), [orders]);
  const preparing = useMemo(()=> orders.filter(o=> o.status === "Preparing"), [orders]);
  const ready = useMemo(()=> orders.filter(o=> o.status === "Ready"), [orders]);
  const done = useMemo(()=> orders.filter(o=> o.status === "Done"), [orders]);

  const navigate = useNavigate();

  const setStatus = async (id, status) => {
    await updateDoc(doc(db, "orders", id), { status });
  };

  const todayDone = useMemo(() => {
    const todayStr = new Date().toLocaleDateString();
    return done.filter(o => {
      if (!o.createdAt?.seconds) return false;
      const orderDate = new Date(o.createdAt.seconds * 1000).toLocaleDateString();
      return orderDate === todayStr;
    });
  }, [done]);


  const groupedDone = useMemo(() => {
    const groups = {};
    done.forEach(o => {
      const dateStr = new Date(o.createdAt?.seconds * 1000).toLocaleDateString();
      if(!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(o);
    });
    return groups;
  }, [done]);

  // // Menu CRUD
  // const addMenuItem = async (e) => {
  //   e.preventDefault();
  //   if(!newItem.name || !newItem.price) return alert("Name & Price required");
  //   await addDoc(collection(db, "menuItems"), {
  //     name: newItem.name,
  //     price: parseFloat(newItem.price),
  //     category: newItem.category || "General",
  //     inStock: newItem.inStock,
  //   });
  //   setNewItem({ name: "", price: "", category: "", inStock: true });
  // };

  // const updateMenuItem = async (id, updates) => {
  //   await updateDoc(doc(db, "menuItems", id), updates);
  // };

  // const deleteMenuItem = async (id) => {
  //   if(window.confirm("Delete this item?")){
  //     await deleteDoc(doc(db, "menuItems", id));
  //   }
  // };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    await signInWithEmailAndPassword(auth, email, password);
    setEmail(""); setPassword("");
  };

  if(!user){
    return (
      <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h3>Cashier Login</h3>
        <form onSubmit={handleLogin} style={{ display: "grid", gap: 8 }}>
          <input className="input" placeholder="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
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
        <button className="btn" onClick={() => navigate("/menu-management")}>
          Menu Management
        </button>
        <div>
          <span style={{ marginRight: 8 }}>Signed in: {user.email}</span>
          <button className="btn secondary" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>

      {/* ---- MENU MANAGEMENT ----
      <div className="section" style={{ marginBottom: 20 }}>
        <h3>Menu Management</h3>
        <form onSubmit={addMenuItem} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input 
            placeholder="Name" 
            value={newItem.name} 
            onChange={(e)=>setNewItem({...newItem, name: e.target.value})} 
          />
          <input 
            type="number" 
            placeholder="Price" 
            value={newItem.price} 
            onChange={(e)=>setNewItem({...newItem, price: e.target.value})} 
          />
          <input 
            placeholder="Category" 
            value={newItem.category} 
            onChange={(e)=>setNewItem({...newItem, category: e.target.value})} 
          />
          <button className="btn" type="submit">Add</button>
        </form>

        {menu.map(item => (
          <div key={item.id} className="order-card" style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>{item.name}</strong> · ₹{item.price} · {item.category}
              <div className="small">Status: {item.inStock ? "In Stock" : "Out of Stock"}</div>
            </div>
            <div>
              <button className="btn secondary" onClick={() => 
                updateMenuItem(item.id, { inStock: !item.inStock })
              }>
                {item.inStock ? "Mark Out of Stock" : "Mark In Stock"}
              </button>
              <button 
                className="btn secondary" 
                style={{ marginLeft: 8 }} 
                onClick={() => {
                  const newPrice = prompt("Enter new price:", item.price);
                  if(newPrice) updateMenuItem(item.id, { price: parseFloat(newPrice) });
                }}
              >Edit Price</button>
              <button 
                className="btn danger" 
                style={{ marginLeft: 8 }} 
                onClick={() => deleteMenuItem(item.id)}
              >Delete</button>
            </div>
          </div>
        ))}
      </div> */}

      {/* ---- ORDERS MANAGEMENT ---- */}
      {/* Pending, Preparing, Ready, Done sections (same as before)... */}
      {/* Keep your existing order code unchanged below this */}



      {/* Pending Section */}
      <div className="section">
        <h4 style={{
                padding: "8px",
                background: "#c6c2c2ff",
                borderRadius: 4
              }}>Pending ({pending.length})
        </h4>
        {pending.map(o => (
          <div key={o.id} className="order-card">
            <div className="order-left">
              <div><strong>{o.customer}</strong> {o.table ? `· Table ${o.table}` : ""}</div>
              <div className="small">{o.items?.map(i => `${i.name}×${i.qty}`).join(" , ")}</div>
              <div className="small">Total: ₹{o.total}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={"status-badge status-Pending"}>Pending</div>
              <div style={{ marginTop: 8 }}>
                <button className="btn" onClick={() => setStatus(o.id, "Preparing")}>Start Preparing</button>
                <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => setStatus(o.id, "Ready")}>Mark Ready</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preparing Section */}
      <div className="section">
        <h4 style={{
                padding: "8px",
                background: "#c6c2c2ff",
                borderRadius: 4
              }}>Preparing ({preparing.length})</h4>
        {preparing.map(o => (
          <div key={o.id} className="order-card">
            <div className="order-left">
              <div><strong>{o.customer}</strong></div>
              <div className="small">{o.items?.map(i => `${i.name}×${i.qty}`).join(" , ")}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={"status-badge status-Preparing"}>Preparing</div>
              <div style={{ marginTop: 8 }}>
                <button className="btn" onClick={() => setStatus(o.id, "Ready")}>Mark Ready</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ready Section */}
      <div className="section">
        <h4 style={{
                padding: "8px",
                background: "#c6c2c2ff",
                borderRadius: 4
              }}>Ready ({ready.length})</h4>
        {ready.map(o => (
          <div key={o.id} className="order-card">
            <div className="order-left">
              <div><strong>{o.customer}</strong></div>
              <div className="small">{o.items?.map(i => `${i.name}×${i.qty}`).join(" , ")}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className={"status-badge status-Ready"}>Ready</div>
              <div style={{ marginTop: 8 }}>
                <button className="btn" onClick={() => setStatus(o.id, "Done")}>Mark Done</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Done Section with grouping */}
      <div className="section">
        <h4
          style={{
                cursor: "pointer",
                padding: "8px",
                background: "#c6c2c2ff",
                borderRadius: 4
              }}
          onClick={() => setShowDone(!showDone)}
        >
          Done ({todayDone.length}) {showDone ? "▲" : "▼"}
        </h4>
        {showDone && Object.entries(groupedDone).map(([date, list]) => {
          const isToday = date === new Date().toLocaleDateString();
          const totalAmt = list.reduce((sum, o) => sum + (o.total || 0), 0);

          return (
            <div key={date} style={{ marginBottom: 12, paddingLeft: 12 }}>
              <h5>{date} — {list.length} orders · ₹{totalAmt}</h5>
              {isToday && list.map(o => (
                <div key={o.id} className="order-card">
                  <div className="order-left">
                    <div><strong>{o.customer}</strong></div>
                    <div className="small">{o.items?.map(i => `${i.name}×${i.qty}`).join(" , ")}</div>
                    <div className="small">Total: ₹{o.total}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className={"status-badge status-Done"}>Done</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
