// src/pages/MenuManagementPage.js
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";

export default function MenuManagementPage() {
  const [menu, setMenu] = useState([]);
  const [openSections, setOpenSections] = useState({});
  const [newItem, setNewItem] = useState({ name: "", price: "", category: "", inStock: true });
  const [search, setSearch] = useState("");
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  // Fetch menu items live
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "menuItems"), (snap) => {
      setMenu(snap.docs.map(d => ({ id: d.id, ...d.data(), category: d.data().category.toLowerCase() })));
    });
    return () => unsub();
  }, []);

  // Capitalize category for display
  const formatCategory = (cat) =>
    cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();

  // Search filter
  const filteredMenu = useMemo(() => {
    const term = search.toLowerCase();
    return menu.filter(
      item =>
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
    );
  }, [menu, search]);

  // Group menu by category (case-insensitive)
  const groupedMenu = useMemo(() => {
    const groups = {};
    menu.forEach(item => {
      const cat = item.category.toLowerCase();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [menu]);

  const toggleSection = (name) => {
    setOpenSections(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // CRUD
  const addItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category) return alert("Fill all fields!");
    const normalizedCategory = newItem.category.toLowerCase(); // always store lowercase
    await addDoc(collection(db, "menuItems"), {
      ...newItem,
      category: normalizedCategory,
      price: Number(newItem.price),
      inStock: true
    });
    setNewItem({ name: "", price: "", category: "", inStock: true });
  };

  const updatePrice = async (id, price) => {
    await updateDoc(doc(db, "menuItems", id), { price: Number(price) });
  };

  const toggleStock = async (id, current) => {
    await updateDoc(doc(db, "menuItems", id), { inStock: !current });
  };

  const deleteItem = async (id) => {
    if (window.confirm("Delete this item?")) {
      await deleteDoc(doc(db, "menuItems", id));
    }
  };

  return (
    <div className="container">
      <h2>Menu Management</h2>

      {/* Add new item */}
      <div className="card">
        <h3>Add New Item</h3>
        <input
          className="input"
          placeholder="Category"
          value={newItem.category}
          onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
        />
        <input
          className="input"
          placeholder="Item Name"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
        />
        <input
          type="number"
          className="input"
          placeholder="Price"
          value={newItem.price}
          onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
        />
        <button className="btn" onClick={addItem}>Add Item</button>
      </div>

      <div className="card">

        <h3>Search Item</h3>
        {/* Search + Out of stock toggle */}
      <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
        <input
          type="text"
          className="input"
          placeholder="Search menu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={`btn ${showOutOfStock ? "secondary" : ""}`}
          onClick={() => setShowOutOfStock(!showOutOfStock)}
        >
          {showOutOfStock ? "Show All Items" : "Out of Stock Items"}
        </button>
      </div>
      </div>

      {/* Out of stock view */}
      {showOutOfStock ? (
        menu.filter(item => !item.inStock).length === 0 ? (
          <p className="small">✅ All items are in stock.</p>
        ) : (
          menu.filter(item => !item.inStock).map(item => (
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
              <span>{formatCategory(item.name)} ({formatCategory(item.category)})</span>
              <span style={{ color: "red" }}>Out of stock</span>
              <button className="btn secondary" onClick={() => toggleStock(item.id, item.inStock)}>
                Mark In stock
              </button>
              <button className="btn secondary" onClick={() => deleteItem(item.id)}>Delete</button>
            </div>
          ))
        )
      ) : search.trim() ? (
        /* Search results flat list */
        filteredMenu.length === 0 ? (
          <p className="small">No items found.</p>
        ) : (
          filteredMenu.map(item => (
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
              <span>{formatCategory(item.name)} ({formatCategory(item.category)}) - {item.inStock ? "In stock" : "Out of stock"}</span>
              <input
                type="number"
                defaultValue={item.price}
                style={{ width: 60, marginRight: 8 }}
                onBlur={(e) => updatePrice(item.id, e.target.value)}
              />
              <button className="btn secondary" onClick={() => toggleStock(item.id, item.inStock)}>
                {item.inStock ? "Mark Out of stock" : "Mark In stock"}
              </button>
              <button className="btn secondary" onClick={() => deleteItem(item.id)}>Delete</button>
            </div>
          ))
        )
      ) : (
        /* Grouped by category */
        Object.keys(groupedMenu).map(category => (
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
                      borderBottom: "1px solid #ddd"
                    }}
                  >
                    <span>{formatCategory(item.name)} ({item.inStock ? "In stock" : "Out of stock"})</span>
                    <input
                      type="number"
                      defaultValue={item.price}
                      style={{ width: 60, marginRight: 8 }}
                      onBlur={(e) => updatePrice(item.id, e.target.value)}
                    />
                    <button className="btn secondary" onClick={() => toggleStock(item.id, item.inStock)}>
                      {item.inStock ? "Mark Out of stock" : "Mark In stock"}
                    </button>
                    <button className="btn secondary" onClick={() => deleteItem(item.id)}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
