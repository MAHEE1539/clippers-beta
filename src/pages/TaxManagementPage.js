// src/pages/TaxManagementPage.js
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";

export default function TaxManagementPage() {
  const [taxes, setTaxes] = useState([]);
  const [newTax, setNewTax] = useState({ name: "", percentage: "" });
  const navigate = useNavigate();

  // Snapshot for taxes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "taxes"), (snap) => {
      setTaxes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Add new tax
  const addTax = async (e) => {
    e.preventDefault();
    if (!newTax.name || !newTax.percentage) return alert("Enter tax name and %");
    await addDoc(collection(db, "taxes"), {
      name: newTax.name,
      percentage: parseFloat(newTax.percentage),
    });
    setNewTax({ name: "", percentage: "" });
  };

  // Update tax
  const updateTax = async (id, updates) => {
    await updateDoc(doc(db, "taxes", id), updates);
  };

  // Delete tax
  const deleteTax = async (id) => {
    if (window.confirm("Delete this tax?")) {
      await deleteDoc(doc(db, "taxes", id));
    }
  };

  return (
    <div className="card" style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2>Tax Management</h2>

      <form onSubmit={addTax} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Tax Name (e.g. GST)"
          value={newTax.name}
          onChange={(e) => setNewTax({ ...newTax, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="%"
          value={newTax.percentage}
          onChange={(e) => setNewTax({ ...newTax, percentage: e.target.value })}
        />
        <button className="btn" type="submit">Add</button>
      </form>

      {taxes.map((tax) => (
        <div key={tax.id} className="order-card" style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <strong>{tax.name}</strong> · {tax.percentage}%
          </div>
          <div>
            <button
              className="btn secondary"
              onClick={() => {
                const newPercent = prompt("Enter new %:", tax.percentage);
                if (newPercent) updateTax(tax.id, { percentage: parseFloat(newPercent) });
              }}
            >
              Edit
            </button>
            <button
              className="btn danger"
              style={{ marginLeft: 8 }}
              onClick={() => deleteTax(tax.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20 }}>
        <button className="btn secondary" onClick={() => navigate(-1)}>⬅ Back</button>
      </div>
    </div>
  );
}
