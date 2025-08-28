// src/pages/CashierPage.js
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";

export default function CashierPage(){
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if(!user) { setOrders([]); return; }
    const q = query(collection(db, "orders"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Orders snapshot error:", err);
      alert("Failed to load orders. Check console & security rules.");
    });
    return () => unsub();
  }, [user]);

  const pending = useMemo(()=> orders.filter(o=> o.status === "Pending"), [orders]);
  const preparing = useMemo(()=> orders.filter(o=> o.status === "Preparing"), [orders]);
  const ready = useMemo(()=> orders.filter(o=> o.status === "Ready"), [orders]);
  const done = useMemo(()=> orders.filter(o=> o.status === "Done"), [orders]);

  const setStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "orders", id), { status });
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Check console and rules.");
    }
  };

  // Group Done orders by date
  const groupedDone = useMemo(() => {
    const groups = {};
    done.forEach(o => {
      const dateStr = new Date(o.createdAt?.seconds * 1000).toLocaleDateString();
      if(!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(o);
    });
    return groups;
  }, [done]);

  // Cleanup: delete old Done orders from Firestore, keep only today's
  useEffect(() => {
    if(done.length === 0) return;
    const todayStr = new Date().toLocaleDateString();
    done.forEach(async (o) => {
      const orderDate = new Date(o.createdAt?.seconds * 1000).toLocaleDateString();
      if(orderDate !== todayStr){
        try {
          await deleteDoc(doc(db, "orders", o.id));
          console.log("Deleted old order", o.id);
        } catch(err) {
          console.error("Failed to delete old order:", err);
        }
      }
    });
  }, [done]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail(""); setPassword("");
    } catch (err) {
      console.error("Login failed", err);
      alert("Login failed: " + err.message);
    }
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2>Orders Dashboard</h2>
        <div>
          <span style={{ marginRight: 8 }}>Signed in: {user.email}</span>
          <button className="btn secondary" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>

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
          Done ({done.length}) {showDone ? "▲" : "▼"}
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
